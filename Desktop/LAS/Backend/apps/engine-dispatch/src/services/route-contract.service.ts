import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { QueueNames } from '@ruit/shared-types/src/queues';
import { redis } from '@ruit/shared-queue';
import { Queue } from 'bullmq';

interface CreateRouteContractData {
  ordererId: string;
  preferredFleetId?: string;
  corridorId: string;
  cargoType: string;
  weightKg: number;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  startDate: Date;
  endDate: Date;
  agreedRateCents: number;
  autoPost: boolean;
}

interface RenewRouteContractData {
  newEndDate: Date;
  newAgreedRateCents?: number;
}

interface RouteContractResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function calculateNextPostDate(frequency: string, fromDate: Date): Date {
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

export async function createRouteContract(data: CreateRouteContractData): Promise<RouteContractResult> {
  const { ordererId, preferredFleetId, corridorId, cargoType, weightKg, frequency, startDate, endDate, agreedRateCents, autoPost } = data;

  // Validation
  if (startDate >= endDate) {
    return { success: false, error: { code: 'INVALID_DATES', message: 'startDate must be before endDate' } };
  }

  if (weightKg <= 0) {
    return { success: false, error: { code: 'INVALID_WEIGHT', message: 'weightKg must be greater than 0' } };
  }

  // Verify orderer exists
  const orderer = await prisma.orderer.findUnique({ where: { id: ordererId } });
  if (!orderer) {
    return { success: false, error: { code: 'ORDERER_NOT_FOUND', message: `Orderer ${ordererId} not found` } };
  }

  // Verify corridor exists
  const corridor = await prisma.corridor.findUnique({ where: { id: corridorId } });
  if (!corridor) {
    return { success: false, error: { code: 'CORRIDOR_NOT_FOUND', message: `Corridor ${corridorId} not found` } };
  }

  // Verify preferred fleet exists if provided
  if (preferredFleetId) {
    const fleet = await prisma.fleetOwner.findUnique({ where: { id: preferredFleetId } });
    if (!fleet) {
      return { success: false, error: { code: 'FLEET_NOT_FOUND', message: `Fleet ${preferredFleetId} not found` } };
    }
  }

  // Calculate first nextPostDate
  const nextPostDate = calculateNextPostDate(frequency, startDate);

  // Create the contract
  const contract = await (prisma as any).routeContract.create({
    data: {
      id: generateId('rct'),
      ordererId,
      preferredFleetId: preferredFleetId ?? null,
      corridorId,
      cargoType,
      weightKg,
      frequency,
      startDate,
      endDate,
      agreedRateCents,
      autoPost,
      nextPostDate,
      status: 'ACTIVE',
      pendingJobId: null,
      tripCount: 0,
      renewalReminderSent: false,
    },
  });

  // If autoPost is true and nextPostDate is in the future, enqueue the first ROUTE_CONTRACT_AUTO_POST job
  if (autoPost && nextPostDate > new Date()) {
    const queue = new Queue(QueueNames.ROUTE_CONTRACT_AUTO_POST, { connection: redis as any });
    const delayMs = nextPostDate.getTime() - Date.now();
    
    const job = await queue.add(
      'route-contract-auto-post',
      { contractId: contract.id },
      { delay: Math.max(delayMs, 1000) }
    );

    // Update contract with pendingJobId
    await (prisma as any).routeContract.update({
      where: { id: contract.id },
      data: { pendingJobId: job.id },
    });

    console.log(`Enqueued first ROUTE_CONTRACT_AUTO_POST job for contract ${contract.id} at ${nextPostDate.toISOString()}`);
  }

  return { success: true, data: contract };
}

export async function renewRouteContract(contractId: string, data: RenewRouteContractData): Promise<RouteContractResult> {
  const { newEndDate, newAgreedRateCents } = data;

  const contract = await (prisma as any).routeContract.findUnique({ where: { id: contractId } });
  if (!contract) {
    return { success: false, error: { code: 'CONTRACT_NOT_FOUND', message: `Route contract ${contractId} not found` } };
  }

  if (newEndDate <= contract.endDate) {
    return { success: false, error: { code: 'INVALID_END_DATE', message: 'newEndDate must be after current endDate' } };
  }

  // Update the contract
  const updateData: any = {
    endDate: newEndDate,
    renewalReminderSent: false,
  };

  if (newAgreedRateCents !== undefined) {
    updateData.agreedRateCents = newAgreedRateCents;
  }

  const updatedContract = await (prisma as any).routeContract.update({
    where: { id: contractId },
    data: updateData,
  });

  return { success: true, data: updatedContract };
}

export async function cancelRouteContract(contractId: string, reason: string): Promise<RouteContractResult> {
  const contract = await (prisma as any).routeContract.findUnique({ where: { id: contractId } });
  if (!contract) {
    return { success: false, error: { code: 'CONTRACT_NOT_FOUND', message: `Route contract ${contractId} not found` } };
  }

  if (contract.status === 'CANCELLED') {
    return { success: false, error: { code: 'ALREADY_CANCELLED', message: 'Contract is already cancelled' } };
  }

  // Cancel any pending BullMQ job
  if (contract.pendingJobId) {
    const queue = new Queue(QueueNames.ROUTE_CONTRACT_AUTO_POST, { connection: redis as any });
    try {
      await queue.removeJobScheduler(contract.pendingJobId);
      console.log(`Cancelled pending job ${contract.pendingJobId} for contract ${contractId}`);
    } catch (err) {
      console.log(`Failed to cancel pending job ${contract.pendingJobId}, may already be processed:`, err);
    }
  }

  // Update contract
  const updatedContract = await (prisma as any).routeContract.update({
    where: { id: contractId },
    data: {
      status: 'CANCELLED',
      pendingJobId: null,
    },
  });

  return { success: true, data: updatedContract };
}

export async function pauseRouteContract(contractId: string): Promise<RouteContractResult> {
  const contract = await (prisma as any).routeContract.findUnique({ where: { id: contractId } });
  if (!contract) {
    return { success: false, error: { code: 'CONTRACT_NOT_FOUND', message: `Route contract ${contractId} not found` } };
  }

  if (contract.status !== 'ACTIVE') {
    return { success: false, error: { code: 'NOT_ACTIVE', message: `Contract is ${contract.status}, cannot pause` } };
  }

  // Cancel any pending BullMQ job
  if (contract.pendingJobId) {
    const queue = new Queue(QueueNames.ROUTE_CONTRACT_AUTO_POST, { connection: redis as any });
    try {
      await queue.removeJobScheduler(contract.pendingJobId);
      console.log(`Cancelled pending job ${contract.pendingJobId} for contract ${contractId}`);
    } catch (err) {
      console.log(`Failed to cancel pending job ${contract.pendingJobId}:`, err);
    }
  }

  // Update contract
  const updatedContract = await (prisma as any).routeContract.update({
    where: { id: contractId },
    data: {
      status: 'PAUSED',
      pausedAt: new Date(),
      pendingJobId: null,
    },
  });

  return { success: true, data: updatedContract };
}

export async function resumeRouteContract(contractId: string): Promise<RouteContractResult> {
  const contract = await (prisma as any).routeContract.findUnique({ where: { id: contractId } });
  if (!contract) {
    return { success: false, error: { code: 'CONTRACT_NOT_FOUND', message: `Route contract ${contractId} not found` } };
  }

  if (contract.status !== 'PAUSED') {
    return { success: false, error: { code: 'NOT_PAUSED', message: `Contract is ${contract.status}, cannot resume` } };
  }

  // Calculate next post date based on current date and frequency
  const nextPostDate = calculateNextPostDate(contract.frequency, new Date());

  // Check if contract has expired
  if (nextPostDate >= contract.endDate) {
    return { success: false, error: { code: 'CONTRACT_EXPIRED', message: 'Contract has expired, cannot resume' } };
  }

  // Re-enqueue the auto-post job
  const queue = new Queue(QueueNames.ROUTE_CONTRACT_AUTO_POST, { connection: redis as any });
  const delayMs = nextPostDate.getTime() - Date.now();
  
  const job = await queue.add(
    'route-contract-auto-post',
    { contractId },
    { delay: Math.max(delayMs, 1000) }
  );

  // Update contract
  const updatedContract = await (prisma as any).routeContract.update({
    where: { id: contractId },
    data: {
      status: 'ACTIVE',
      pausedAt: null,
      nextPostDate,
      pendingJobId: job.id,
    },
  });

  return { success: true, data: updatedContract };
}

export async function listOrdererContracts(ordererId: string): Promise<RouteContractResult> {
  const contracts = await (prisma as any).routeContract.findMany({
    where: { ordererId },
    orderBy: { createdAt: 'desc' },
  });

  return { success: true, data: contracts };
}

export async function getContractById(contractId: string): Promise<RouteContractResult> {
  const contract = await (prisma as any).routeContract.findUnique({
    where: { id: contractId },
    include: {
      orderer: { select: { id: true, companyName: true } },
      corridor: { select: { id: true, originCity: true, destinationCity: true } },
    },
  });

  if (!contract) {
    return { success: false, error: { code: 'CONTRACT_NOT_FOUND', message: `Route contract ${contractId} not found` } };
  }

  return { success: true, data: contract };
}
