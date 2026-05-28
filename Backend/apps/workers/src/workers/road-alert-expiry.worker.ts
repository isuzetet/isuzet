import { Worker, Job } from 'bullmq';
import { prisma, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface RoadAlertExpiryJob {
  alertId: string;
}

export function createRoadAlertExpiryWorker(): Worker {
  return new Worker<RoadAlertExpiryJob>(
    QUEUES.ROAD_ALERT_EXPIRY,
    async (job: Job<RoadAlertExpiryJob>) => {
      const { alertId } = job.data;

      const alert = await prisma.roadAlert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        throw new Error(`Road alert not found: ${alertId}`);
      }

      // Mark alert as cleared when it expires
      await prisma.roadAlert.update({
        where: { id: alertId },
        data: { clearedAt: new Date() },
      });

      return { success: true, alertId };
    },
    { connection: redis as any }
  );
}
