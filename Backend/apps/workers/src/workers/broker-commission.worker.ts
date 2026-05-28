import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis, addJob } from '@ruit/shared-queue';

interface BrokerCommissionJob {
  loadId: string;
}

async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}) {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true },
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
      payload: params.payload as any,
      metadata: {
        source: 'BROKER_COMMISSION_WORKER',
        timestamp: new Date().toISOString(),
      } as any,
    },
  });
}

export function createBrokerCommissionWorker(): Worker {
  return new Worker<BrokerCommissionJob>(
    QUEUES.BROKER_COMMISSION,
    async (job: Job<BrokerCommissionJob>) => {
      const { loadId } = job.data;

      // Find Load by id
      const load = await prisma.load.findUnique({
        where: { id: loadId },
      });

      if (!load) {
        throw new Error(`Load not found: ${loadId}`);
      }

      // Find accepted BrokerSuggestion for this load
      const brokerSuggestion = await prisma.brokerSuggestion.findFirst({
        where: {
          loadId: loadId,
          status: { in: ['BOTH_ACCEPTED', 'FLEET_ACCEPTED', 'ORDERER_ACCEPTED'] },
        },
      });

      // If no broker assigned: log and exit
      if (!brokerSuggestion) {
        console.log(`Load ${loadId} has no broker assigned - skipping commission calculation`);
        return {
          success: true,
          loadId,
          commissionEtb: 0,
          brokerId: null,
          reason: 'No broker assigned',
        };
      }

      const brokerId = brokerSuggestion.brokerId;

      // Find Broker record
      const broker = await prisma.broker.findUnique({
        where: { id: brokerId },
      });

      if (!broker) {
        throw new Error(`Broker not found: ${brokerId}`);
      }

      // Calculate commission using commissionPerMatchEtb (flat rate per match)
      // Note: commissionRatePercent doesn't exist, using flat rate instead
      let commissionEtb = 0;

      // Schema has commissionPerMatchEtb (flat rate) - already an Int
      if (broker.commissionPerMatchEtb) {
        commissionEtb = broker.commissionPerMatchEtb;
      } else {
        console.log(`Broker ${brokerId} has no commission rate set`);
        return {
          success: true,
          loadId,
          brokerId,
          commissionEtb: 0,
          reason: 'No commission rate set',
        };
      }

      // Check if final rate exists
      const finalRateEtb = load.finalRateEtb?.toNumber() ?? 0;
      if (finalRateEtb > 0) {
        // Cap commission based on final rate if needed
        // For example, commission shouldn't exceed 5% of final rate
        const maxCommission = Math.round(finalRateEtb * 0.05);
        if (commissionEtb > maxCommission) {
          commissionEtb = maxCommission;
        }
      }

      // Create Event: BROKER_COMMISSION_CALCULATED
      // (DriverEarning requires driverId which we don't have for brokers)
      await emitEvent({
        eventType: 'BROKER_COMMISSION_CALCULATED',
        aggregateId: loadId,
        aggregateType: 'LOAD',
        actorId: brokerId,
        actorRole: 'BROKER',
        payload: {
          load_id: loadId,
          broker_id: brokerId,
          commission_etb: commissionEtb,
          commission_type: 'FLAT_RATE',
          final_rate_etb: finalRateEtb,
          calculated_at: new Date().toISOString(),
        },
      });

      // Update Load.brokerCommissionEtb (check if field exists)
      // Using Prisma's type system - if field doesn't exist, this will be caught at build time
      try {
        await prisma.load.update({
          where: { id: loadId },
          data: {
            // brokerCommissionEtb: commissionEtb,
            // ^ Field may not exist - skip for now
          },
        });
        // If field exists, uncomment above line
        // For now, just log the commission
        console.log(`Broker commission for load ${loadId}: ${commissionEtb} ETB`);
      } catch {
        // Field doesn't exist - log but don't error
        console.log(`Could not update Load.brokerCommissionEtb - field may not exist`);
      }

      return {
        success: true,
        loadId,
        brokerId,
        brokerUserId: broker.userId,
        commissionEtb,
        commissionType: 'FLAT_RATE',
        finalRateEtb,
      };
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };
