/**
 * RUIT CBE — Complete Trust Scoring Types
 * Includes Decay-Weighted Model from Final Edit 1 + COD Discrepancy from Final Edit 2
 */
import { z } from 'zod';
/**
 * DECAY MODEL: All behavioral trust inputs use exponential decay.
 * Recent events weight heavily; old events fade naturally over time.
 * Lambda controls decay speed:
 * - lambda = 0.023 → half-life ~30 days (fast-moving: disputes, cancellations)
 * - lambda = 0.008 → half-life ~90 days (slower: incidents)
 * - lambda = 0.003 → half-life ~230 days (structural: deviation rate)
 */
export declare const TrustDecayConfigSchema: z.ZodObject<{
    dispute_lambda: z.ZodDefault<z.ZodNumber>;
    incident_lambda: z.ZodDefault<z.ZodNumber>;
    deviation_lambda: z.ZodDefault<z.ZodNumber>;
    cancel_lambda: z.ZodDefault<z.ZodNumber>;
    dispute_penalty: z.ZodDefault<z.ZodNumber>;
    incident_penalty: z.ZodDefault<z.ZodNumber>;
    deviation_penalty: z.ZodDefault<z.ZodNumber>;
    cancel_penalty: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    dispute_lambda: number;
    incident_lambda: number;
    deviation_lambda: number;
    cancel_lambda: number;
    dispute_penalty: number;
    incident_penalty: number;
    deviation_penalty: number;
    cancel_penalty: number;
}, {
    dispute_lambda?: number | undefined;
    incident_lambda?: number | undefined;
    deviation_lambda?: number | undefined;
    cancel_lambda?: number | undefined;
    dispute_penalty?: number | undefined;
    incident_penalty?: number | undefined;
    deviation_penalty?: number | undefined;
    cancel_penalty?: number | undefined;
}>;
export type TrustDecayConfig = z.infer<typeof TrustDecayConfigSchema>;
export interface TrustEvent {
    occurred_at: Date;
    severity_weight: number;
}
/**
 * DRIVER WEIGHTS (Final Edit 2 - includes codDisc)
 * Rebalanced to include COD discrepancy tracking
 * Total = 1.00
 */
export declare const DriverWeights: {
    readonly onTime: 0.28;
    readonly dispute: 0.18;
    readonly deviation: 0.2;
    readonly cancel: 0.14;
    readonly incident: 0.1;
    readonly anomaly: 0.05;
    readonly codDisc: 0.05;
};
/**
 * FLEET OWNER WEIGHTS
 * Total = 1.00
 */
