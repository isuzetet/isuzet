"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustFactorScoresSchema = exports.DecayConfigSchema = exports.TrustWeightsSchema = exports.RegionAccessConfigSchema = exports.TrustTierConfigSchema = exports.FleetOwnerWeightSetSchema = exports.DriverWeightSetSchema = exports.FleetOwnerWeights = exports.DriverWeights = exports.TrustDecayConfigSchema = void 0;
exports.calculateDecayWeightedScore = calculateDecayWeightedScore;
exports.computeTierFromScore = computeTierFromScore;
/**
 * RUIT CBE — Complete Trust Scoring Types
 * Includes Decay-Weighted Model from Final Edit 1 + COD Discrepancy from Final Edit 2
 */
const zod_1 = require("zod");
/**
 * DECAY MODEL: All behavioral trust inputs use exponential decay.
 * Recent events weight heavily; old events fade naturally over time.
 * Lambda controls decay speed:
 * - lambda = 0.023 → half-life ~30 days (fast-moving: disputes, cancellations)
 * - lambda = 0.008 → half-life ~90 days (slower: incidents)
 * - lambda = 0.003 → half-life ~230 days (structural: deviation rate)
 */
// Trust decay configuration from strategy_versions.threshold_set.trust_decay
exports.TrustDecayConfigSchema = zod_1.z.object({
    dispute_lambda: zod_1.z.number().default(0.023),
    incident_lambda: zod_1.z.number().default(0.008),
    deviation_lambda: zod_1.z.number().default(0.003),
    cancel_lambda: zod_1.z.number().default(0.023),
    dispute_penalty: zod_1.z.number().default(15),
    incident_penalty: zod_1.z.number().default(10),
    deviation_penalty: zod_1.z.number().default(5),
    cancel_penalty: zod_1.z.number().default(8),
});
/**
 * DRIVER WEIGHTS (Final Edit 2 - includes codDisc)
 * Rebalanced to include COD discrepancy tracking
 * Total = 1.00
 */
exports.DriverWeights = {
    onTime: 0.28, // -0.02 from original 0.30
    dispute: 0.18, // -0.02 from original 0.20
    deviation: 0.20, // unchanged
    cancel: 0.14, // -0.01 from original 0.15
    incident: 0.10, // unchanged
    anomaly: 0.05, // unchanged
    codDisc: 0.05, // NEW: COD discrepancy rate
};
/**
 * FLEET OWNER WEIGHTS
 * Total = 1.00
 */
exports.FleetOwnerWeights = {
    onTime: 0.25,
    dispute: 0.20,
    deviation: 0.10,
    cancel: 0.20,
    payment: 0.20,
    incident: 0.05,
};
// Weight set structure
exports.DriverWeightSetSchema = zod_1.z.object({
    onTime: zod_1.z.number(),
    dispute: zod_1.z.number(),
    deviation: zod_1.z.number(),
    cancel: zod_1.z.number(),
    incident: zod_1.z.number(),
    anomaly: zod_1.z.number(),
    codDisc: zod_1.z.number(),
});
exports.FleetOwnerWeightSetSchema = zod_1.z.object({
    onTime: zod_1.z.number(),
    dispute: zod_1.z.number(),
    deviation: zod_1.z.number(),
    cancel: zod_1.z.number(),
    payment: zod_1.z.number(),
    incident: zod_1.z.number(),
});
// Trust tier configuration
exports.TrustTierConfigSchema = zod_1.z.object({
    tier2_min_trips: zod_1.z.number().default(3),
    tier3_min_trips: zod_1.z.number().default(10),
    tier4_min_trips: zod_1.z.number().default(25),
    tier5_min_trips: zod_1.z.number().default(100),
});
// Region access configuration
exports.RegionAccessConfigSchema = zod_1.z.object({
    tier0: zod_1.z.object({ corridors: zod_1.z.number().default(1) }), // home only
    tier1: zod_1.z.object({ corridors: zod_1.z.number().default(2) }), // home + 1 adjacent
    tier2: zod_1.z.object({ corridors: zod_1.z.number().default(4) }), // home + 3 adjacent
    tier3: zod_1.z.object({ corridors: zod_1.z.number().default(999) }), // all
    tier4: zod_1.z.object({ corridors: zod_1.z.number().default(999) }), // all
    tier5: zod_1.z.object({ corridors: zod_1.z.number().default(999) }), // all
});
/**
 * Decay-weighted score calculation
 * Used by computeTrustScore in engine-identity
 */
function calculateDecayWeightedScore(events, lambda, penaltyPerEvent) {
    const now = Date.now();
    const totalPenalty = events.reduce((sum, e) => {
        const daysSince = (now - e.occurred_at.getTime()) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.exp(-lambda * daysSince);
        return sum + penaltyPerEvent * e.severity_weight * decayFactor;
    }, 0);
    return Math.max(0, 100 - totalPenalty);
}
/**
 * Compute tier from score and trip constraints
 * Implements cold start rule from Amendment 2 C5
 */
function computeTierFromScore(score, tripsCompleted, tierConfig) {
    const baseTier = score >= 90 ? 5 :
        score >= 80 ? 4 :
            score >= 70 ? 3 :
                score >= 55 ? 2 :
                    score >= 40 ? 1 :
                        0;
    // Apply trip minimums
    if (tripsCompleted === 0)
        return Math.min(baseTier, 1);
    if (tripsCompleted < tierConfig.tier2_min_trips)
        return Math.min(baseTier, 1);
    if (tripsCompleted < tierConfig.tier3_min_trips)
        return Math.min(baseTier, 2);
    if (tripsCompleted < tierConfig.tier4_min_trips)
        return Math.min(baseTier, 3);
    if (tripsCompleted < tierConfig.tier5_min_trips)
        return Math.min(baseTier, 4);
    return baseTier;
}
// Legacy exports for backward compatibility
exports.TrustWeightsSchema = zod_1.z.object({
    driver: zod_1.z.object({
        onTimeArrival: zod_1.z.number(),
        podQuality: zod_1.z.number(),
        disputeRate: zod_1.z.number(),
        cancelRate: zod_1.z.number(),
        idlePattern: zod_1.z.number(),
        backhaulRatio: zod_1.z.number(),
    }),
    fleet_owner: zod_1.z.object({
        onTimeAcceptance: zod_1.z.number(),
        loadAccuracy: zod_1.z.number(),
        paymentReliability: zod_1.z.number(),
        disputeRate: zod_1.z.number(),
        truckReadiness: zod_1.z.number(),
    }),
});
exports.DecayConfigSchema = zod_1.z.object({
    dispute_lambda: zod_1.z.number(),
    incident_lambda: zod_1.z.number(),
    deviation_lambda: zod_1.z.number(),
    cancel_lambda: zod_1.z.number(),
    time_unit_days: zod_1.z.number(),
});
exports.TrustFactorScoresSchema = zod_1.z.object({
    driver: zod_1.z.object({
        onTimeArrival: zod_1.z.number(),
        podQuality: zod_1.z.number(),
        disputeRate: zod_1.z.number(),
        cancelRate: zod_1.z.number(),
        idlePattern: zod_1.z.number(),
        backhaulRatio: zod_1.z.number(),
        rawComposite: zod_1.z.number(),
    }),
    fleet_owner: zod_1.z.object({
        onTimeAcceptance: zod_1.z.number(),
        loadAccuracy: zod_1.z.number(),
        paymentReliability: zod_1.z.number(),
        disputeRate: zod_1.z.number(),
        truckReadiness: zod_1.z.number(),
        rawComposite: zod_1.z.number(),
    }),
});
//# sourceMappingURL=trust.js.map