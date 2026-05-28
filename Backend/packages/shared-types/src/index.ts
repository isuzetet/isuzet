/**
 * RUIT CBE — Shared Types Package
 * Re-exports all type definitions
 */

// Event registry
export { EVENT_TYPES, ALL_EVENT_TYPES, type EventType } from './events.js';

// Roles and authentication
export {
  ROLES,
  USER_ROLES,
  OPS_ROLES,
  CLIENT_ROLES,
  type Role,
  type AccessTokenPayload,
} from './roles.js';

// Database enums
export {
  USER_STATUS,
  TRUCK_STATUS,
  LOAD_STATUS,
  TRIP_STATUS,
  ASSIGNMENT_STATUS,
  INCIDENT_STATUS,
  INCIDENT_SEVERITY,
  PAYMENT_MODEL,
  TRUCK_TYPE,
  CARGO_TYPE,
  KYC_DOC_TYPE,
  TX_TYPE,
  REGION,
  OPTIMIZATION_MODE,
  COMMISSION_CONFIG_TYPE,
  EXPOSURE_SCOPE,
  INCIDENT_TYPE,
  FRAUD_SEVERITY,
  SHOCK_TYPE,
  ROAD_TYPE,
  CORRIDOR_STATUS,
  DRIVER_STATUS,
  BUSINESS_SECTOR,
  BUSINESS_TYPE,
  NOTIFICATION_CHANNEL,
  CHECKPOINT_TYPE,
  TX_DIRECTION,
  TX_STATUS,
  ET_EVENT_NAME,
  DEMAND_IMPACT,
  URGENCY_LEVEL,
  PAYOUT_SPEED,
  SHIFT_DAY,
  BACKHAUL_STATUS,
  CONSOLIDATED_LOAD_STATUS,
  SUB_LOAD_STATUS,
  AGGREGATOR_TYPE,
  FUEL_PRICE_SOURCE,
  LIQUIDITY_INCENTIVE_TYPE,
  VOUCHER_STATUS,
  DRIVER_EARNING_TYPE,
  DRIVER_EARNING_STATUS,
  // Phase 9 Supply-Side GTM Enums
  ROAD_ALERT_TYPES,
  FUEL_AVAILABILITY_STATUS,
  // Phase 10 Cargo-Specific Enums
  TIME_CRITICAL_CARGO_TYPES,
  COLD_CHAIN_CARGO_TYPES,
  LIVESTOCK_SPECIES,
  PAYMENT_BASIS,
  type UserStatus,
  type TruckStatus,
  type LoadStatus,
  type TripStatus,
  type AssignmentStatus,
  type IncidentStatus,
  type IncidentSeverity,
  type PaymentModel,
  type TruckType,
  type CargoType,
  type KycDocType,
  type TxType,
  type PayoutSpeed,
  type Region,
  type OptimizationMode,
  type CommissionConfigType,
  type ExposureScope,
  type IncidentType,
  type FraudSeverity,
  type ShockType,
  type RoadType,
  type CorridorStatus,
  type DriverStatus,
  type BusinessSector,
  type BusinessType,
  type NotificationChannel,
  type CheckpointType,
  type TxDirection,
  type TxStatus,
  type EtEventName,
  type DemandImpact,
  type UrgencyLevel,
  type ShiftDay,
  type BackhaulStatus,
  type ConsolidatedLoadStatus,
  type SubLoadStatus,
  type AggregatorType,
  type FuelPriceSource,
  type LiquidityIncentiveType,
  type VoucherStatus,
  type DriverEarningType,
  type DriverEarningStatus,
  // Phase 9 Supply-Side GTM Enum Types
  type FuelAvailabilityStatus,
  // Pricing Mode Enums
  PricingMode,
  CharterTruckSize,
  // Road Intelligence Enums
  RoadAlertType,
  RoadAlertSeverity,
  RoadAlertSource,
  // Fuel, Earnings, Documents, and Ratings Enums
  DocumentType,
  DocumentAlertStatus,
  OffPlatformTripStatus,
  // Trust Score, Dispute Resolution, and Payment Rail Enums
  PaymentRailType,
  TrustScoreEventType,
  DisputeStatus,
  DisputeOutcome,
  PayoutStatus,
  MicroLoanStatus,
  // Corridor Balancing Enums
  CorridorImbalanceDirection,
  BalancingInterventionType,
} from './enums.js';

// Trust scoring
export {
  TrustWeightsSchema,
  DecayConfigSchema,
  TrustFactorScoresSchema,
  type TrustWeights,
  type DecayConfig,
  type TrustFactorScores,
} from './trust.js';

// WDM (Weighted Decision Matrix)
export {
  DEFAULT_WDM_WEIGHTS,
  BACKHAUL_CONFIDENCE_THRESHOLDS,
  validateWeights,
  calculateBackhaulConfidence,
  getConfidenceScore,
  type WDMWeights,
  type DecisionTraceInput,
  type WDMInputVariables,
  type FactorScores,
  type CandidateScore,
  type DecisionTraceRecord,
  type WDMCalculationResult,
  type BackhaulConfidenceLevel,
  type RiskAdjustedScore,
} from './wdm.js';

// Medium-Haul Platform
export * from './medium-haul.js';

// Constants and payment rails
export * from './constants.js';
export * from './payment.js';

// API Response types
import { z } from 'zod';

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      totalPages: z.number(),
      totalItems: z.number(),
    }),
  });

export type ApiResponse<T> = {
  success: true;
  data: T;
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
};

export { QueueNames } from './queues.js';
