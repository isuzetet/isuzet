/**
 * ISUZET Orderer Reliability Service
 * Calculates and tracks orderer reliability scores for better matching
 */
interface ReliabilityScore {
    ordererId: string;
    score: number;
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
/**
 * Reliability scoring formula from blueprint:
 * 100 - (noShowRate×30) - ((1-completionRate)×25) - min(readiness/10, 15)
 *
 * Where:
 * - noShowRate = cancelled trips / total trips
 * - completionRate = completed trips / total trips
 * - readiness = average driver rating (1-5 scale, converted to 0-50)
 */
/**
 * Calculate reliability score for an orderer
 */
declare function calculateReliabilityScore(ordererId: string): Promise<ReliabilityCalculationResult>;
/**
 * Recalculate and update reliability score in database
 */
declare function recalculateScore(ordererId: string): Promise<ReliabilityCalculationResult>;
/**
 * Get reliability score summary for an orderer
 */
declare function getScoreSummary(ordererId: string): Promise<ReliabilityCalculationResult>;
/**
 * Get reliability tier for scoring (used by WDM service)
 */
declare function getReliabilityTier(ordererId: string): Promise<'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'NEW'>;
export declare const ordererReliabilityService: {
    calculateReliabilityScore: typeof calculateReliabilityScore;
    recalculateScore: typeof recalculateScore;
    getScoreSummary: typeof getScoreSummary;
    getReliabilityTier: typeof getReliabilityTier;
};
export {};
//# sourceMappingURL=orderer-reliability.service.d.ts.map