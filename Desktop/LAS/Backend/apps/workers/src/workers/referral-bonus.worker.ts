import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';
import { Prisma } from '@prisma/client';

interface ReferralBonusJob {
  referredUserId: string;
  tripNumber?: number; // Trip count for new driver bonus
}

/**
 * Referral Bonus Worker
 * 
 * Handles two bonus scenarios:
 * 1. REFERRAL_BONUS: When referred user triggers condition (e.g., completes 1st trip)
 *    Pays referrer the configured referral bonus
 * 
 * 2. NEW_DRIVER_GUARANTEE: When driver completes trips #1, #2, or #3
 *    Pays new driver bonus from platform commission pool
 */

export function createReferralBonusWorker(): Worker {
  return new Worker<ReferralBonusJob>(
    QUEUES.REFERRAL_BONUS,
    async (job: Job<ReferralBonusJob>) => {
      const { referredUserId, tripNumber = 1 } = job.data;
      const config = await getConfig();
      const now = new Date();

      const strategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { activatedAt: 'desc' },
      });

      // ========================================
      // PART 1: Referral Bonus
      // ========================================
      const referral = await prisma.referralRecord.findFirst({
        where: {
          referredId: referredUserId,
          status: 'PENDING',
          completedAt: null,
        },
      });

      if (referral) {
        // Create escrow entry for referrer
        await prisma.$transaction([
          // Create escrow entry
          prisma.escrowLedgerEntry.create({
            data: {
              id: generateId('esc'),
              fromUserId: 'SYSTEM',
              toUserId: referral.referrerId,
              amountCents: config.referralBonusCents,
              type: 'REFERRAL_BONUS',
              status: 'PENDING',
              notes: `Referral bonus for referring user ${referredUserId}`,
            },
          }),

          // Update referral record
          prisma.referralRecord.update({
            where: { id: referral.id },
            data: {
              completedAt: now,
              paidAt: now,
              status: 'REWARDED',
            },
          }),
        ]);

        console.log(
          `Referral bonus ETB ${config.referralBonusCents / 100} paid to referrer ${referral.referrerId}`
        );
      }

      // ========================================
      // PART 2: New Driver Guarantee Bonus
      // ========================================
      // Check if driver has completed < 3 trips (only reward first 3 trips)
      const driver = await prisma.driver.findUnique({
        where: { userId: referredUserId },
        select: {
          id: true,
          totalTripsCompleted: true,
        },
      });

      if (driver && driver.totalTripsCompleted <= 3) {
        // Create escape entry for new driver bonus
        const newDriverBonus = await prisma.escrowLedgerEntry.create({
          data: {
            id: generateId('esc'),
            fromUserId: 'SYSTEM',
            toUserId: referredUserId,
            amountCents: config.newDriverGuaranteeBonusCents,
            type: 'NEW_DRIVER_GUARANTEE_BONUS',
            status: 'PENDING',
            notes: `New driver guarantee bonus for trip #${driver.totalTripsCompleted + 1}`,
          },
        });

        console.log(
          `New driver bonus ETB ${config.newDriverGuaranteeBonusCents / 100} created for driver ${driver.id} (trip #${driver.totalTripsCompleted + 1})`
        );

        // Log event
        if (strategy?.id) {
          await prisma.event.create({
            data: {
              id: generateId('evt'),
              eventType: 'NEW_DRIVER_BONUS_AWARDED',
              aggregateId: driver.id,
              aggregateType: 'Driver',
              actorId: 'SYSTEM',
              actorRole: 'SYSTEM',
              strategyVersionId: strategy.id,
              payload: {
                bonusCents: config.newDriverGuaranteeBonusCents,
                tripNumber: driver.totalTripsCompleted + 1,
                escrowId: newDriverBonus.id,
              } as any,
            },
          });
        }
      }

      return { processed: 1 };
    },
    {
      connection: redis,
    }
  );
}
