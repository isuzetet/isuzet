import { Worker, Job } from 'bullmq';
import { prisma, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface WarehouseQueueExpiryJob {
  zoneId?: string;
}

export function createWarehouseQueueExpiryWorker(): Worker {
  return new Worker<WarehouseQueueExpiryJob>(
    QUEUES.WAREHOUSE_QUEUE_EXPIRY,
    async (job: Job<WarehouseQueueExpiryJob>) => {
      const { zoneId } = job.data;
      const config = await getConfig();

      const expiryHours = config.warehouseQueueExpiryHours;
      const expiryTime = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

      // Delete entries older than warehouseQueueExpiryHours (simple approach)
      // Or update them if we add a status field to the schema
      const result = await prisma.warehouseQueue.deleteMany({
        where: {
          lastReportedAt: { lt: expiryTime },
          ...(zoneId && { zoneId }),
        },
      });

      return { success: true, expiredCount: result.count };
    },
    { connection: redis as any }
  );
}
