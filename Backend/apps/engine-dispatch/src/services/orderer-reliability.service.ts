/**
 * RUIT CBE Orderer Reliability Service
 * Calculates and tracks orderer reliability scores for better matching
 * Aligned with the OrdererReliabilityScore schema model.
 */

import { prisma as db } from '@ruit/shared-db';

// ════════════════════════════════════════════════════════════════════════════
// LOCAL INTERFACES
// ════════════════════════════════════════════════════════════════════════════

interface ReliabilityScore {
  ordererId: string;
  score: number; // 0-100 scale
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  disputedTrips: number;
  averageRating: number;
  lastCalculated: Date;
}

interface ReliabilityCalculationResult {
  success: boolean;
  score?: ReliabilityScore;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calculate reliability score for an orderer using live trip data
 */
async function calculateReliabilityScore(ordererId: string): Promise<ReliabilityCalculationResult> {
  try {
    // Look up the orderer to get their userId for the reliability score table
    const orderer = await db.orderer.findUnique({
      where: { id: ordererId },
      select: { id: true, userId: true }
    });

    if (!orderer) {
      return { success: false, error: `Orderer ${ordererId} not found` };
    }

    // Get all trips for this orderer
    const trips = await db.trip.findMany({
      where: {
        ordererId
      },
      select: {
        id: true,
        status: true,
        actualDeliveryAt: true,
        estimatedDeliveryAt: true,
        onTime: true
      }
    });

    if (trips.length === 0) {
      return {
        success: true,
        score: {
          ordererId,
          score: 50,
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          disputedTrips: 0,
          averageRating: 0,
          lastCalculated: new Date()
        }
      };
    }

    // Calculate metrics
    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'DELIVERED').length;
    const cancelledTrips = trips.filter(t => t.status === 'CANCELLED').length;

    const completionRate = totalTrips > 0 ? completedTrips / totalTrips : 0;
    const noShowRate = totalTrips > 0 ? cancelledTrips / totalTrips : 0;

    let onTimeDeliveries = 0;
    let lateDeliveries = 0;

    for (const trip of trips) {
      if (trip.status === 'DELIVERED') {
        if (trip.onTime === true) {
          onTimeDeliveries++;
        } else if (trip.onTime === false) {
          lateDeliveries++;
        }
      }
    }

    const disputedTrips = trips.filter(t => t.status === 'DISPUTED').length;

    // Score formula: 100 - (noShowRate×30) - ((1-completionRate)×25)
    const noShowPenalty = noShowRate * 30;
    const completionPenalty = (1 - completionRate) * 25;
    let score = 100 - noShowPenalty - completionPenalty;
    score = Math.max(0, Math.min(100, score));

    const reliabilityScore: ReliabilityScore = {
      ordererId,
      score: Math.round(score * 100) / 100,
      totalTrips,
      completedTrips,
      cancelledTrips,
      onTimeDeliveries,
      lateDeliveries,
      disputedTrips,
      averageRating: 0,
      lastCalculated: new Date()
    };

    return { success: true, score: reliabilityScore };

  } catch (error) {
    console.error('Calculate reliability score error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown reliability calculation error'
    };
  }
}

/**
 * Recalculate and update reliability score in database
 */
