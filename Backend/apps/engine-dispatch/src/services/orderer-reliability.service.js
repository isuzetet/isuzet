"use strict";
/**
 * ISUZET Orderer Reliability Service
 * Calculates and tracks orderer reliability scores for better matching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordererReliabilityService = void 0;
const shared_db_1 = require("@ruit/shared-db");
// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════
/**
 * Reliability scoring formula from blueprint:
 * 100 - (noShowRate×30) - ((1-completionRate)×25) - min(readiness/10, 15)
 *
 * Where:
 * - noShowRate = cancelled trips / total trips
 * - completionRate = completed trips / total trips
 * - readiness = average driver rating (1-5 scale, converted to 0-50)
 */
// ════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════
/**
 * Calculate reliability score for an orderer
 */
async function calculateReliabilityScore(ordererId) {
    try {
        // Get all trips for this orderer
        const trips = await shared_db_1.prisma.trip.findMany({
            where: {
                load: {
                    ordererId
                }
            },
            include: {
                load: true,
                assignment: {
                    include: {
                        driver: true
                    }
                }
            }
        });
        if (trips.length === 0) {
            // New orderer with no trips
            return {
                success: true,
                score: {
                    ordererId,
                    score: 50, // Neutral starting score
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
        // Calculate rates
        const completionRate = totalTrips > 0 ? completedTrips / totalTrips : 0;
        const noShowRate = totalTrips > 0 ? cancelledTrips / totalTrips : 0;
        // Calculate average rating (readiness score)
        const ratings = trips
            .filter(t => t.driverRating !== null)
            .map(t => t.driverRating);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
        // Convert rating to readiness (1-5 scale to 0-50 for the formula)
        const readiness = averageRating * 10; // 1-5 becomes 10-50
        // Apply blueprint formula: 100 - (noShowRate×30) - ((1-completionRate)×25) - min(readiness/10, 15)
        const noShowPenalty = noShowRate * 30;
        const completionPenalty = (1 - completionRate) * 25;
        const readinessPenalty = Math.min(readiness / 10, 15);
        let score = 100 - noShowPenalty - completionPenalty - readinessPenalty;
        // Clamp to 0-100 range
        score = Math.max(0, Math.min(100, score));
        // Calculate on-time deliveries for reporting (not used in score)
        let onTimeDeliveries = 0;
        let lateDeliveries = 0;
        let totalDeliveries = 0;
        for (const trip of trips) {
            if (trip.status === 'DELIVERED' && trip.actualDeliveryTime && trip.expectedDeliveryTime) {
                totalDeliveries++;
                const deliveryDiff = trip.actualDeliveryTime.getTime() - trip.expectedDeliveryTime.getTime();
                const hoursDiff = deliveryDiff / (1000 * 60 * 60);
                if (Math.abs(hoursDiff) <= 2) { // Within 2 hours
                    onTimeDeliveries++;
                }
                else if (hoursDiff > 2) {
                    lateDeliveries++;
                }
            }
        }
        // Count disputed trips for reporting
        const disputedTrips = trips.filter(t => t.hasDispute === true).length;
        const reliabilityScore = {
            ordererId,
            score: Math.round(score * 100) / 100, // Round to 2 decimal places
            totalTrips,
            completedTrips,
            cancelledTrips,
            onTimeDeliveries,
            lateDeliveries,
            disputedTrips,
            averageRating: Math.round(averageRating * 100) / 100,
            lastCalculated: new Date()
        };
        return {
            success: true,
            score: reliabilityScore
        };
    }
    catch (error) {
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
async function recalculateScore(ordererId) {
    try {
        const result = await calculateReliabilityScore(ordererId);
        if (!result.success || !result.score) {
            return result;
        }
        // Upsert the reliability score
        await shared_db_1.prisma.ordererReliabilityScore.upsert({
            where: { ordererId },
            update: {
                score: result.score.score,
                totalTrips: result.score.totalTrips,
                completedTrips: result.score.completedTrips,
                cancelledTrips: result.score.cancelledTrips,
                onTimeDeliveries: result.score.onTimeDeliveries,
                lateDeliveries: result.score.lateDeliveries,
                disputedTrips: result.score.disputedTrips,
                averageRating: result.score.averageRating,
                lastCalculated: result.score.lastCalculated
            },
            create: {
                ordererId,
                score: result.score.score,
                totalTrips: result.score.totalTrips,
                completedTrips: result.score.completedTrips,
                cancelledTrips: result.score.cancelledTrips,
                onTimeDeliveries: result.score.onTimeDeliveries,
                lateDeliveries: result.score.lateDeliveries,
                disputedTrips: result.score.disputedTrips,
                averageRating: result.score.averageRating,
                lastCalculated: result.score.lastCalculated
            }
        });
        return result;
    }
    catch (error) {
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
async function getScoreSummary(ordererId) {
    try {
        const scoreRecord = await shared_db_1.prisma.ordererReliabilityScore.findUnique({
            where: { ordererId }
        });
        if (!scoreRecord) {
            // Calculate on-demand if not cached
            return await calculateReliabilityScore(ordererId);
        }
        // Check if score is stale (older than 24 hours)
        const hoursSinceCalculation = (Date.now() - scoreRecord.lastCalculated.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCalculation > 24) {
            // Recalculate in background
            recalculateScore(ordererId).catch(err => console.error('Background reliability recalculation failed:', err));
        }
        const score = {
            ordererId: scoreRecord.ordererId,
            score: Number(scoreRecord.score),
            totalTrips: scoreRecord.totalTrips,
            completedTrips: scoreRecord.completedTrips,
            cancelledTrips: scoreRecord.cancelledTrips,
            onTimeDeliveries: scoreRecord.onTimeDeliveries,
            lateDeliveries: scoreRecord.lateDeliveries,
            disputedTrips: scoreRecord.disputedTrips,
            averageRating: Number(scoreRecord.averageRating),
            lastCalculated: scoreRecord.lastCalculated
        };
        return {
            success: true,
            score
        };
    }
    catch (error) {
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
async function getReliabilityTier(ordererId) {
    try {
        const result = await getScoreSummary(ordererId);
        if (!result.success || !result.score) {
            return 'NEW'; // Default to NEW for unknown orderers
        }
        const score = result.score.score;
        const totalTrips = result.score.totalTrips;
        // NEW tier for orderers with no trips
        if (totalTrips === 0) {
            return 'NEW';
        }
        // Tier thresholds based on score
        if (score >= 90)
            return 'PLATINUM';
        if (score >= 80)
            return 'GOLD';
        if (score >= 70)
            return 'SILVER';
        if (score >= 60)
            return 'BRONZE';
        return 'NEW';
    }
    catch (error) {
        console.error('Get reliability tier error:', error);
        return 'NEW';
    }
}
// ════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE OBJECT
// ════════════════════════════════════════════════════════════════════════════
exports.ordererReliabilityService = {
    calculateReliabilityScore,
    recalculateScore,
    getScoreSummary,
    getReliabilityTier
};
//# sourceMappingURL=orderer-reliability.service.js.map