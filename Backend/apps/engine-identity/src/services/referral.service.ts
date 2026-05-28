import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { addJob, QUEUES } from '@ruit/shared-queue';
import { ReferralType, ReferralStatus } from '@prisma/client';

/**
 * Generate a unique 8-character referral code for a user
 * Format: XXXXXXXX (alphanumeric, uppercase)
 */
export async function generateReferralCode(userId: string): Promise<string> {
  try {
    // Check if user already has a code
    const existingRecord = await prisma.referralRecord.findFirst({
      where: { referrerId: userId },
      select: { referralCode: true },
    });

    if (existingRecord) {
      return existingRecord.referralCode;
    }

    let code: string;
    let isUnique = false;

    // Generate unique 8-character code
    while (!isUnique) {
      code = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()
        .padEnd(8, '0')
        .substring(0, 8);

      const existing = await prisma.referralRecord.findFirst({
        where: { referralCode: code },
      });

      isUnique = !existing;
    }

    return code!;
  } catch (error) {
    console.error('[Referral] generateReferralCode error:', error);
    throw error;
  }
}

/**
 * Determine referral type based on user roles
 */
function determineReferralType(referrerRole: string, referredRole: string): ReferralType | null {
  // Driver refers Driver
  if (referrerRole === 'DRIVER' && referredRole === 'DRIVER') {
    return 'DRIVER_TO_DRIVER';
  }
  // Fleet refers Fleet
  if (referrerRole === 'FLEET_OWNER' && referredRole === 'FLEET_OWNER') {
    return 'FLEET_TO_FLEET';
  }
  // Agent refers Fleet
  if (referrerRole === 'FIELD_AGENT' && referredRole === 'FLEET_OWNER') {
    return 'AGENT_TO_FLEET';
  }
  return null;
}

/**
 * Get trigger condition string based on referral type
 */
function getTriggerCondition(type: ReferralType): string {
  switch (type) {
    case 'DRIVER_TO_DRIVER':
      return '3_completed_trips';
    case 'FLEET_TO_FLEET':
      return '2_trucks_registered';
    case 'AGENT_TO_FLEET':
      return 'fleet_registered';
  }
}

/**
 * Apply a referral code at registration
 * Find referrer, determine type, create ReferralRecord with trigger condition
 */
export async function applyReferralCode(data: {
  newUserId: string;
  referralCode: string;
  newUserRole: string;
}): Promise<{
  success: boolean;
  data?: {
    referrerId: string;
    type: ReferralType;
    expectedBonus: number;
  };
  error?: { code: string; message: string };
}> {
  try {
    const { newUserId, referralCode, newUserRole } = data;

    // Find referrer by code
    const referralRecord = await prisma.referralRecord.findFirst({
      where: { referralCode },
    });

    if (!referralRecord) {
      return {
        success: false,
        error: { code: 'REFERRAL_CODE_NOT_FOUND', message: 'Invalid referral code' },
      };
    }

    const referrerId = referralRecord.referrerId;

    // Get referrer's role
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      select: { role: true },
    });

    if (!referrer) {
      return {
        success: false,
        error: { code: 'REFERRER_NOT_FOUND', message: 'Referrer not found' },
      };
    }

    // Determine referral type
    const referralType = determineReferralType(referrer.role || 'DRIVER', newUserRole);

    if (!referralType) {
      return {
        success: false,
        error: {
          code: 'INVALID_REFERRAL_TYPE',
          message: 'This referral combination is not supported',
        },
      };
    }

    const config = await getConfig();

    // Get expected bonus based on type
    let expectedBonusCents = 0;
    switch (referralType) {
      case 'DRIVER_TO_DRIVER':
        expectedBonusCents = config.bonusReferralDriverCents;
        break;
      case 'FLEET_TO_FLEET':
        expectedBonusCents = config.bonusReferralFleetCents;
        break;
      case 'AGENT_TO_FLEET':
        // Agent bonus should be defined in config
        expectedBonusCents = config.bonusReferralFleetCents; // Use fleet bonus as base
        break;
    }

    const triggerCondition = getTriggerCondition(referralType);

    // Create ReferralRecord
    const id = generateId('ref');
    await prisma.referralRecord.create({
      data: {
        id,
        referrerId,
        referredId: newUserId,
        referralCode,
        referralType,
        triggerCondition,
        bonusCents: expectedBonusCents,
        status: ReferralStatus.PENDING,
      },
    });

    return {
      success: true,
      data: {
        referrerId,
        type: referralType,
        expectedBonus: expectedBonusCents,
      },
    };
  } catch (error: any) {
    console.error('[Referral] applyReferralCode error:', error);
    return {
      success: false,
      error: {
        code: 'APPLY_REFERRAL_CODE_FAILED',
        message: error.message,
      },
    };
  }
}