export declare const FleetOwnerWeights: {
    readonly onTime: 0.25;
    readonly dispute: 0.2;
    readonly deviation: 0.1;
    readonly cancel: 0.2;
    readonly payment: 0.2;
    readonly incident: 0.05;
};
export declare const DriverWeightSetSchema: z.ZodObject<{
    onTime: z.ZodNumber;
    dispute: z.ZodNumber;
    deviation: z.ZodNumber;
    cancel: z.ZodNumber;
    incident: z.ZodNumber;
    anomaly: z.ZodNumber;
    codDisc: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    incident: number;
    onTime: number;
    dispute: number;
    deviation: number;
    cancel: number;
    anomaly: number;
    codDisc: number;
}, {
    incident: number;
    onTime: number;
    dispute: number;
    deviation: number;
    cancel: number;
    anomaly: number;
    codDisc: number;
}>;
export declare const FleetOwnerWeightSetSchema: z.ZodObject<{
    onTime: z.ZodNumber;
    dispute: z.ZodNumber;
    deviation: z.ZodNumber;
    cancel: z.ZodNumber;
    payment: z.ZodNumber;
    incident: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    incident: number;
    onTime: number;
    dispute: number;
    deviation: number;
    cancel: number;
    payment: number;
}, {
    incident: number;
    onTime: number;
    dispute: number;
    deviation: number;
    cancel: number;
    payment: number;
}>;
export type DriverWeightSet = z.infer<typeof DriverWeightSetSchema>;
export type FleetOwnerWeightSet = z.infer<typeof FleetOwnerWeightSetSchema>;
export declare const TrustTierConfigSchema: z.ZodObject<{
    tier2_min_trips: z.ZodDefault<z.ZodNumber>;
    tier3_min_trips: z.ZodDefault<z.ZodNumber>;
    tier4_min_trips: z.ZodDefault<z.ZodNumber>;
    tier5_min_trips: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tier2_min_trips: number;
    tier3_min_trips: number;
    tier4_min_trips: number;
    tier5_min_trips: number;
}, {
    tier2_min_trips?: number | undefined;
    tier3_min_trips?: number | undefined;
    tier4_min_trips?: number | undefined;
    tier5_min_trips?: number | undefined;
}>;
export type TrustTierConfig = z.infer<typeof TrustTierConfigSchema>;
export declare const RegionAccessConfigSchema: z.ZodObject<{
    tier0: z.ZodObject<{
        corridors: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        corridors: number;
    }, {
        corridors?: number | undefined;
    }>;
    tier1: z.ZodObject<{
        corridors: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        corridors: number;
    }, {
        corridors?: number | undefined;
    }>;
    tier2: z.ZodObject<{
        corridors: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        corridors: number;
    }, {
        corridors?: number | undefined;
    }>;
    tier3: z.ZodObject<{
        corridors: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        corridors: number;
    }, {
        corridors?: number | undefined;
    }>;
    tier4: z.ZodObject<{
        corridors: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        corridors: number;
    }, {
        corridors?: number | undefined;
    }>;
    tier5: z.ZodObject<{
        corridors: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        corridors: number;
    }, {
        corridors?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    tier0: {
        corridors: number;
    };
    tier1: {
        corridors: number;
    };
    tier2: {
        corridors: number;
    };
    tier3: {
        corridors: number;
    };
    tier4: {
        corridors: number;
    };
    tier5: {
        corridors: number;
    };
}, {
    tier0: {
        corridors?: number | undefined;
    };
    tier1: {
        corridors?: number | undefined;
    };
    tier2: {
        corridors?: number | undefined;
    };
    tier3: {
        corridors?: number | undefined;
    };
    tier4: {
        corridors?: number | undefined;
    };
    tier5: {
        corridors?: number | undefined;
    };
}>;
export type RegionAccessConfig = z.infer<typeof RegionAccessConfigSchema>;
export interface TrustScoreBreakdown {
    entity_id: string;
    entity_type: 'DRIVER' | 'FLEET_OWNER';
    trust_score: number;
    trust_tier: number;
    component_scores: {
        onTimeScore: number;
        disputeScore: number;
        deviationScore: number;
        cancelScore: number;
        incidentScore: number;
        anomalyScore: number;
        codDiscScore?: number;
        paymentScore?: number;
    };
    weight_values: DriverWeightSet | FleetOwnerWeightSet;
    decay_parameters: TrustDecayConfig;
    calculation_timestamp: string;
}
export interface PublicTrustInfo {
    trust_score: number;
    trust_tier: number;
    payout_speed: string;
}
export interface FullTrustBreakdown extends TrustScoreBreakdown {
    recent_events: TrustEvent[];
    trip_count: number;
    days_since_first_trip: number;
    fraud_flags_active: number;
}
/**
 * Decay-weighted score calculation
 * Used by computeTrustScore in engine-identity
 */
export declare function calculateDecayWeightedScore(events: TrustEvent[], lambda: number, penaltyPerEvent: number): number;
/**
 * Compute tier from score and trip constraints
 * Implements cold start rule from Amendment 2 C5
 */
export declare function computeTierFromScore(score: number, tripsCompleted: number, tierConfig: TrustTierConfig): number;
export declare const TrustWeightsSchema: z.ZodObject<{
    driver: z.ZodObject<{
        onTimeArrival: z.ZodNumber;
        podQuality: z.ZodNumber;
        disputeRate: z.ZodNumber;
        cancelRate: z.ZodNumber;
        idlePattern: z.ZodNumber;
        backhaulRatio: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
    }, {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
    }>;
    fleet_owner: z.ZodObject<{
        onTimeAcceptance: z.ZodNumber;
        loadAccuracy: z.ZodNumber;
        paymentReliability: z.ZodNumber;
        disputeRate: z.ZodNumber;
        truckReadiness: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
    }, {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
    }>;
}, "strip", z.ZodTypeAny, {
    driver: {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
    };
    fleet_owner: {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
    };
}, {
    driver: {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
    };
    fleet_owner: {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
    };
}>;
export type TrustWeights = z.infer<typeof TrustWeightsSchema>;
export declare const DecayConfigSchema: z.ZodObject<{
    dispute_lambda: z.ZodNumber;
    incident_lambda: z.ZodNumber;
    deviation_lambda: z.ZodNumber;
    cancel_lambda: z.ZodNumber;
    time_unit_days: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    dispute_lambda: number;
    incident_lambda: number;
    deviation_lambda: number;
    cancel_lambda: number;
    time_unit_days: number;
}, {
    dispute_lambda: number;
    incident_lambda: number;
    deviation_lambda: number;
    cancel_lambda: number;
    time_unit_days: number;
}>;
export type DecayConfig = z.infer<typeof DecayConfigSchema>;
export declare const TrustFactorScoresSchema: z.ZodObject<{
    driver: z.ZodObject<{
        onTimeArrival: z.ZodNumber;
        podQuality: z.ZodNumber;
        disputeRate: z.ZodNumber;
        cancelRate: z.ZodNumber;
        idlePattern: z.ZodNumber;
        backhaulRatio: z.ZodNumber;
        rawComposite: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
        rawComposite: number;
    }, {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
        rawComposite: number;
    }>;
    fleet_owner: z.ZodObject<{
        onTimeAcceptance: z.ZodNumber;
        loadAccuracy: z.ZodNumber;
        paymentReliability: z.ZodNumber;
        disputeRate: z.ZodNumber;
        truckReadiness: z.ZodNumber;
        rawComposite: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
        rawComposite: number;
    }, {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
        rawComposite: number;
    }>;
}, "strip", z.ZodTypeAny, {
    driver: {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
        rawComposite: number;
    };
    fleet_owner: {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
        rawComposite: number;
    };
}, {
    driver: {
        onTimeArrival: number;
        podQuality: number;
        disputeRate: number;
        cancelRate: number;
        idlePattern: number;
        backhaulRatio: number;
        rawComposite: number;
    };
    fleet_owner: {
        disputeRate: number;
        onTimeAcceptance: number;
        loadAccuracy: number;
        paymentReliability: number;
        truckReadiness: number;
        rawComposite: number;
    };
}>;
export type TrustFactorScores = z.infer<typeof TrustFactorScoresSchema>;
//# sourceMappingURL=trust.d.ts.map