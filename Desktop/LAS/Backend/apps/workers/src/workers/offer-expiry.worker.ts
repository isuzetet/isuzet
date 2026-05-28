/**
 * Offer Expiry Worker
 * Runs every 2 minutes to process expired load offers
 * Handles expired offers by declining them and triggering next dispatch round
 * NOTE: Logic is inlined here to avoid cross-package rootDir violations.
 */

import { Worker } from 'bullmq';
import { prisma } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface OfferExpiryCheckJob {
  // No input needed - processes all expired offers
}

export async function runOfferExpiryCheck(): Promise<{
  processed: number;
  expiredOffers: number;
  escalatedLoads: number;
  errors: string[];
}> {
  console.log('Starting offer expiry check...');

  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let expiredOffers = 0;
  let escalatedLoads = 0;

  const MAX_OFFER_ROUNDS = 3;
  const MAX_DECLINES_PER_ROUND = 3;

  try {
    // Find all expired pending offers
    const expiredOffersList = await prisma.loadOfferRecord.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lte: new Date()
        }
      }
    });

    console.log(`Found ${expiredOffersList.length} expired offers to process`);

    for (const offer of expiredOffersList) {
      try {
        // Mark offer as expired
        await prisma.loadOfferRecord.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED' }
        });

        const load = await prisma.load.findUnique({
          where: { id: offer.loadId }
        });

        if (!load) {
          errors.push(`Load ${offer.loadId} not found for offer ${offer.id}`);
          continue;
        }

        const newDeclineCount = load.totalDeclines + 1;

        await prisma.load.update({
          where: { id: load.id },
          data: {
            totalDeclines: newDeclineCount,
            currentOfferDriverId: null,
            offerSentAt: null,
            offerExpiresAt: null
          }
        });

        const currentRound = load.offerRound;
        const declinesThisRound = await prisma.loadOfferRecord.count({
          where: {
            loadId: load.id,
            status: { in: ['DECLINED', 'EXPIRED'] }
          }
        });

        if (currentRound >= MAX_OFFER_ROUNDS || declinesThisRound >= MAX_DECLINES_PER_ROUND * MAX_OFFER_ROUNDS) {
          // Escalate load — set back to OPEN for manual intervention
          await prisma.load.update({
            where: { id: load.id },
            data: {
              status: 'OPEN',
              dispatchAttempts: { increment: 1 }
            }
          });

          // Notify ops via notification engine
          try {
            const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3013';
            await fetch(`${notificationEngineUrl}/internal/sms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: process.env.OPS_ALERT_PHONE || '+251911000000',
                message: `Load ${load.id} requires manual dispatch intervention. All offer rounds exhausted.`,
                template: null
              })
            });
          } catch (notifyErr) {
            console.error('Failed to notify ops of escalation:', notifyErr);
          }

          escalatedLoads++;
        }

        expiredOffers++;
        processed++;
      } catch (offerError) {
        const errorMsg = `Failed to process expired offer ${offer.id}: ${offerError instanceof Error ? offerError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Offer expiry check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error(errorMsg);
  }

  const duration = Date.now() - startTime;
  console.log(`Offer expiry check completed in ${duration}ms`);
  console.log(
    `Summary: Processed=${processed}, Expired=${expiredOffers}, Escalated=${escalatedLoads}, Errors=${errors.length}`
  );

  return {
    processed,
    expiredOffers,
    escalatedLoads,
    errors,
  };
}

export function createOfferExpiryWorker(): Worker {
  return new Worker<OfferExpiryCheckJob>(QUEUES.OFFER_EXPIRY_CHECK, async (job) => {
    console.log(`Processing offer expiry check job ${job.id}`);
    await runOfferExpiryCheck();
  }, { connection: redis as any });
}
