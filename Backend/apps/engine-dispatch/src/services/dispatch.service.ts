/**
 * ISUZET Dispatch Service
 * Handles automated load-to-driver matching and offer management
 */

import { prisma as db } from '@ruit/shared-db';
import { pricingV2Service, wdmService } from '@ruit/engine-optimizer';
import { ordererReliabilityService } from './orderer-reliability.service';

// ════════════════════════════════════════════════════════════════════════════
// LOCAL INTERFACES
// ════════════════════════════════════════════════════════════════════════════

interface DispatchResult {
  success: boolean;
  loadId: string;
  assignedDriverId?: string;
  assignedTruckId?: string;
  offerSent: boolean;
  offerExpiresAt?: Date;
  error?: string;
}

interface OfferResult {
  success: boolean;
  loadId: string;
  driverId: string;
  action: 'ACCEPTED' | 'DECLINED';
  error?: string;
}

interface ExpiredOffersResult {
  processedCount: number;
  escalatedLoads: string[];
  errors: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const OFFER_EXPIRY_MINUTES = 15; // Offers expire after 15 minutes
const MAX_OFFER_ROUNDS = 3; // Maximum rounds of offers before escalation
const MAX_DECLINES_PER_ROUND = 3; // Maximum declines before moving to next round

// ════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Main dispatch orchestrator - matches load to driver and sends offer
 */
async function dispatchLoad(loadId: string): Promise<DispatchResult> {
  try {
    // Load the load with current dispatch state
    const load = await db.load.findUnique({
      where: { id: loadId },
      include: {
        orderer: true
      }
    });

    if (!load) {
      return {
        success: false,
        loadId,
        offerSent: false,
        error: 'Load not found'
      };
    }

    // Check if load is ready for dispatch
    if (load.status !== 'READY_TO_MATCH' && load.status !== 'OPEN' && load.status !== 'MATCHING') {
      return {
        success: false,
        loadId,
        offerSent: false,
        error: `Load status is ${load.status}, not ready for dispatch`
      };
    }

    // Mark load as MATCHING to prevent race conditions from double-dispatch
    await db.load.update({
      where: { id: loadId },
      data: { status: 'MATCHING' }
    });

    const load_refreshed = await db.load.findUnique({
      where: { id: loadId },
      include: {
        orderer: true
      }
    });

    if (!load_refreshed) {
      return {
        success: false,
        loadId,
        offerSent: false,
        error: 'Load not found after MATCHING status transition'
      };
    }

    // Check if load has a ready trip
    const trip = await db.trip.findFirst({
      where: {
        loadId: load.id,
        status: 'PENDING'
      }
    });

    if (!trip) {
      return {
        success: false,
        loadId,
        offerSent: false,
        error: 'No pending trip found for load'
      };
    }

    // Get orderer reliability score for WDM weighting (0-100)
    const ordererReliabilityScore = await ordererReliabilityService.getReliabilityScore(load_refreshed.ordererId);

    // Get scored drivers for this load
    const scoredDrivers = await wdmService.scoreDriversForLoad({
      loadId: load_refreshed.id,
      ordererReliabilityScore
    });

    if (scoredDrivers.length === 0) {
      // No drivers available - escalate immediately
      await escalateUnmatchedLoad(load.id);
      return {
        success: false,
        loadId,
        offerSent: false,
        error: 'No drivers available for load'
      };
    }

    // Find the best available driver (not currently being offered to)
    let selectedDriver: typeof scoredDrivers[0] | null = null;
    for (const driver of scoredDrivers) {
      // Check if this driver is currently being offered another load
      const activeOffer = await db.loadOfferRecord.findFirst({
        where: {
          driverId: driver.driverId,
          status: 'PENDING',
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!activeOffer) {
        selectedDriver = driver;
        break;
      }
    }

    if (!selectedDriver) {
      // All top drivers are busy - escalate
      await escalateUnmatchedLoad(load.id);
      return {
        success: false,
        loadId,
        offerSent: false,
        error: 'All suitable drivers are currently busy'
      };
    }

    // Calculate pricing for the offer
    const pricingQuote = await pricingV2Service.getPricingQuoteForLoad(load.id);

    // Create offer record
    const offerExpiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000);

    const offerRecord = await db.loadOfferRecord.create({
      data: {
        loadId: load.id,
        driverId: selectedDriver.driverId,
        truckId: selectedDriver.truckId,
        offerAmountEtb: pricingQuote.netAmountToDriverEtb,
        expiresAt: offerExpiresAt,
        status: 'PENDING'
      }
    });

    // Update load with current offer info + set OFFERED status
    await db.load.update({
      where: { id: load.id },
      data: {
        status: 'OFFERED',
        currentOfferDriverId: selectedDriver.driverId,
        offerSentAt: new Date(),
        offerExpiresAt,
        offerRound: load.offerRound + 1
      }
    });

    // Send notification to driver (via notification engine internal API)
    try {
      const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3013';
      await fetch(`${notificationEngineUrl}/internal/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedDriver.driverId, // Will be resolved by notification engine
          message: `New load offer: ETB ${pricingQuote.netAmountToDriverEtb} - expires in ${OFFER_EXPIRY_MINUTES} minutes. Reply to accept.`,
          template: null
        })
      });

      // Mark notification as sent
      await db.loadOfferRecord.update({
        where: { id: offerRecord.id },
        data: { notificationSentApp: true }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Continue - notification failure shouldn't block dispatch
    }

    return {
      success: true,
      loadId,
      assignedDriverId: selectedDriver.driverId,
      assignedTruckId: selectedDriver.truckId,
      offerSent: true,
      offerExpiresAt
    };

  } catch (error) {
    console.error('Dispatch load error:', error);
    return {
      success: false,
      loadId,
      offerSent: false,
      error: error instanceof Error ? error.message : 'Unknown dispatch error'
    };
  }
}

/**
 * Handle driver accepting an offer
 */
async function acceptOffer(loadId: string, driverId: string): Promise<OfferResult> {
  try {
    // Find the active offer
    const offer = await db.loadOfferRecord.findFirst({
      where: {
        loadId,
        driverId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!offer) {
      return {
        success: false,
        loadId,
        driverId,
        action: 'ACCEPTED',
        error: 'No active offer found for this load and driver'
      };
    }

    // Update offer status
    await db.loadOfferRecord.update({
      where: { id: offer.id },
      data: { status: 'ACCEPTED' }
    });

    // Update load status to MATCHED (valid schema status)
    await db.load.update({
      where: { id: loadId },
      data: {
        status: 'MATCHED',
        currentOfferDriverId: null,
        offerSentAt: null,
        offerExpiresAt: null
      }
    });

    // Update trip status to PENDING (valid trip status)
    await db.trip.updateMany({
      where: { loadId },
      data: { status: 'PENDING' }
    });

    // Create assignment record
    const { ulid } = await import('ulid');
    const strategyVersion = await db.strategyVersion.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    await db.assignment.create({
      data: {
        id: ulid(),
        loadId,
        driverId,
        truckId: offer.truckId,
        fleetOwnerId: driverId, // Will be resolved downstream; use driverId as placeholder
        status: 'ACCEPTED',
        acceptanceDeadline: new Date(Date.now() + 15 * 60 * 1000),
        acceptedAt: new Date(),
        strategyVersionId: strategyVersion?.id || 'str_default',
        optimizationScore: offer.offerAmountEtb
      }
    });

    return {
      success: true,
      loadId,
      driverId,
      action: 'ACCEPTED'
    };

  } catch (error) {
    console.error('Accept offer error:', error);
    return {
      success: false,
      loadId,
      driverId,
      action: 'ACCEPTED',
      error: error instanceof Error ? error.message : 'Unknown accept offer error'
    };
  }
}

/**
 * Handle driver declining an offer
 */
async function declineOffer(loadId: string, driverId: string): Promise<OfferResult> {
  try {
    // Find the active offer
    const offer = await db.loadOfferRecord.findFirst({
      where: {
        loadId,
        driverId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!offer) {
      return {
        success: false,
        loadId,
        driverId,
        action: 'DECLINED',
        error: 'No active offer found for this load and driver'
      };
    }

    // Update offer status
    await db.loadOfferRecord.update({
      where: { id: offer.id },
      data: { status: 'DECLINED' }
    });

    // Update load decline count
    const load = await db.load.findUnique({
      where: { id: loadId }
    });

    if (!load) {
      return {
        success: false,
        loadId,
        driverId,
        action: 'DECLINED',
        error: 'Load not found'
      };
    }

    const newDeclineCount = load.totalDeclines + 1;
    await db.load.update({
      where: { id: loadId },
      data: {
        totalDeclines: newDeclineCount,
        currentOfferDriverId: null,
        offerSentAt: null,
        offerExpiresAt: null
      }
    });

    // Check if we should try another round or escalate
    const currentRound = load.offerRound;
    const declinesTotal = await db.loadOfferRecord.count({
      where: {
        loadId,
        status: 'DECLINED'
      }
    });

    if (declinesTotal >= MAX_DECLINES_PER_ROUND && currentRound < MAX_OFFER_ROUNDS) {
      // Start new round immediately
      await dispatchLoad(loadId);
    } else if (currentRound >= MAX_OFFER_ROUNDS) {
      // Max rounds reached - escalate
      await escalateUnmatchedLoad(loadId);
    }

    return {
      success: true,
      loadId,
      driverId,
      action: 'DECLINED'
    };

  } catch (error) {
    console.error('Decline offer error:', error);
    return {
      success: false,
      loadId,
      driverId,
      action: 'DECLINED',
      error: error instanceof Error ? error.message : 'Unknown decline offer error'
    };
  }
}

/**
 * Process expired offers and trigger next actions
 */
async function handleExpiredOffers(): Promise<ExpiredOffersResult> {
  const result: ExpiredOffersResult = {
    processedCount: 0,
    escalatedLoads: [],
    errors: []
  };

  try {
    // Find all expired pending offers (no include — LoadOfferRecord has no load relation in schema)
    const expiredOffers = await db.loadOfferRecord.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lte: new Date()
        }
      }
    });

    for (const offer of expiredOffers) {
      try {
        // Mark offer as expired
        await db.loadOfferRecord.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED' }
        });

        // Fetch the load separately
        const load = await db.load.findUnique({ where: { id: offer.loadId } });
        if (!load) {
          result.errors.push(`Load ${offer.loadId} not found for offer ${offer.id}`);
          continue;
        }

        const newDeclineCount = load.totalDeclines + 1;

        await db.load.update({
          where: { id: load.id },
          data: {
            totalDeclines: newDeclineCount,
            currentOfferDriverId: null,
            offerSentAt: null,
            offerExpiresAt: null
          }
        });

        // Check if we should try another round or escalate
        const currentRound = load.offerRound;
        const declinesTotal = await db.loadOfferRecord.count({
          where: {
            loadId: load.id,
            status: { in: ['DECLINED', 'EXPIRED'] }
          }
        });

        if (declinesTotal >= MAX_DECLINES_PER_ROUND && currentRound < MAX_OFFER_ROUNDS) {
          // Start new round
          await dispatchLoad(load.id);
        } else if (currentRound >= MAX_OFFER_ROUNDS) {
          // Max rounds reached - escalate
          await escalateUnmatchedLoad(load.id);
          result.escalatedLoads.push(load.id);
        }

        result.processedCount++;
      } catch (offerError) {
        const errorMsg = `Failed to process expired offer ${offer.id}: ${offerError instanceof Error ? offerError.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Failed to handle expired offers: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }

  return result;
}

/**
 * Escalate unmatched load to manual intervention
 */
async function escalateUnmatchedLoad(loadId: string): Promise<void> {
  try {
    // Update load status to UNMATCHED for manual intervention
    await db.load.update({
      where: { id: loadId },
      data: {
        status: 'UNMATCHED',
        dispatchAttempts: {
          increment: 1
        },
        currentOfferDriverId: null,
        offerSentAt: null,
        offerExpiresAt: null
      }
    });

    // Wire to notification engine — notify ops team of escalation
    try {
      const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3013';
      await fetch(`${notificationEngineUrl}/internal/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: process.env.OPS_ALERT_PHONE || '+251911000000',
          message: `Load ${loadId} requires manual dispatch intervention. All offer rounds exhausted.`,
          template: null
        })
      });
    } catch (notifyErr) {
      console.error('Failed to notify ops of escalation:', notifyErr);
    }

    console.log(`Load ${loadId} escalated for manual dispatch intervention`);
  } catch (error) {
    console.error(`Failed to escalate load ${loadId}:`, error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE OBJECT
// ════════════════════════════════════════════════════════════════════════════

export const dispatchService = {
  dispatchLoad,
  acceptOffer,
  declineOffer,
  handleExpiredOffers,
  escalateUnmatchedLoad
};