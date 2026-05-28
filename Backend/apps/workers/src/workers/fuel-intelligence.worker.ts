import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis, addJob } from '@ruit/shared-queue';

interface FuelIntelJob {
  snapshotId: string;
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
        source: 'FUEL_INTELLIGENCE_WORKER',
        timestamp: new Date().toISOString(),
      } as any,
    },
  });
}

export function createFuelIntelligenceWorker(): Worker {
  return new Worker<FuelIntelJob>(
    QUEUES.FUEL_INTEL,
    async (job: Job<FuelIntelJob>) => {
      const { snapshotId } = job.data;

      // Find FuelPriceSnapshot by id
      const snapshot = await prisma.fuelPriceSnapshot.findUnique({
        where: { id: snapshotId },
      });

      if (!snapshot) {
        throw new Error(`FuelPriceSnapshot not found: ${snapshotId}`);
      }

      const region = snapshot.region;
      const newDieselPrice = snapshot.dieselPriceEtbPerLiter
        ? snapshot.dieselPriceEtbPerLiter.toNumber()
        : 0;

      // Find all Corridors where region matches snapshot.region
      const corridors = await prisma.corridor.findMany({
        where: { region },
      });

      // Check price change > 10% vs previous snapshot for this region
      const previousSnapshot = await prisma.fuelPriceSnapshot.findFirst({
        where: { region },
        orderBy: { recordedAt: 'desc' },
        skip: 1, // Skip the current snapshot
        take: 1,
      });

      const priceChangePercent = previousSnapshot
        ? Math.abs(
            (newDieselPrice - previousSnapshot.dieselPriceEtbPerLiter.toNumber()) /
              previousSnapshot.dieselPriceEtbPerLiter.toNumber()
          ) * 100
        : 0;

      // Note: Skip fuelSurchargeActive update - field doesn't exist on Corridor
      // If price change > 10%, just log it for now
      const significantChange = priceChangePercent > 10;
      if (significantChange) {
        console.log(
          `Significant fuel price change detected: ${priceChangePercent.toFixed(2)}% in ${region}`
        );

        // Emit event for fuel price shock
        await emitEvent({
          eventType: 'FUEL_PRICE_SHOCK_DETECTED',
          aggregateId: snapshotId,
          aggregateType: 'FUEL_PRICE_SNAPSHOT',
          actorId: snapshot.reportedByDriverId ?? 'SYSTEM',
          actorRole: 'DRIVER',
          payload: {
            region: region,
            old_price: previousSnapshot?.dieselPriceEtbPerLiter?.toNumber() ?? 0,
            new_price: newDieselPrice,
            change_percent: priceChangePercent,
            corridor_count: corridors.length,
          },
        });
      }

      // Confirm DriverEarning for this report
      // Check if there's a DriverEarning FUEL_REPORT_BONUS for this driver within last 1 hour
      // where tripId IS NULL and loadId IS NULL
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existingEarning = snapshot.reportedByDriverId ? await prisma.driverEarning.findFirst({
        where: {
          driverId: snapshot.reportedByDriverId,
          tripId: null,
          loadId: null,
          earningType: 'FUEL_REPORT_BONUS',
          createdAt: { gte: oneHourAgo },
        },
      }) : null;

      if (!existingEarning && snapshot.reportedByDriverId) {
        // Create DriverEarning for fuel report bonus
        await prisma.driverEarning.create({
          data: {
            driverId: snapshot.reportedByDriverId,
            loadId: undefined,
            tripId: undefined,
            earningType: 'FUEL_REPORT_BONUS',
            amountEtb: 500, // Standard bonus for fuel report (adjust as needed)
            status: 'PENDING',
            paidAt: null,
            paidByFleetOwner: false,
            description: `Fuel price report snapshot for ${region}`,
          },
        });

        // Also emit an earning created event
        await emitEvent({
          eventType: 'DRIVER_EARNING_CREATED',
          aggregateId: snapshot.reportedByDriverId,
          aggregateType: 'DRIVER',
          actorId: 'SYSTEM',
          actorRole: 'FUEL_INTEL_WORKER',
          payload: {
            driver_id: snapshot.reportedByDriverId,
            earning_type: 'FUEL_REPORT_BONUS',
            amount_etb: 500,
            snapshot_id: snapshotId,
            region: region,
          },
        });
      }

      return {
        success: true,
        snapshotId,
        region,
        priceChangePercent: priceChangePercent.toFixed(2),
        corridorsAffected: corridors.length,
        earningCreated: !existingEarning && !!snapshot.reportedByDriverId,
      };
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };
