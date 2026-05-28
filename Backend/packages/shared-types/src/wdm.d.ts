import { z } from 'zod';
export declare const DEFAULT_WDM_WEIGHTS: {
    urgency: number;
    corridorDensity: number;
    backhaul: number;
    margin: number;
    driverTrust: number;
    fleetTrust: number;
    liquidityDelta: number;
    subsidy: number;
};
export declare const BACKHAUL_CONFIDENCE_THRESHOLDS: {
    LOW: {
        min: number;
        max: number;
        penaltyMultiplier: number;
    };
    MEDIUM: {
        min: number;
        max: number;
        penaltyMultiplier: number;
    };
    HIGH: {
        min: number;
        max: number;
        penaltyMultiplier: number;
    };
    FULL: {
        min: number;
        max: number;
        penaltyMultiplier: number;
    };
};
export declare const WDMWeightsSchema: z.ZodObject<{
    urgency: z.ZodNumber;
    corridorDensity: z.ZodNumber;
    backhaul: z.ZodNumber;
    margin: z.ZodNumber;
    driverTrust: z.ZodNumber;
    fleetTrust: z.ZodNumber;
    liquidityDelta: z.ZodNumber;
    subsidy: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    urgency: number;
    corridorDensity: number;
    backhaul: number;
    margin: number;
    driverTrust: number;
    fleetTrust: number;
    liquidityDelta: number;
    subsidy: number;
}, {
    urgency: number;
    corridorDensity: number;
    backhaul: number;
    margin: number;
    driverTrust: number;
    fleetTrust: number;
    liquidityDelta: number;
    subsidy: number;
}>;
export type WDMWeights = z.infer<typeof WDMWeightsSchema>;
export interface DecisionTraceInput {
    loadId: string;
    urgencyScore: number;
    corridorDensityScore: number;
    backhaulPotential: number;
    marginEstimate: number;
    driverTrustScore: number;
    fleetTrustScore: number;
    liquidityDeltaETB: number;
    subsidyEligible: boolean;
}
export interface WDMInputVariables {
    urgencyScore: number;
    corridorDensityScore: number;
    backhaulPotential: number;
    marginEstimate: number;
    driverTrustScore: number;
    fleetTrustScore: number;
    liquidityDelta: number;
    subsidyEligibility: boolean;
}
export interface FactorScores {
    urgency: number;
    corridorDensity: number;
    backhaul: number;
    margin: number;
    driverTrust: number;
    fleetTrust: number;
    liquidityDelta: number;
    subsidy: number;
}
export interface CandidateScore {
    candidateId: string;
    candidateType: 'DRIVER' | 'FLEET_OWNER';
    compositeScore: number;
    factorBreakdown: FactorScores;
    backhaulConfidence: number;
    rank: number;
}
export interface DecisionTraceRecord {
    decisionTraceId: string;
    assignmentId: string;
    strategyVersionId: string;
    rawWdmScore: number;
    confidencePenaltyApplied: number;
    finalAdjustedScore: number;
    ranksCalculated: number;
    backhaulConfidenceLevel: BackhaulConfidenceLevel;
    createdAt: Date;
}
export interface WDMCalculationResult {
    compositeScore: number;
    factorScores: FactorScores;
    confidenceLevel: BackhaulConfidenceLevel;
    adjustedScore: number;
    rank: number;
}
export type BackhaulConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';
export interface RiskAdjustedScore {
    baseScore: number;
    riskMultiplier: number;
    adjustedScore: number;
}
export declare function validateWeights(weights: Partial<WDMWeights>): boolean;
export declare function calculateBackhaulConfidence(historicalTrips: number, successRate: number): BackhaulConfidenceLevel;
export declare function getConfidenceScore(level: BackhaulConfidenceLevel): number;
//# sourceMappingURL=wdm.d.ts.map