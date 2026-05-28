import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma } from '@ruit/shared-db';
import { QUEUES, redis, addJob } from '@ruit/shared-queue';

interface IdleAlertJob {
  // Scheduled job - scans for idle trucks
}

interface IdleTruckAlert {
  truckId: string;
  driverId: string;
  idleSince: Date;
  idleHours: number;
}

export function createIdleAlertWorker(): Worker {
  return new Worker<IdleAlertJob>(
    QUEUES.IDLE_ALERTS,
    async (job: Job<IdleAlertJob>) => {
      const fourHoursAgo = new Date();
      fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

      // Find trucks that are in WAITING_AT_TERMINAL or AVAILABLE status (idle)
      // and have not had any trip activity in 4+ hours
      const trucks = await prisma.truck.findMany({
        where: {
          status: { in: ['WAITING_AT_TERMINAL', 'AVAILABLE'] },
          deletedAt: null,
        },
      });

      const idleTrucks: IdleTruckAlert[] = [];

      for (const truck of trucks) {
        // Check last trip activity
        const lastTrip = await prisma.trip.findFirst({
          where: { truckId: truck.id },
          orderBy: { actualDeliveryAt: 'desc' },
        });

        const idleSince = lastTrip?.actualDeliveryAt ?? truck.updatedAt;
        const idleHours = (Date.now() - idleSince.getTime()) / (1000 * 60 * 60);

        if (idleHours >= 4) {
          // Find the active driver via Assignment where truckId = truck.id AND status = 'ASSIGNED'
          const assignment = await prisma.assignment.findFirst({
            where: {
              truckId: truck.id,
              status: 'ASSIGNED',
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!assignment) {
            console.log(`Truck ${truck.id} is idle but has no active driver assignment - skipping`);
            continue;
          }

          const driverId = assignment.driverId;

          // Check if there's an open BackhaulSuggestion for this truck
          const existingSuggestion = await prisma.backhaulSuggestion.findFirst({
            where: {
              truckId: truck.id,
              status: 'PENDING',
              expiresAt: { gt: new Date() },
            },
          });

          if (existingSuggestion) {
            console.log(
              `Truck ${truck.id} is idle but already has a pending backhaul suggestion - skipping`
            );
            continue;
          }

          idleTrucks.push({
            truckId: truck.id,
            driverId,
            idleSince,
            idleHours,
          });

          // Queue a BACKHAUL_MATCHING job for this truck via idle trigger
          try {
            await addJob(QUEUES.BACKHAUL_MATCHING, `idle-trigger-${truck.id}`, {
              truckId: truck.id,
              driverId,
              tripId: 'IDLE_TRIGGER',
            });
            console.log(`Queued BACKHAUL_MATCHING for idle truck ${truck.id} (driver ${driverId})`);
          } catch (err) {
            console.error(`Failed to queue backhaul job for truck ${truck.id}:`, err);
          }
        }
      }

      console.log(`Processed ${trucks.length} trucks, found ${idleTrucks.length} idle trucks`);

      return {
        success: true,
        trucksScanned: trucks.length,
        idleTrucksFound: idleTrucks.length,
        idleTrucks: idleTrucks.map((t) => ({
          truckId: t.truckId,
          driverId: t.driverId,
          idleSince: t.idleSince.toISOString(),
          idleHours: Math.round(t.idleHours * 10) / 10,
        })),
      };
    },
    { connection: redis, concurrency: 1 }
  );
}

export { redis };
