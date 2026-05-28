import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { QueueNames } from '@ruit/shared-types/src/queues';
import { redis, addJob, QUEUES } from '@ruit/shared-queue';
import { Queue } from 'bullmq';

interface RouteContractAutoPostJob {
  contractId: string;
}

type RouteContractFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

function calculateNextPostDate(frequency: RouteContractFrequency, fromDate: Date): Date {
  const nextDate = new Date(fromDate);
  switch (frequency) {
    case 'DAILY':
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setUTCDate(nextDate.getUTCDate() + 7);
      break;
    case 'BIWEEKLY':
      nextDate.setUTCDate(nextDate.getUTCDate() + 14);
      break;
    case 'MONTHLY':
      nextDate.setUTCDate(nextDate.getUTCDate() + 30);
      break;
    default:
      nextDate.setUTCDate(nextDate.getUTCDate() + 7);
  }
  return nextDate;
}

async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
  corridorId?: string;
}) {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { activatedAt: 'desc' },
  });

  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategy?.id ?? 'str_default',
      corridorId: params.corridorId ?? null,
      payload: params.payload as any,
      metadata: { source: 'ROUTE_CONTRACT_WORKER', timestamp: new Date().toISOString() } as any,
    },
  });
}

async function createDirectBookingForPreferredFleet(
  loadId: string,
  ordererId: string,
  preferredFleetId: string,
  contractId: string
): Promise<void> {
  const now = new Date();
  const config = await getConfig();

  const fleet = await prisma.fleetOwner.findUnique({
    where: { id: preferredFleetId },
    include: { user: true },
  });

  if (!fleet) {
    console.log(`Preferred fleet ${preferredFleetId} not found, skipping direct booking`);
    return;
  }

  // Get the first available driver/truck for the preferred fleet
  const driver = await prisma.driver.findFirst({
    where: { fleetOwnerId: preferredFleetId, availabilityStatus: 'AVAILABLE' },
    orderBy: { trustScore: 'desc' },
  });

  if (!driver) {
    console.log(`No available driver found for fleet ${preferredFleetId}, falling back to WDM`);
    return;
  }

  const truck = await prisma.truck.findFirst({
    where: { fleetOwnerId: preferredFleetId, currentDriverId: driver.id },
  });

  const expiresAt = new Date(now.getTime() + config.directBookingAcceptanceWindowMin * 60 * 1000);

  await prisma.directBooking.create({
    data: {
      id: generateId('dbl'),
      loadId,
      ordererId,
      requestedDriverId: driver.id,
      requestedTruckId: truck?.id ?? null,
      offeredAt: now,
      expiresAt,
      status: 'PENDING',
    },
  });

  // Enqueue expiry job
  const directBookingExpiryQueue = new Queue(QueueNames.DIRECT_BOOKING_EXPIRY, { connection: redis as any });
  await directBookingExpiryQueue.add(
    'direct-booking-expiry',
    { loadId, contractId, preferredFleetId },
    { delay: config.directBookingAcceptanceWindowMin * 60 * 1000 }
  );

  await emitEvent({
    eventType: 'DIRECT_BOOKING_CREATED_FROM_CONTRACT',
    aggregateId: loadId,
    aggregateType: 'LOAD',
    actorId: 'SYSTEM',
    actorRole: 'ROUTE_CONTRACT_WORKER',
    payload: {
      contractId,
      loadId,
      preferredFleetId,
      driverId: driver.id,
      expiresAt: expiresAt.toISOString(),
    },
  });

  console.log(`Created direct booking for preferred fleet ${preferredFleetId}, load ${loadId}`);
}

async function scheduleNextAutoPost(
  contractId: string,
  frequency: RouteContractFrequency,
  nextPostDate: Date
): Promise<string | null> {
  const now = new Date();
  const delayMs = nextPostDate.getTime() - now.getTime();

  if (delayMs <= 0) {
    console.log(`Next post date ${nextPostDate.toISOString()} is in the past, scheduling for immediate processing`);
    return null;
  }

  const queue = new Queue(QueueNames.ROUTE_CONTRACT_AUTO_POST, { connection: redis as any });
  const job = await queue.add(
    'route-contract-auto-post',
    { contractId },
    { delay: Math.max(delayMs, 1000) } // At least 1 second delay
  );

  console.log(`Scheduled next auto-post for contract ${contractId} at ${nextPostDate.toISOString()}, job ID: ${job.id}`);
  return job.id as string;
}

