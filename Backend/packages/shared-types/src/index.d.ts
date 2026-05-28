/**
 * RUIT CBE — Shared Types Package
 * Re-exports all type definitions
 */
export { EVENT_TYPES, ALL_EVENT_TYPES, type EventType } from './events.js';
export { ROLES, USER_ROLES, OPS_ROLES, CLIENT_ROLES, type Role, type AccessTokenPayload, } from './roles.js';
export { USER_STATUS, TRUCK_STATUS, LOAD_STATUS, TRIP_STATUS, ASSIGNMENT_STATUS, INCIDENT_STATUS, INCIDENT_SEVERITY, PAYMENT_MODEL, TRUCK_TYPE, CARGO_TYPE, KYC_DOC_TYPE, TX_TYPE, REGION, OPTIMIZATION_MODE, COMMISSION_CONFIG_TYPE, EXPOSURE_SCOPE, INCIDENT_TYPE, FRAUD_SEVERITY, SHOCK_TYPE, ROAD_TYPE, CORRIDOR_STATUS, DRIVER_STATUS, BUSINESS_SECTOR, BUSINESS_TYPE, NOTIFICATION_CHANNEL, CHECKPOINT_TYPE, TX_DIRECTION, TX_STATUS, ET_EVENT_NAME, DEMAND_IMPACT, URGENCY_LEVEL, PAYOUT_SPEED, SHIFT_DAY, BACKHAUL_STATUS, CONSOLIDATED_LOAD_STATUS, SUB_LOAD_STATUS, AGGREGATOR_TYPE, FUEL_PRICE_SOURCE, LIQUIDITY_INCENTIVE_TYPE, VOUCHER_STATUS, DRIVER_EARNING_TYPE, DRIVER_EARNING_STATUS, ROAD_ALERT_TYPES, FUEL_AVAILABILITY_STATUS, TIME_CRITICAL_CARGO_TYPES, COLD_CHAIN_CARGO_TYPES, LIVESTOCK_SPECIES, PAYMENT_BASIS, type UserStatus, type TruckStatus, type LoadStatus, type TripStatus, type AssignmentStatus, type IncidentStatus, type IncidentSeverity, type PaymentModel, type TruckType, type CargoType, type KycDocType, type TxType, type PayoutSpeed, type Region, type OptimizationMode, type CommissionConfigType, type ExposureScope, type IncidentType, type FraudSeverity, type ShockType, type RoadType, type CorridorStatus, type DriverStatus, type BusinessSector, type BusinessType, type NotificationChannel, type CheckpointType, type TxDirection, type TxStatus, type EtEventName, type DemandImpact, type UrgencyLevel, type ShiftDay, type BackhaulStatus, type ConsolidatedLoadStatus, type SubLoadStatus, type AggregatorType, type FuelPriceSource, type LiquidityIncentiveType, type VoucherStatus, type DriverEarningType, type DriverEarningStatus, type RoadAlertType, type FuelAvailabilityStatus, } from './enums.js';
export { TrustWeightsSchema, DecayConfigSchema, TrustFactorScoresSchema, type TrustWeights, type DecayConfig, type TrustFactorScores, } from './trust.js';
export { DEFAULT_WDM_WEIGHTS, BACKHAUL_CONFIDENCE_THRESHOLDS, validateWeights, calculateBackhaulConfidence, getConfidenceScore, type WDMWeights, type DecisionTraceInput, type WDMInputVariables, type FactorScores, type CandidateScore, type DecisionTraceRecord, type WDMCalculationResult, type BackhaulConfidenceLevel, type RiskAdjustedScore, } from './wdm.js';
export * from './medium-haul.js';
export * from './constants.js';
export * from './payment.js';
import { z } from 'zod';
export declare const ApiResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: T;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodLiteral<true>;
    data: T;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodLiteral<true>;
    data: T;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
    }, {
        code: string;
        message: string;
        details?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}, {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}>;
export declare const PaginatedResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodArray<T, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        pageSize: z.ZodNumber;
        totalPages: z.ZodNumber;
        totalItems: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        page: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    }, {
        page: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    }>;
}, "strip", z.ZodTypeAny, {
    success: true;
    data: T["_output"][];
    pagination: {
        page: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    };
}, {
    success: true;
    data: T["_input"][];
    pagination: {
        page: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    };
}>;
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
//# sourceMappingURL=index.d.ts.map