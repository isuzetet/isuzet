import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis, addJob } from '@ruit/shared-queue';
import { EVENT_TYPES } from '@ruit/shared-types';

interface RouteDeviationJob {
  routeDeviationId: string;
  driverId: string;
  tripId: string;
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
      corridorId: params.payload.corridorId as string | null,
      payload: params.payload as any,
      metadata: {
        source: 'ROUTE_DEVIATION_WORKER',
        timestamp: new Date().toISOString(),
      } as any,
    },
  });
}

export function createRouteDeviationWorker(): Worker {
  return new Worker<RouteDeviationJob>(
    QUEUES.ROUTE_DEVIATION,
    async (job: Job<RouteDeviationJob>) => {
      const { routeDeviationId, driverId, tripId } = job.data;

      // Find RouteDeviation by id
      const routeDeviation = await prisma.routeDeviation.findUnique({
        where: { id: routeDeviationId },
      });

      if (!routeDeviation) {
        throw new Error(`RouteDeviation not found: ${routeDeviationId}`);
      }

      // Find Driver - get current trust score
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new Error(`Driver not found: ${driverId}`);
      }

      // Get deviation in km
      const deviationKm = routeDeviation.deviationKm?.toNumber() ?? 0;

      // Apply trust penalty if deviation > 5 km
      let penaltyApplied = false;
      if (deviationKm > 5) {
        const currentTrustScore = driver.trustScore.toNumber();
        const newTrustScore = Math.max(0.0, currentTrustScore - 0.03);

        await prisma.driver.update({
          where: { id: driverId },
          data: {
            trustScore: newTrustScore,
          },
        });

        penaltyApplied = true;

        // Create Event: TRUST_SCORE_UPDATED
        await emitEvent({
          eventType: 'TRUST_SCORE_UPDATED',
          aggregateId: driverId,
          aggregateType: 'DRIVER',
          actorId: 'SYSTEM',
          actorRole: 'ROUTE_DEVIATION_WORKER',
          payload: {
            driver_id: driverId,
            old_score: currentTrustScore,
            new_score: newTrustScore,
            change: -0.03,
            reason: 'ROUTE_DEVIATION_PENALTY',
            deviation_id: routeDeviationId,
            deviation_km: deviationKm,
          },
        });
      }

      // Find the Trip's load - get orderer contact info
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          load: {
            include: {
              orderer: true,
            },
          },
        },
      });

      // Queue notification job if NOTIFICATION queue exists and we have orderer info
      if (trip?.load?.orderer) {
        const orderer = trip.load.orderer;
        const driverName = driver.licenseNumber || driver.id;

        // Try to queue notification
        try {
          await addJob(QUEUES.NOTIFICATION ?? '', 'route-deviation-notify', {
            recipientId: orderer.id,
            recipientType: 'ORDERER',
            type: 'ROUTE_DEVIATION_ALERT',
            title: 'Route Deviation Alert',
            body: `Driver ${driverName} has deviated from the route by ${deviationKm.toFixed(1)} km`,
            data: {
              tripId,
              driverName,
              deviationKm,
              deviationId: routeDeviationId,
            },
          });
        } catch {
          // Notification queue may not exist - skip silently
        }
      }

      // Update RouteDeviation - skip notifiedAt (field doesn't exist)
      // The field was not found in schema, so we skip this step

      return {
        success: true,
        routeDeviationId,
        deviationKm,
        penaltyApplied,
        driverId,
        tripId,
      };
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };
