import { Worker, Job } from 'bullmq';
import { prisma } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface NotificationJob {
  userId: string;
  channel: 'SMS' | 'PUSH' | 'EMAIL';
  templateId: string;
  templateData: Record<string, unknown>;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
}

const Templates: Record<string, string> = {
  OTP_VERIFICATION: 'Your RUIT verification code is {{code}}',
  LOAD_MATCHED: 'Your load {{loadId}} has been matched with a truck',
  TRIP_STARTED: 'Your trip {{tripId}} has started',
  TRIP_COMPLETED: 'Your trip {{tripId}} is complete. Amount: {{amountEtb}} ETB',
  PAYMENT_RECEIVED: 'Payment of {{amountEtb}} ETB received for trip {{tripId}}',
  INCIDENT_OPENED: 'An incident has been opened for trip {{tripId}}',
  TRUST_TIER_CHANGED: 'Your trust tier has changed to Tier {{tier}}',
  FRAUD_FLAGGED: 'Your account has been flagged for review',
};

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : '';
  });
}

export function createNotificationWorker(): Worker {
  return new Worker<NotificationJob>(
    QUEUES.NOTIFICATION,
    async (job) => {
      const { userId, channel, templateId, templateData, priority } = job.data;

      // Get user and notification preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.log(`User not found: ${userId}, skipping notification`);
        return { success: false, reason: 'USER_NOT_FOUND' };
      }

      // Check notification preferences
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (prefs && channel === 'SMS' && prefs.smsEnabled === false) {
        console.log(`User ${userId} has disabled SMS notifications`);
        return { success: false, reason: 'CHANNEL_DISABLED' };
      }
      if (prefs && channel === 'PUSH' && prefs.pushEnabled === false) {
        console.log(`User ${userId} has disabled PUSH notifications`);
        return { success: false, reason: 'CHANNEL_DISABLED' };
      }
      if (prefs && channel === 'EMAIL' && prefs.emailEnabled === false) {
        console.log(`User ${userId} has disabled EMAIL notifications`);
        return { success: false, reason: 'CHANNEL_DISABLED' };
      }

      // Get template message
      const templateMessage = Templates[templateId] || (templateData.message as string) || 'Notification from RUIT';
      const message = renderTemplate(templateMessage, templateData);

      // Route to notification engine
      try {
        let endpoint = '';
        let payload: Record<string, unknown> = {};

        if (channel === 'SMS') {
          endpoint = 'http://localhost:3013/internal/sms';
          payload = {
            phone: user.phone,
            message,
            priority: priority.toLowerCase(),
          };
        } else if (channel === 'PUSH') {
          endpoint = 'http://localhost:3013/internal/push';
          payload = {
            userId,
            title: 'RUIT Notification',
            body: message,
            data: templateData,
            priority: priority.toLowerCase(),
          };
        } else if (channel === 'EMAIL') {
          endpoint = 'http://localhost:3013/internal/email';
          payload = {
            to: user.email,
            subject: 'RUIT Notification',
            body: message,
            priority: priority.toLowerCase(),
          };
        }

        if (endpoint) {
          const { fetchWithTimeout } = await import('@ruit/shared-utils');
          const response = await fetchWithTimeout(
            endpoint,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
            5000,
            'NOTIFICATION'
          );
          if (response && !response.ok) {
            console.error(`Notification service error: ${response.status}`);
          } else if (!response) {
            console.error(`Notification service timeout to ${endpoint}`);
          }
        }

        // Create webhook record if user has webhooks
        const webhooks = await prisma.webhook.findMany({
          where: { ordererId: userId, isActive: true },
        });

        for (const webhook of webhooks) {
          try {
            const { fetchWithTimeout } = await import('@ruit/shared-utils');
            await fetchWithTimeout(
              webhook.url,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-RUIT-Event': templateId,
                  ...(webhook.secret ? { 'X-RUIT-Secret': webhook.secret } : {}),
                },
                body: JSON.stringify({
                  templateId,
                  templateData,
                  userId,
                  timestamp: new Date().toISOString(),
                }),
              },
              5000,
              'WEBHOOK'
            );
          } catch (err) {
            // Webhook failures are best-effort
            console.error(`Webhook delivery failed for ${webhook.id}:`, err);
          }
        }

        return { success: true, channel, userId, templateId };
      } catch (err) {
        // Notifications are best-effort, don't throw
        console.error('Notification delivery failed:', err);
        return { success: false, reason: 'DELIVERY_FAILED' };
      }
    },
    { connection: redis, concurrency: 10 }
  );
}

export { redis };
