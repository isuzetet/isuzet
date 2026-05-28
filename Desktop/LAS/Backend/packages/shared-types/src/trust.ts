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

// Trust decay configuration from strategy_versions.threshold_set.trust_decay
export const TrustDecayConfigSchema = z.object({
  dispute_lambda: z.number().default(0.023),
  incident_lambda: z.number().default(0.008),
  deviation_lambda: z.number().default(0.003),
  cancel_lambda: z.number().default(0.023),
  dispute_penalty: z.number().default(15),
  incident_penalty: z.number().default(10),
  deviation_penalty: z.number().default(5),
  cancel_penalty: z.number().default(8),
});

export type TrustDecayConfig = z.infer<typeof TrustDecayConfigSchema>;

// Event for decay calculation
export interface TrustEvent {
  occurred_at: Date;
  severity_weight: number;
}

/**
 * DRIVER WEIGHTS (Final Edit 2 - includes codDisc)
 * Rebalanced to include COD discrepancy tracking
 * Total = 1.00
 */
export const DriverWeights = {
  onTime: 0.28,      // -0.02 from original 0.30
  dispute: 0.18,     // -0.02 from original 0.20
  deviation: 0.20,   // unchanged
  cancel: 0.14,      // -0.01 from original 0.15
  incident: 0.10,    // unchanged
  anomaly: 0.05,     // unchanged
  codDisc: 0.05,     // NEW: COD discrepancy rate
} as const;

/**
 * FLEET OWNER WEIGHTS
 * Total = 1.00
 */
export const FleetOwnerWeights = {
  onTime: 0.25,
  dispute: 0.20,
  deviation: 0.10,
  cancel: 0.20,
  payment: 0.20,
  incident: 0.05,
} as const;

// Weight set structure
export const DriverWeightSetSchema = z.object({
  onTime: z.number(),
  dispute: z.number(),
  deviation: z.number(),
  cancel: z.number(),
  incident: z.number(),
  anomaly: z.number(),
  codDisc: z.number(),
});

export const FleetOwnerWeightSetSchema = z.object({
  onTime: z.number(),
  dispute: z.number(),
  deviation: z.number(),
  cancel: z.number(),
  payment: z.number(),
  incident: z.number(),
});

export type DriverWeightSet = z.infer<typeof DriverWeightSetSchema>;
export type FleetOwnerWeightSet = z.infer<typeof FleetOwnerWeightSetSchema>;

// Trust tier configuration
export const TrustTierConfigSchema = z.object({
  tier2_min_trips: z.number().default(3),
  tier3_min_trips: z.number().default(10),
  tier4_min_trips: z.number().default(25),
  tier5_min_trips: z.number().default(100),
});

export type TrustTierConfig = z.infer<typeof TrustTierConfigSchema>;

// Region access configuration
export const RegionAccessConfigSchema = z.object({
  tier0: z.object({ corridors: z.number().default(1) }), // home only
  tier1: z.object({ corridors: z.number().default(2) }), // home + 1 adjacent
  tier2: z.object({ corridors: z.number().default(4) }), // home + 3 adjacent
  tier3: z.object({ corridors: z.number().default(999) }), // all
  tier4: z.object({ corridors: z.number().default(999) }), // all
  tier5: z.object({ corridors: z.number().default(999) }), // all
});

export type RegionAccessConfig = z.infer<typeof RegionAccessConfigSchema>;

// Trust score breakdown response
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
    codDiscScore?: number; // DRIVER only
    paymentScore?: number; // FLEET_OWNER only
  };
  weight_values: DriverWeightSet | FleetOwnerWeightSet;
  decay_parameters: TrustDecayConfig;
  calculation_timestamp: string;
}

// Public trust info (non-OPS response)
export interface PublicTrustInfo {
  trust_score: number;
  trust_tier: number;
  payout_speed: string;
}

// Full trust breakdown (OPS only)
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
export function calculateDecayWeightedScore(
  events: TrustEvent[],
  lambda: number,
  penaltyPerEvent: number
): number {
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
export function computeTierFromScore(
  score: number,
  tripsCompleted: number,
  tierConfig: TrustTierConfig
): number {
  const baseTier =
    score >= 90 ? 5 :
    score >= 80 ? 4 :
    score >= 70 ? 3 :
    score >= 55 ? 2 :
    score >= 40 ? 1 :
    0;

  // Apply trip minimums
  if (tripsCompleted === 0) return Math.min(baseTier, 1);
  if (tripsCompleted < tierConfig.tier2_min_trips) return Math.min(baseTier, 1);
  if (tripsCompleted < tierConfig.tier3_min_trips) return Math.min(baseTier, 2);
  if (tripsCompleted < tierConfig.tier4_min_trips) return Math.min(baseTier, 3);
  if (tripsCompleted < tierConfig.tier5_min_trips) return Math.min(baseTier, 4);

  return baseTier;
}

// Legacy exports for backward compatibility
export const TrustWeightsSchema = z.object({
  driver: z.object({
    onTimeArrival: z.number(),
    podQuality: z.number(),
    disputeRate: z.number(),
    cancelRate: z.number(),
    idlePattern: z.number(),
    backhaulRatio: z.number(),
  }),
  fleet_owner: z.object({
    onTimeAcceptance: z.number(),
    loadAccuracy: z.number(),
    paymentReliability: z.number(),
    disputeRate: z.number(),
    truckReadiness: z.number(),
  }),
});

export type TrustWeights = z.infer<typeof TrustWeightsSchema>;

export const DecayConfigSchema = z.object({
  dispute_lambda: z.number(),
  incident_lambda: z.number(),
  deviation_lambda: z.number(),
  cancel_lambda: z.number(),
  time_unit_days: z.number(),
});

export type DecayConfig = z.infer<typeof DecayConfigSchema>;

export const TrustFactorScoresSchema = z.object({
  driver: z.object({
    onTimeArrival: z.number(),
    podQuality: z.number(),
    disputeRate: z.number(),
    cancelRate: z.number(),
    idlePattern: z.number(),
    backhaulRatio: z.number(),
    rawComposite: z.number(),
  }),
  fleet_owner: z.object({
    onTimeAcceptance: z.number(),
    loadAccuracy: z.number(),
    paymentReliability: z.number(),
    disputeRate: z.number(),
    truckReadiness: z.number(),
    rawComposite: z.number(),
  }),
});

export type TrustFactorScores = z.infer<typeof TrustFactorScoresSchema>;
