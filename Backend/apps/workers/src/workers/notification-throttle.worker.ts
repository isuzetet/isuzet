import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface NotificationThrottleJob {
  // Periodic job - no specific input
}

/**
 * Notification Throttle Worker
 * 
 * Runs hourly to prevent notification spam.
 * 
 * Action:
 * - If user received > config.notificationMaxPerHour messages in last hour
 * - Set User.notificationThrottledUntil = now + 1 hour
 * - Subsequent notification sends check this field before sending
 */

export function createNotificationThrottleWorker(): Worker {
  return new Worker<NotificationThrottleJob>(
    QUEUES.NOTIFICATION_THROTTLE,
    async (job: Job<NotificationThrottleJob>) => {
      const config = await getConfig();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Query notification logs (or events that represent notifications sent)
      // We'll use Event records with eventType containing "NOTIFICATION" or similar
      // as proxy for notification count
      // In production, might use dedicated NotificationLog model

      const notificationCounts = await prisma.event.groupBy({
        by: ['actorId'],
        where: {
          createdAt: { gte: oneHourAgo },
          eventType: {
            in: [
              'NOTIFICATION_SENT',
              'SMS_SENT',
              'PUSH_SENT',
              'HOS_ADVISORY',
              'HOS_SOFT_BLOCK',
              'HOS_BLOCKED',
              'DOCUMENT_EXPIRY_ALERT',
            ],
          },
        },
        _count: {
          id: true,
        },
      });

      const userThrottleUpdates = [];

      for (const rec of notificationCounts) {
        const count = rec._count.id;

        if (count > config.notificationMaxPerHour) {
          console.log(
            `User ${rec.actorId} exceeded notification limit: ${count} > ${config.notificationMaxPerHour}. Throttling until ${new Date(now.getTime() + 60 * 60 * 1000).toISOString()}`
          );

          userThrottleUpdates.push(
            prisma.user.update({
              where: { id: rec.actorId },
              data: {
                notificationThrottledUntil: new Date(now.getTime() + 60 * 60 * 1000),
              },
            })
          );
        }
      }

      // Also clear throttle for users whose throttle window expired
      await prisma.user.updateMany({
        where: {
          notificationThrottledUntil: { lt: now },
        },
        data: {
          notificationThrottledUntil: null,
        },
      });

      // Execute all updates in batch
      if (userThrottleUpdates.length > 0) {
        await Promise.all(userThrottleUpdates);
      }

      return { throttled: userThrottleUpdates.length };
    },
    {
      connection: redis,
    }
  );
}