async function recalculateScore(ordererId: string): Promise<ReliabilityCalculationResult> {
  try {
    const result = await calculateReliabilityScore(ordererId);
    if (!result.success || !result.score) {
      return result;
    }

    // Get the orderer's userId for the schema's userId field
    const orderer = await db.orderer.findUnique({
      where: { id: ordererId },
      select: { userId: true }
    });

    if (!orderer) {
      return { success: false, error: `Orderer ${ordererId} not found` };
    }

    const completionRate = result.score.totalTrips > 0
      ? result.score.completedTrips / result.score.totalTrips
      : 1.0;
    const cancellationRate = result.score.totalTrips > 0
      ? result.score.cancelledTrips / result.score.totalTrips
      : 0.0;

    // Upsert the reliability score using the actual schema fields
    await db.ordererReliabilityScore.upsert({
      where: { userId: orderer.userId },
      update: {
        totalLoadsPosted: result.score.totalTrips,
        totalLoadsCompleted: result.score.completedTrips,
        totalLoadsCancelled: result.score.cancelledTrips,
        completionRate: completionRate,
        cancellationRate: cancellationRate,
        reliabilityScore: result.score.score,
        lastCalculatedAt: result.score.lastCalculated,
        lastOrderAt: new Date()
      },
      create: {
        userId: orderer.userId,
        totalLoadsPosted: result.score.totalTrips,
        totalLoadsCompleted: result.score.completedTrips,
        totalLoadsCancelled: result.score.cancelledTrips,
        completionRate: completionRate,
        cancellationRate: cancellationRate,
        reliabilityScore: result.score.score,
        lastCalculatedAt: result.score.lastCalculated,
        lastOrderAt: new Date()
      }
    });

    return result;

  } catch (error) {
    console.error('Recalculate score error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown score recalculation error'
    };
  }
}

/**
 * Get reliability score summary for an orderer
 */
async function getScoreSummary(ordererId: string): Promise<ReliabilityCalculationResult> {
  try {
    const orderer = await db.orderer.findUnique({
      where: { id: ordererId },
      select: { userId: true }
    });

    if (!orderer) {
      return { success: false, error: `Orderer ${ordererId} not found` };
    }

    const scoreRecord = await db.ordererReliabilityScore.findUnique({
      where: { userId: orderer.userId }
    });

    if (!scoreRecord) {
      return await calculateReliabilityScore(ordererId);
    }

    // Check if score is stale (older than 24 hours)
    if (scoreRecord.lastCalculatedAt) {
      const hoursSinceCalculation = (Date.now() - scoreRecord.lastCalculatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCalculation > 24) {
        recalculateScore(ordererId).catch(err =>
          console.error('Background reliability recalculation failed:', err)
        );
      }
    }

    const score: ReliabilityScore = {
      ordererId,
      score: Number(scoreRecord.reliabilityScore),
      totalTrips: scoreRecord.totalLoadsPosted,
      completedTrips: scoreRecord.totalLoadsCompleted,
      cancelledTrips: scoreRecord.totalLoadsCancelled,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      disputedTrips: 0,
      averageRating: 0,
      lastCalculated: scoreRecord.lastCalculatedAt ?? new Date()
    };

    return { success: true, score };

  } catch (error) {
    console.error('Get score summary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown score retrieval error'
    };
  }
}

/**
 * Get reliability tier for scoring (used by WDM service)
 */
async function getReliabilityTier(ordererId: string): Promise<'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'NEW'> {
  try {
    const result = await getScoreSummary(ordererId);
    if (!result.success || !result.score) {
      return 'NEW';
    }

    const { score, totalTrips } = result.score;
    if (totalTrips === 0) return 'NEW';

    if (score >= 90) return 'PLATINUM';
    if (score >= 75) return 'GOLD';
    if (score >= 60) return 'SILVER';
    if (score >= 40) return 'BRONZE';
    return 'NEW';

  } catch (error) {
    console.error('Get reliability tier error:', error);
    return 'NEW';
  }
}

/**
 * Get a simple reliability score number (0-100) for WDM weighting
 */
async function getReliabilityScore(ordererId: string): Promise<number> {
  try {
    const result = await getScoreSummary(ordererId);
    return result.success && result.score ? result.score.score : 50;
  } catch {
    return 50;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE OBJECT
// ════════════════════════════════════════════════════════════════════════════

export const ordererReliabilityService = {
  calculateReliabilityScore,
  recalculateScore,
  getScoreSummary,
  getReliabilityTier,
  getReliabilityScore
};