export async function processRouteContractAutoPost(contractId: string): Promise<{
  success: boolean;
  loadId?: string;
  error?: { code: string; message: string };
}> {
  const contract = await prisma.routeContract.findUnique({
    where: { id: contractId },
  });

  if (!contract) {
    return { success: false, error: { code: 'CONTRACT_NOT_FOUND', message: `Route contract ${contractId} not found` } };
  }

  if (contract.status !== 'ACTIVE') {
    return { success: false, error: { code: 'CONTRACT_NOT_ACTIVE', message: `Contract ${contractId} is ${contract.status}, not ACTIVE` } };
  }

  const now = new Date();
  if (contract.endDate < now) {
    // Contract expired, mark as completed
    await prisma.routeContract.update({
      where: { id: contractId },
      data: { status: 'COMPLETED', pendingJobId: null },
    });
    return { success: false, error: { code: 'CONTRACT_EXPIRED', message: `Contract ${contractId} has expired` } };
  }

  // Find corridor details
  const corridor = await prisma.corridor.findUnique({
    where: { id: contract.corridorId },
  });

  if (!corridor) {
    return { success: false, error: { code: 'CORRIDOR_NOT_FOUND', message: `Corridor ${contract.corridorId} not found` } };
  }

  const pickupDate = new Date();
  pickupDate.setUTCDate(pickupDate.getUTCDate() + 1); // Tomorrow

  const deliveryDeadline = new Date(pickupDate);
  deliveryDeadline.setUTCDate(deliveryDeadline.getUTCDate() + 3); // 3 days after pickup

  // Create the load
  const load = await prisma.load.create({
    data: {
      id: generateId('lod'),
      ordererId: contract.ordererId,
      corridorId: contract.corridorId,
      originCity: corridor.originCity,
      destinationCity: corridor.destinationCity,
      cargoType: contract.cargoType,
      weightKg: contract.weightKg,
      pickupDate,
      deliveryDeadline,
      finalRateEtb: contract.agreedRateCents / 100, // Convert cents to ETB
      status: 'PENDING',
      source: 'ROUTE_CONTRACT',
      strategyVersionId: await prisma.strategyVersion
        .findFirst({ where: { isActive: true }, select: { id: true }, orderBy: { activatedAt: 'desc' } })
        .then((s: any) => s?.id ?? 'str_default'),
    },
  });

  // Price locked by route contract — do not recalculate
  console.log(`Created load ${load.id} from route contract ${contractId}, price locked at ${contract.agreedRateCents} cents`);

  // Calculate next post date
  const nextPostDate = calculateNextPostDate(
    contract.frequency as RouteContractFrequency,
    contract.nextPostDate ?? now
  );

  // Schedule next auto-post if before end date
  let pendingJobId: string | null = null;
  if (nextPostDate < contract.endDate) {
    pendingJobId = await scheduleNextAutoPost(contractId, contract.frequency as RouteContractFrequency, nextPostDate);
  }

  // Update contract
  await prisma.routeContract.update({
    where: { id: contractId },
    data: {
      tripCount: { increment: 1 },
      nextPostDate,
      pendingJobId,
    },
  });

  // If preferred fleet is set, offer to them first
  if (contract.preferredFleetId) {
    // Offer preferred lead time before nextPostDate (normally 48 hours before)
    const config = await getConfig();
    const preferredOfferTime = new Date(nextPostDate.getTime() - config.routeContractPreferredOfferLeadHours * 60 * 60 * 1000);
    
    if (preferredOfferTime > now) {
      // Schedule the preferred fleet offer
      await createDirectBookingForPreferredFleet(load.id, contract.ordererId, contract.preferredFleetId, contractId);
    }
  } else {
    // No preferred fleet, go straight to WDM
    // Enqueue to WDM via optimizer queue (if exists)
    console.log(`No preferred fleet for contract ${contractId}, load ${load.id} will be picked up by WDM`);
  }

  await emitEvent({
    eventType: 'ROUTE_CONTRACT_LOAD_CREATED',
    aggregateId: contractId,
    aggregateType: 'ROUTE_CONTRACT',
    actorId: 'SYSTEM',
    actorRole: 'ROUTE_CONTRACT_WORKER',
    corridorId: contract.corridorId,
    payload: {
      contractId,
      loadId: load.id,
      nextPostDate: nextPostDate.toISOString(),
      tripCount: contract.tripCount + 1,
    },
  });

  return { success: true, loadId: load.id };
}

export async function checkContractsForRenewalReminders(): Promise<{
  success: boolean;
  remindersSent: number;
  contractsChecked: number;
}> {
  const config = await getConfig();
  const reminderDays = config.routeContractRenewalReminderDays;
  const reminderThreshold = new Date();
  reminderThreshold.setUTCDate(reminderThreshold.getUTCDate() + reminderDays);

  const contracts = await prisma.routeContract.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lte: reminderThreshold, gt: new Date() },
      renewalReminderSent: false,
    },
  });

  let remindersSent = 0;

  for (const contract of contracts) {
    const daysRemaining = Math.ceil((contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Query orderer separately
    const orderer = await prisma.orderer.findUnique({
      where: { id: contract.ordererId },
      select: {
        user: {
          select: { phone: true, fullName: true },
        },
      },
    });

    if (!orderer?.user?.phone) {
      console.log(`Orderer ${contract.ordererId} has no phone number, skipping SMS`);
      continue;
    }

    // Send event
    await emitEvent({
      eventType: 'ROUTE_CONTRACT_RENEWAL_REMINDER',
      aggregateId: contract.id,
      aggregateType: 'ROUTE_CONTRACT',
      actorId: 'SYSTEM',
      actorRole: 'ROUTE_CONTRACT_WORKER',
      payload: {
        contractId: contract.id,
        ordererId: contract.ordererId,
        endDate: contract.endDate.toISOString(),
        daysRemaining,
        reminderDays,
      },
    });

    // Send SMS to orderer
    if (orderer?.user?.phone) {
      const smsMessage = `Your ISUZET Route Contract expires in ${daysRemaining} days. Reply or visit app to renew to ensure continuous service.`;
      await addJob(QUEUES.NOTIFICATIONS, 'send-sms', {
        to: orderer.user.phone,
        message: smsMessage,
      });
    }

    await prisma.routeContract.update({
      where: { id: contract.id },
      data: { renewalReminderSent: true },
    });

    remindersSent++;
    console.log(`Sent renewal reminder for contract ${contract.id}`);
  }

  return { success: true, remindersSent, contractsChecked: contracts.length };
}

export function createRouteContractWorker(): Worker {
  return new Worker<RouteContractAutoPostJob>(
    QueueNames.ROUTE_CONTRACT_AUTO_POST,
    async (job: Job<RouteContractAutoPostJob>) => {
      const { contractId } = job.data;
      console.log(`Processing route contract auto-post for ${contractId}`);

      const result = await processRouteContractAutoPost(contractId);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Unknown error');
      }

      return result;
    },
    { connection: redis, concurrency: 5 }
  );
}

export { redis };
