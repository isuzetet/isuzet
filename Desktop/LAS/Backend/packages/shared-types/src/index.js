"use strict";
/**
 * RUIT CBE — Shared Types Package
 * Re-exports all type definitions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUEL_AVAILABILITY_STATUS = exports.ROAD_ALERT_TYPES = exports.DRIVER_EARNING_STATUS = exports.DRIVER_EARNING_TYPE = exports.VOUCHER_STATUS = exports.LIQUIDITY_INCENTIVE_TYPE = exports.FUEL_PRICE_SOURCE = exports.AGGREGATOR_TYPE = exports.SUB_LOAD_STATUS = exports.CONSOLIDATED_LOAD_STATUS = exports.BACKHAUL_STATUS = exports.SHIFT_DAY = exports.PAYOUT_SPEED = exports.URGENCY_LEVEL = exports.DEMAND_IMPACT = exports.ET_EVENT_NAME = exports.TX_STATUS = exports.TX_DIRECTION = exports.CHECKPOINT_TYPE = exports.NOTIFICATION_CHANNEL = exports.BUSINESS_TYPE = exports.BUSINESS_SECTOR = exports.DRIVER_STATUS = exports.CORRIDOR_STATUS = exports.ROAD_TYPE = exports.SHOCK_TYPE = exports.FRAUD_SEVERITY = exports.INCIDENT_TYPE = exports.EXPOSURE_SCOPE = exports.COMMISSION_CONFIG_TYPE = exports.OPTIMIZATION_MODE = exports.REGION = exports.TX_TYPE = exports.KYC_DOC_TYPE = exports.CARGO_TYPE = exports.TRUCK_TYPE = exports.PAYMENT_MODEL = exports.INCIDENT_SEVERITY = exports.INCIDENT_STATUS = exports.ASSIGNMENT_STATUS = exports.TRIP_STATUS = exports.LOAD_STATUS = exports.TRUCK_STATUS = exports.USER_STATUS = exports.CLIENT_ROLES = exports.OPS_ROLES = exports.USER_ROLES = exports.ROLES = exports.ALL_EVENT_TYPES = exports.EVENT_TYPES = void 0;
exports.PaginatedResponseSchema = exports.ErrorResponseSchema = exports.ApiResponseSchema = exports.getConfidenceScore = exports.calculateBackhaulConfidence = exports.validateWeights = exports.BACKHAUL_CONFIDENCE_THRESHOLDS = exports.DEFAULT_WDM_WEIGHTS = exports.TrustFactorScoresSchema = exports.DecayConfigSchema = exports.TrustWeightsSchema = exports.PAYMENT_BASIS = exports.LIVESTOCK_SPECIES = exports.COLD_CHAIN_CARGO_TYPES = exports.TIME_CRITICAL_CARGO_TYPES = void 0;
// Event registry
var events_js_1 = require("./events.js");
Object.defineProperty(exports, "EVENT_TYPES", { enumerable: true, get: function () { return events_js_1.EVENT_TYPES; } });
Object.defineProperty(exports, "ALL_EVENT_TYPES", { enumerable: true, get: function () { return events_js_1.ALL_EVENT_TYPES; } });
// Roles and authentication
var roles_js_1 = require("./roles.js");
Object.defineProperty(exports, "ROLES", { enumerable: true, get: function () { return roles_js_1.ROLES; } });
Object.defineProperty(exports, "USER_ROLES", { enumerable: true, get: function () { return roles_js_1.USER_ROLES; } });
Object.defineProperty(exports, "OPS_ROLES", { enumerable: true, get: function () { return roles_js_1.OPS_ROLES; } });
Object.defineProperty(exports, "CLIENT_ROLES", { enumerable: true, get: function () { return roles_js_1.CLIENT_ROLES; } });
// Database enums
var enums_js_1 = require("./enums.js");
Object.defineProperty(exports, "USER_STATUS", { enumerable: true, get: function () { return enums_js_1.USER_STATUS; } });
Object.defineProperty(exports, "TRUCK_STATUS", { enumerable: true, get: function () { return enums_js_1.TRUCK_STATUS; } });
Object.defineProperty(exports, "LOAD_STATUS", { enumerable: true, get: function () { return enums_js_1.LOAD_STATUS; } });
Object.defineProperty(exports, "TRIP_STATUS", { enumerable: true, get: function () { return enums_js_1.TRIP_STATUS; } });
Object.defineProperty(exports, "ASSIGNMENT_STATUS", { enumerable: true, get: function () { return enums_js_1.ASSIGNMENT_STATUS; } });
Object.defineProperty(exports, "INCIDENT_STATUS", { enumerable: true, get: function () { return enums_js_1.INCIDENT_STATUS; } });
Object.defineProperty(exports, "INCIDENT_SEVERITY", { enumerable: true, get: function () { return enums_js_1.INCIDENT_SEVERITY; } });
Object.defineProperty(exports, "PAYMENT_MODEL", { enumerable: true, get: function () { return enums_js_1.PAYMENT_MODEL; } });
Object.defineProperty(exports, "TRUCK_TYPE", { enumerable: true, get: function () { return enums_js_1.TRUCK_TYPE; } });
Object.defineProperty(exports, "CARGO_TYPE", { enumerable: true, get: function () { return enums_js_1.CARGO_TYPE; } });
Object.defineProperty(exports, "KYC_DOC_TYPE", { enumerable: true, get: function () { return enums_js_1.KYC_DOC_TYPE; } });
Object.defineProperty(exports, "TX_TYPE", { enumerable: true, get: function () { return enums_js_1.TX_TYPE; } });
Object.defineProperty(exports, "REGION", { enumerable: true, get: function () { return enums_js_1.REGION; } });
Object.defineProperty(exports, "OPTIMIZATION_MODE", { enumerable: true, get: function () { return enums_js_1.OPTIMIZATION_MODE; } });
Object.defineProperty(exports, "COMMISSION_CONFIG_TYPE", { enumerable: true, get: function () { return enums_js_1.COMMISSION_CONFIG_TYPE; } });
Object.defineProperty(exports, "EXPOSURE_SCOPE", { enumerable: true, get: function () { return enums_js_1.EXPOSURE_SCOPE; } });
Object.defineProperty(exports, "INCIDENT_TYPE", { enumerable: true, get: function () { return enums_js_1.INCIDENT_TYPE; } });
Object.defineProperty(exports, "FRAUD_SEVERITY", { enumerable: true, get: function () { return enums_js_1.FRAUD_SEVERITY; } });
Object.defineProperty(exports, "SHOCK_TYPE", { enumerable: true, get: function () { return enums_js_1.SHOCK_TYPE; } });
Object.defineProperty(exports, "ROAD_TYPE", { enumerable: true, get: function () { return enums_js_1.ROAD_TYPE; } });
Object.defineProperty(exports, "CORRIDOR_STATUS", { enumerable: true, get: function () { return enums_js_1.CORRIDOR_STATUS; } });
Object.defineProperty(exports, "DRIVER_STATUS", { enumerable: true, get: function () { return enums_js_1.DRIVER_STATUS; } });
Object.defineProperty(exports, "BUSINESS_SECTOR", { enumerable: true, get: function () { return enums_js_1.BUSINESS_SECTOR; } });
Object.defineProperty(exports, "BUSINESS_TYPE", { enumerable: true, get: function () { return enums_js_1.BUSINESS_TYPE; } });
Object.defineProperty(exports, "NOTIFICATION_CHANNEL", { enumerable: true, get: function () { return enums_js_1.NOTIFICATION_CHANNEL; } });
Object.defineProperty(exports, "CHECKPOINT_TYPE", { enumerable: true, get: function () { return enums_js_1.CHECKPOINT_TYPE; } });
Object.defineProperty(exports, "TX_DIRECTION", { enumerable: true, get: function () { return enums_js_1.TX_DIRECTION; } });
Object.defineProperty(exports, "TX_STATUS", { enumerable: true, get: function () { return enums_js_1.TX_STATUS; } });
Object.defineProperty(exports, "ET_EVENT_NAME", { enumerable: true, get: function () { return enums_js_1.ET_EVENT_NAME; } });
Object.defineProperty(exports, "DEMAND_IMPACT", { enumerable: true, get: function () { return enums_js_1.DEMAND_IMPACT; } });
Object.defineProperty(exports, "URGENCY_LEVEL", { enumerable: true, get: function () { return enums_js_1.URGENCY_LEVEL; } });
Object.defineProperty(exports, "PAYOUT_SPEED", { enumerable: true, get: function () { return enums_js_1.PAYOUT_SPEED; } });
Object.defineProperty(exports, "SHIFT_DAY", { enumerable: true, get: function () { return enums_js_1.SHIFT_DAY; } });
Object.defineProperty(exports, "BACKHAUL_STATUS", { enumerable: true, get: function () { return enums_js_1.BACKHAUL_STATUS; } });
Object.defineProperty(exports, "CONSOLIDATED_LOAD_STATUS", { enumerable: true, get: function () { return enums_js_1.CONSOLIDATED_LOAD_STATUS; } });
Object.defineProperty(exports, "SUB_LOAD_STATUS", { enumerable: true, get: function () { return enums_js_1.SUB_LOAD_STATUS; } });
Object.defineProperty(exports, "AGGREGATOR_TYPE", { enumerable: true, get: function () { return enums_js_1.AGGREGATOR_TYPE; } });
Object.defineProperty(exports, "FUEL_PRICE_SOURCE", { enumerable: true, get: function () { return enums_js_1.FUEL_PRICE_SOURCE; } });
Object.defineProperty(exports, "LIQUIDITY_INCENTIVE_TYPE", { enumerable: true, get: function () { return enums_js_1.LIQUIDITY_INCENTIVE_TYPE; } });
Object.defineProperty(exports, "VOUCHER_STATUS", { enumerable: true, get: function () { return enums_js_1.VOUCHER_STATUS; } });
Object.defineProperty(exports, "DRIVER_EARNING_TYPE", { enumerable: true, get: function () { return enums_js_1.DRIVER_EARNING_TYPE; } });
Object.defineProperty(exports, "DRIVER_EARNING_STATUS", { enumerable: true, get: function () { return enums_js_1.DRIVER_EARNING_STATUS; } });
// Phase 9 Supply-Side GTM Enums
Object.defineProperty(exports, "ROAD_ALERT_TYPES", { enumerable: true, get: function () { return enums_js_1.ROAD_ALERT_TYPES; } });
Object.defineProperty(exports, "FUEL_AVAILABILITY_STATUS", { enumerable: true, get: function () { return enums_js_1.FUEL_AVAILABILITY_STATUS; } });
// Phase 10 Cargo-Specific Enums
Object.defineProperty(exports, "TIME_CRITICAL_CARGO_TYPES", { enumerable: true, get: function () { return enums_js_1.TIME_CRITICAL_CARGO_TYPES; } });
Object.defineProperty(exports, "COLD_CHAIN_CARGO_TYPES", { enumerable: true, get: function () { return enums_js_1.COLD_CHAIN_CARGO_TYPES; } });
Object.defineProperty(exports, "LIVESTOCK_SPECIES", { enumerable: true, get: function () { return enums_js_1.LIVESTOCK_SPECIES; } });
Object.defineProperty(exports, "PAYMENT_BASIS", { enumerable: true, get: function () { return enums_js_1.PAYMENT_BASIS; } });
// Trust scoring
var trust_js_1 = require("./trust.js");
Object.defineProperty(exports, "TrustWeightsSchema", { enumerable: true, get: function () { return trust_js_1.TrustWeightsSchema; } });
Object.defineProperty(exports, "DecayConfigSchema", { enumerable: true, get: function () { return trust_js_1.DecayConfigSchema; } });
Object.defineProperty(exports, "TrustFactorScoresSchema", { enumerable: true, get: function () { return trust_js_1.TrustFactorScoresSchema; } });
// WDM (Weighted Decision Matrix)
var wdm_js_1 = require("./wdm.js");
Object.defineProperty(exports, "DEFAULT_WDM_WEIGHTS", { enumerable: true, get: function () { return wdm_js_1.DEFAULT_WDM_WEIGHTS; } });
Object.defineProperty(exports, "BACKHAUL_CONFIDENCE_THRESHOLDS", { enumerable: true, get: function () { return wdm_js_1.BACKHAUL_CONFIDENCE_THRESHOLDS; } });
Object.defineProperty(exports, "validateWeights", { enumerable: true, get: function () { return wdm_js_1.validateWeights; } });
Object.defineProperty(exports, "calculateBackhaulConfidence", { enumerable: true, get: function () { return wdm_js_1.calculateBackhaulConfidence; } });
Object.defineProperty(exports, "getConfidenceScore", { enumerable: true, get: function () { return wdm_js_1.getConfidenceScore; } });
// Medium-Haul Platform
__exportStar(require("./medium-haul.js"), exports);
// Constants and payment rails
__exportStar(require("./constants.js"), exports);
__exportStar(require("./payment.js"), exports);
// API Response types
const zod_1 = require("zod");
const ApiResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: dataSchema,
});
exports.ApiResponseSchema = ApiResponseSchema;
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.unknown().optional(),
    }),
});
const PaginatedResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(dataSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        pageSize: zod_1.z.number(),
        totalPages: zod_1.z.number(),
        totalItems: zod_1.z.number(),
    }),
});
exports.PaginatedResponseSchema = PaginatedResponseSchema;
//# sourceMappingURL=index.js.map