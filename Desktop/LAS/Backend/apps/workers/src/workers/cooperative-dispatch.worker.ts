import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import { redis } from '@ruit/shared-queue';
import { prisma } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { generateId } from '@ruit/shared-utils';
import { QueueNames } from '@ruit/shared-types/src/queues';

const QUEUE_NAME = QueueNames.COOPERATIVE_DISPATCH_TIMEOUT;

export async function startCooperativeDispatchWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { loadId, cooperativeId } = job.data;

      try {
        const load = await prisma.load.findUnique({
          where: { id: loadId },
        });

        if (!load) {
          return null;
        }

        const cooperative = await prisma.transportCooperative.findUnique({
          where: { id: cooperativeId },
        });

        if (!cooperative) {
          return null;
        }

        if (load.status === 'OPEN') {
          await prisma.load.update({
            where: { id: loadId },
            data: {
              status: 'REASSIGNED',
              updatedAt: new Date(),
            },
          });
        }

        return { processed: true, loadId, cooperativeId };
      } catch (error) {
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`Cooperative dispatch timeout job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `Cooperative dispatch timeout job ${job?.id} failed:`,
      error,
    );
  });

  return worker;
}

export async function scheduleCooperativeDispatchTimeout(
  loadId: string,
  cooperativeId: string,
) {
  const config = await getConfig();
  const delayMs = (config.cooperativeDispatcherOfferWindowMin || 15) * 60 * 1000;

  const queue = new Queue(QUEUE_NAME, { connection: redis });
  await queue.add(
    'cooperative_dispatch_timeout',
    {
      jobId: generateId('cdj'),
      loadId,
      cooperativeId,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  );

  await queue.close();
}
