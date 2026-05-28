// Delivers webhook callbacks to orderer ERP systems
// Queue: QUEUES.WEBHOOK_DELIVERY
// Job data: { ordererId, event, payload, attempt? }

import { Worker } from "bullmq";
import { prisma } from "@ruit/shared-db";
import { QUEUES, addJob, redis } from "@ruit/shared-queue";
import { createHmac } from "crypto";

interface WebhookDeliveryJobData {
  ordererId: string;
  event: string;
  payload: Record<string, any>;
  attempt?: number;
}

const MAX_ATTEMPTS = 5;

export function createWebhookDeliveryWorker() {
  return new Worker<WebhookDeliveryJobData>(QUEUES.WEBHOOK_DELIVERY, async (job) => {
    const { ordererId, event, payload, attempt = 1 } = job.data;
    console.log(`Attempting to deliver webhook for orderer ${ordererId}, event ${event}, attempt ${attempt}`);

    const orderer = await prisma.orderer.findUnique({ where: { id: ordererId }, select: { webhookUrl: true } });
    const webhookUrl = orderer?.webhookUrl;

    if (!webhookUrl) {
      console.warn(`Orderer ${ordererId} has no webhook URL configured. Skipping webhook delivery.`);
      return;
    }

    try {
      if (!process.env.WEBHOOK_SECRET) {
        throw new Error('WEBHOOK_SECRET environment variable is required for webhook signature verification');
      }
      const secret = process.env.WEBHOOK_SECRET;
      const hmac = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ruit-Signature": hmac,
          "X-Ruit-Event": event,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Webhook for orderer ${ordererId}, event ${event} delivered successfully.`);
        // Update webhook lastUsedAt
        // This needs a Webhook model linked to Orderer. For now, skipping.
      } else {
        throw new Error(`Webhook delivery failed with status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error delivering webhook for orderer ${ordererId}, event ${event}:`, error);

      if (attempt < MAX_ATTEMPTS) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying webhook in ${delay / 1000} seconds. Attempt ${attempt + 1}.`);
        await addJob(QUEUES.WEBHOOK_DELIVERY, job.name, { ...job.data, attempt: attempt + 1 }, { delay });
      } else {
        console.error(`Webhook for orderer ${ordererId}, event ${event} failed after ${MAX_ATTEMPTS} attempts.`);
        // 5. After 5 failures: notify orderer that webhook is failing
        await addJob(QUEUES.NOTIFICATIONS, "send-notification", {
          to: ordererId,
          message: `URGENT: Your webhook for events is failing after ${MAX_ATTEMPTS} attempts. Please check your webhook URL: ${webhookUrl}`,
          type: "WEBHOOK_FAILURE"
        });
      }
    }
  }, { connection: redis });
}
