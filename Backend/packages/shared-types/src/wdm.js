"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WDMWeightsSchema = exports.BACKHAUL_CONFIDENCE_THRESHOLDS = exports.DEFAULT_WDM_WEIGHTS = void 0;
exports.validateWeights = validateWeights;
exports.calculateBackhaulConfidence = calculateBackhaulConfidence;
exports.getConfidenceScore = getConfidenceScore;
const zod_1 = require("zod");
// WDM Weights configuration
exports.DEFAULT_WDM_WEIGHTS = {
    urgency: 0.20,
    corridorDensity: 0.15,
    backhaul: 0.10,
    margin: 0.20,
    driverTrust: 0.15,
    fleetTrust: 0.10,
    liquidityDelta: 0.08,
    subsidy: 0.02,
};
// Backhaul confidence thresholds
exports.BACKHAUL_CONFIDENCE_THRESHOLDS = {
    LOW: { min: 0, max: 0.30, penaltyMultiplier: 1.20 },
    MEDIUM: { min: 0.30, max: 0.60, penaltyMultiplier: 1.10 },
    HIGH: { min: 0.60, max: 0.85, penaltyMultiplier: 1.05 },
    FULL: { min: 0.85, max: 1.00, penaltyMultiplier: 1.00 },
};
// WDM Weights Schema
exports.WDMWeightsSchema = zod_1.z.object({
    urgency: zod_1.z.number().min(0).max(1),
    corridorDensity: zod_1.z.number().min(0).max(1),
    backhaul: zod_1.z.number().min(0).max(1),
    margin: zod_1.z.number().min(0).max(1),
    driverTrust: zod_1.z.number().min(0).max(1),
    fleetTrust: zod_1.z.number().min(0).max(1),
    liquidityDelta: zod_1.z.number().min(0).max(1),
    subsidy: zod_1.z.number().min(0).max(1),
});
// Validation function
function validateWeights(weights) {
    const values = Object.values(weights);
    const sum = values.reduce((a, b) => a + b, 0);
    return sum >= 0.99 && sum <= 1.01;
}
// Calculate backhaul confidence level
function calculateBackhaulConfidence(historicalTrips, successRate) {
    const score = historicalTrips * successRate;
    if (score < 5)
        return 'LOW';
    if (score < 20)
        return 'MEDIUM';
    if (score < 50)
        return 'HIGH';
    return 'FULL';
}
// Get confidence score from level
function getConfidenceScore(level) {
    const scores = { LOW: 0.2, MEDIUM: 0.45, HIGH: 0.7, FULL: 0.9 };
    return scores[level];
}
//# sourceMappingURL=wdm.js.map