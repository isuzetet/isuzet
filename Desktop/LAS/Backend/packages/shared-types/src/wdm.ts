import { z } from 'zod';

// WDM Weights configuration
export const DEFAULT_WDM_WEIGHTS = {
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
export const BACKHAUL_CONFIDENCE_THRESHOLDS = {
  LOW: { min: 0, max: 0.30, penaltyMultiplier: 1.20 },
  MEDIUM: { min: 0.30, max: 0.60, penaltyMultiplier: 1.10 },
  HIGH: { min: 0.60, max: 0.85, penaltyMultiplier: 1.05 },
  FULL: { min: 0.85, max: 1.00, penaltyMultiplier: 1.00 },
};

// WDM Weights Schema
export const WDMWeightsSchema = z.object({
  urgency: z.number().min(0).max(1),
  corridorDensity: z.number().min(0).max(1),
  backhaul: z.number().min(0).max(1),
  margin: z.number().min(0).max(1),
  driverTrust: z.number().min(0).max(1),
  fleetTrust: z.number().min(0).max(1),
  liquidityDelta: z.number().min(0).max(1),
  subsidy: z.number().min(0).max(1),
});

export type WDMWeights = z.infer<typeof WDMWeightsSchema>;

// Input variables for WDM calculation
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

// Factor scores interface
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

// Candidate scoring
export interface CandidateScore {
  candidateId: string;
  candidateType: 'DRIVER' | 'FLEET_OWNER';
  compositeScore: number;
  factorBreakdown: FactorScores;
  backhaulConfidence: number;
  rank: number;
}

// Decision trace record
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

// WDM calculation result
export interface WDMCalculationResult {
  compositeScore: number;
  factorScores: FactorScores;
  confidenceLevel: BackhaulConfidenceLevel;
  adjustedScore: number;
  rank: number;
}

// Backhaul confidence level
export type BackhaulConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';

// Risk-adjusted score
export interface RiskAdjustedScore {
  baseScore: number;
  riskMultiplier: number;
  adjustedScore: number;
}

// Validation function
export function validateWeights(weights: Partial<WDMWeights>): boolean {
  const values = Object.values(weights);
  const sum = values.reduce((a, b) => a + b, 0);
  return sum >= 0.99 && sum <= 1.01;
}

// Calculate backhaul confidence level
export function calculateBackhaulConfidence(
  historicalTrips: number,
  successRate: number
): BackhaulConfidenceLevel {
  const score = historicalTrips * successRate;
  if (score < 5) return 'LOW';
  if (score < 20) return 'MEDIUM';
  if (score < 50) return 'HIGH';
  return 'FULL';
}

// Get confidence score from level
export function getConfidenceScore(level: BackhaulConfidenceLevel): number {
  const scores = { LOW: 0.2, MEDIUM: 0.45, HIGH: 0.7, FULL: 0.9 };
  return scores[level];
}
