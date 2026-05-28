import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface MaintenanceReminderJob {
  fleetOwnerId: string;
}

export function createMaintenanceReminderWorker(): Worker {
  return new Worker<MaintenanceReminderJob>(
    QUEUES.MAINTENANCE_REMINDER,
    async (job: Job<MaintenanceReminderJob>) => {
      const { fleetOwnerId } = job.data;
      const config = await getConfig();

      // Find trucks where nextServiceDue within 7 days
      const reminderDays = 7;
      const now = new Date();
      const dueDateMax = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);

      const trucks = await prisma.truck.findMany({
        where: {
          fleetOwnerId,
        },
        select: {
          id: true,
          plateNumber: true,
        },
      });

      const dueSoon = [];

      for (const truck of trucks) {
        const lastLog = await prisma.maintenanceLog.findFirst({
          where: { truckId: truck.id },
          orderBy: { servicedAt: 'desc' },
        });

        if (lastLog && lastLog.nextServiceDue) {
          const nextDue = new Date(lastLog.nextServiceDue);
          if (nextDue >= now && nextDue <= dueDateMax) {
            dueSoon.push({
              truckId: truck.id,
              plateNumber: truck.plateNumber,
              nextServiceDue: lastLog.nextServiceDue,
            });
          }
        }
      }

      // Emit MAINTENANCE_REMINDER_SENT events for each truck
      for (const truck of dueSoon) {
        const strategy = await prisma.strategyVersion.findFirst({
          where: { isActive: true },
          select: { id: true },
        });

        await prisma.event.create({
          data: {
            id: generateId('evt'),
            eventType: 'MAINTENANCE_REMINDER_SENT',
            aggregateId: truck.truckId,
            aggregateType: 'TRUCK',
            actorId: fleetOwnerId,
            actorRole: 'FLEET_OWNER',
            strategyVersionId: strategy?.id ?? 'str_default',
            corridorId: null,
            payload: {
              truckId: truck.truckId,
              plateNumber: truck.plateNumber,
              nextServiceDue: truck.nextServiceDue,
            } as any,
            metadata: {
              source: 'MAINTENANCE_REMINDER_WORKER',
              timestamp: new Date().toISOString(),
            } as any,
          },
        });
      }

      return { success: true, remindersSent: dueSoon.length };
    },
    { connection: redis as any }
  );
}