/**
 * Check referral triggers after events (trip completion, truck registration)
 * Find PENDING ReferralRecords for this userId and evaluate triggers
 */
export async function checkReferralTriggers(userId: string, triggerType: string): Promise<void> {
  try {
    // Find all PENDING referrals where this user is the referred
    const referrals = await prisma.referralRecord.findMany({
      where: {
        referredId: userId,
        status: ReferralStatus.PENDING,
      },
    });

    for (const referral of referrals) {
      let triggerMet = false;

      if (referral.triggerCondition === '3_completed_trips' && triggerType === 'trip_completed') {
        // Check if driver has now completed 3 trips
        const driver = await prisma.driver.findUnique({
          where: { userId },
          select: { totalTripsCompleted: true },
        });
        const completedCount = driver?.totalTripsCompleted || 0;

        if (completedCount >= 3) {
          triggerMet = true;
        }
      } else if (referral.triggerCondition === '2_trucks_registered' && triggerType === 'truck_registered') {
        // Check if fleet owner has now registered 2+ trucks
        const truckCount = await prisma.truck.count({
          where: {
            fleetOwnerId: userId,
          },
        });

        if (truckCount >= 2) {
          triggerMet = true;
        }
      } else if (referral.triggerCondition === 'fleet_registered' && triggerType === 'fleet_owner_registered') {
        // Fleet owner is registered
        triggerMet = true;
      }

      if (triggerMet) {
        // Update status to QUALIFIED
        await prisma.referralRecord.update({
          where: { id: referral.id },
          data: {
            status: ReferralStatus.QUALIFIED,
            qualifiedAt: new Date(),
          },
        });

        // Enqueue REFERRAL_BONUS job
        await addJob(QUEUES.REFERRAL_BONUS, 'process_referral_bonus', {
          referralRecordId: referral.id,
          referrerId: referral.referrerId,
          referredId: userId,
          bonusCents: referral.bonusCents,
          referralType: referral.referralType,
        });
      }
    }
  } catch (error: any) {
    console.error('[Referral] checkReferralTriggers error:', error);
  }
}

/**
 * Calculate cold start premium for new drivers
 * First coldStartSubsidisedLoadCount loads at coldStartFirstLoadPremiumPct above market rate
 * Platform absorbs the premium
 */
export async function coldStartPremium(
  driverId: string,
  loadValueCents: number
): Promise<number> {
  try {
    const config = await getConfig();

    // Check if driver qualifies for cold start premium
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        totalTripsCompleted: true,
      },
    });

    if (!driver) {
      return loadValueCents;
    }

    // If driver has completed less than coldStartSubsidisedLoadCount trips
    if (driver.totalTripsCompleted < config.coldStartSubsidisedLoadCount) {
      // Apply premium: loadValue × (1 + coldStartFirstLoadPremiumPct/100)
      const premiumCents = Math.round(
        loadValueCents * (1 + config.coldStartFirstLoadPremiumPct / 100)
      );

      return premiumCents;
    }

    return loadValueCents;
  } catch (error) {
    console.error('[Referral] coldStartPremium error:', error);
    return loadValueCents;
  }
}

/**
 * Get referral history for a user
 */
export async function getReferralHistory(
  userId: string,
  direction: 'referrer' | 'referred' = 'referrer'
): Promise<any[]> {
  try {
    if (direction === 'referrer') {
      return await prisma.referralRecord.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return await prisma.referralRecord.findMany({
        where: { referredId: userId },
        orderBy: { createdAt: 'desc' },
      });
    }
  } catch (error) {
    console.error('[Referral] getReferralHistory error:', error);
    return [];
  }
}
