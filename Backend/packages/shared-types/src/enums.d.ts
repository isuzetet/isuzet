/**
 * RUIT CBE — Entity Status Enums and Constants
 * All enums from the database schema
 */
export declare const USER_STATUS: {
    readonly PENDING_KYC: "PENDING_KYC";
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
    readonly BLACKLISTED: "BLACKLISTED";
};
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export declare const TRUCK_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly ON_TRIP: "ON_TRIP";
    readonly MAINTENANCE: "MAINTENANCE";
    readonly SUSPENDED: "SUSPENDED";
    readonly RETIRED: "RETIRED";
};
export type TruckStatus = (typeof TRUCK_STATUS)[keyof typeof TRUCK_STATUS];
export declare const LOAD_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly OPEN: "OPEN";
    readonly QUOTING: "QUOTING";
    readonly MATCHED: "MATCHED";
    readonly READY_TO_MATCH: "READY_TO_MATCH";
    readonly DEPARTED: "DEPARTED";
    readonly IN_TRANSIT: "IN_TRANSIT";
    readonly DELIVERED: "DELIVERED";
    readonly CANCELLED: "CANCELLED";
    readonly DISPUTED: "DISPUTED";
};
export type LoadStatus = (typeof LOAD_STATUS)[keyof typeof LOAD_STATUS];
export declare const TRIP_STATUS: {
    readonly PENDING: "PENDING";
    readonly EN_ROUTE: "EN_ROUTE";
    readonly AT_CHECKPOINT: "AT_CHECKPOINT";
    readonly DELIVERED: "DELIVERED";
    readonly DISPUTED: "DISPUTED";
    readonly CANCELLED: "CANCELLED";
    readonly DELAYED: "DELAYED";
    readonly EMERGENCY: "EMERGENCY";
};
export type TripStatus = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];
export declare const ASSIGNMENT_STATUS: {
    readonly SUGGESTED: "SUGGESTED";
    readonly ACCEPTED: "ACCEPTED";
    readonly REJECTED: "REJECTED";
    readonly EXPIRED: "EXPIRED";
    readonly ACTIVE: "ACTIVE";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];
export declare const INCIDENT_STATUS: {
    readonly OPEN: "OPEN";
    readonly UNDER_INVESTIGATION: "UNDER_INVESTIGATION";
    readonly EVIDENCE_COLLECTION: "EVIDENCE_COLLECTION";
    readonly AWAITING_RESOLUTION: "AWAITING_RESOLUTION";
    readonly RESOLVED: "RESOLVED";
    readonly ESCALATED: "ESCALATED";
    readonly CLOSED: "CLOSED";
};
export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];
export declare const INCIDENT_SEVERITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly CRITICAL: "CRITICAL";
};
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];
export declare const PAYMENT_MODEL: {
    readonly ESCROW: "ESCROW";
    readonly COD: "COD";
    readonly ROLLING_CREDIT: "ROLLING_CREDIT";
    readonly PARTIAL_ADVANCE: "PARTIAL_ADVANCE";
};
export type PaymentModel = (typeof PAYMENT_MODEL)[keyof typeof PAYMENT_MODEL];
export declare const TRUCK_BODY_TYPE: {
    readonly FLATBED: "FLATBED";
    readonly COVERED: "COVERED";
    readonly REFRIGERATED: "REFRIGERATED";
    readonly TANKER: "TANKER";
    readonly TIPPER: "TIPPER";
    readonly LOWBED: "LOWBED";
    readonly LIVESTOCK: "LIVESTOCK";
    readonly OTHER: "OTHER";
};
export type TruckBodyType = (typeof TRUCK_BODY_TYPE)[keyof typeof TRUCK_BODY_TYPE];
export declare const TRUCK_TYPE: {
    readonly FLATBED: "FLATBED";
    readonly REEFER: "REEFER";
    readonly TANKER: "TANKER";
    readonly BOX: "BOX";
    readonly TIPPER: "TIPPER";
    readonly CURTAINSIDER: "CURTAINSIDER";
};
export type TruckType = (typeof TRUCK_TYPE)[keyof typeof TRUCK_TYPE];
export declare const CARGO_TYPE: {
    readonly GENERAL: "GENERAL";
    readonly PERISHABLE: "PERISHABLE";
    readonly HAZMAT: "HAZMAT";
    readonly LIVESTOCK: "LIVESTOCK";
    readonly FMCG: "FMCG";
    readonly CONSTRUCTION: "CONSTRUCTION";
    readonly AGRICULTURE: "AGRICULTURE";
    readonly KHAT: "KHAT";
    readonly FRESH_FISH: "FRESH_FISH";
    readonly CUT_FLOWERS: "CUT_FLOWERS";
    readonly FROZEN_MEAT: "FROZEN_MEAT";
    readonly FRESH_PRODUCE: "FRESH_PRODUCE";
    readonly DAIRY: "DAIRY";
    readonly BAGGED_GRAIN: "BAGGED_GRAIN";
    readonly CEMENT: "CEMENT";
    readonly BEVERAGES: "BEVERAGES";
    readonly COFFEE: "COFFEE";
    readonly COTTON_SESAME: "COTTON_SESAME";
    readonly HONEY: "HONEY";
};
export declare const TIME_CRITICAL_CARGO_TYPES: readonly ["KHAT", "FRESH_FISH", "CUT_FLOWERS", "FROZEN_MEAT", "FRESH_PRODUCE", "DAIRY"];
export declare const LIVESTOCK_SPECIES: {
    readonly CATTLE: "cattle";
    readonly SHEEP: "sheep";
    readonly POULTRY: "poultry";
};
export declare const PAYMENT_BASIS: {
    readonly PER_KG: "PER_KG";
    readonly PER_HEAD: "PER_HEAD";
};
export declare const COLD_CHAIN_CARGO_TYPES: readonly ["FROZEN_MEAT", "FRESH_PRODUCE", "DAIRY", "CUT_FLOWERS"];
export type CargoType = (typeof CARGO_TYPE)[keyof typeof CARGO_TYPE];
export declare const KYC_DOC_TYPE: {
    readonly NATIONAL_ID: "NATIONAL_ID";
    readonly KEBELE_ID: "KEBELE_ID";
    readonly PASSPORT: "PASSPORT";
    readonly TRADE_LICENSE: "TRADE_LICENSE";
    readonly TIN_CERT: "TIN_CERT";
    readonly INSURANCE: "INSURANCE";
    readonly INSPECTION: "INSPECTION";
    readonly DRIVER_LICENSE: "DRIVER_LICENSE";
    readonly BANK_STATEMENT: "BANK_STATEMENT";
    readonly VEHICLE_LOG_BOOK: "VEHICLE_LOG_BOOK";
};
export type KycDocType = (typeof KYC_DOC_TYPE)[keyof typeof KYC_DOC_TYPE];
export declare const TX_TYPE: {
    readonly ESCROW_HOLD: "ESCROW_HOLD";
    readonly ESCROW_RELEASE: "ESCROW_RELEASE";
    readonly ADVANCE_PAYOUT: "ADVANCE_PAYOUT";
    readonly COMMISSION_DEDUCTION: "COMMISSION_DEDUCTION";
    readonly COD_LOG: "COD_LOG";
    readonly PENALTY: "PENALTY";
    readonly CREDIT_DRAWDOWN: "CREDIT_DRAWDOWN";
    readonly REFUND: "REFUND";
    readonly ADJUSTMENT: "ADJUSTMENT";
};
export type TxType = (typeof TX_TYPE)[keyof typeof TX_TYPE];
export declare const REGION: {
    readonly NORTH: "NORTH";
    readonly SOUTH: "SOUTH";
    readonly EAST: "EAST";
    readonly WEST: "WEST";
    readonly CENTRAL: "CENTRAL";
};
export type Region = (typeof REGION)[keyof typeof REGION];
export declare const OPTIMIZATION_MODE: {
    readonly GROWTH: "GROWTH";
    readonly DENSITY: "DENSITY";
    readonly EFFICIENCY: "EFFICIENCY";
    readonly SHOCK: "SHOCK";
};
export type OptimizationMode = (typeof OPTIMIZATION_MODE)[keyof typeof OPTIMIZATION_MODE];
export declare const COMMISSION_CONFIG_TYPE: {
    readonly PERCENTAGE: "PERCENTAGE";
    readonly FIXED: "FIXED";
    readonly TIERED: "TIERED";
};
export type CommissionConfigType = (typeof COMMISSION_CONFIG_TYPE)[keyof typeof COMMISSION_CONFIG_TYPE];
export declare const EXPOSURE_SCOPE: {
    readonly CLIENT: "CLIENT";
    readonly FLEET: "FLEET";
    readonly CORRIDOR: "CORRIDOR";
    readonly SYSTEM: "SYSTEM";
    readonly CLUSTER: "CLUSTER";
};
export type ExposureScope = (typeof EXPOSURE_SCOPE)[keyof typeof EXPOSURE_SCOPE];
export declare const INCIDENT_TYPE: {
    readonly LATE_DELIVERY: "LATE_DELIVERY";
    readonly CARGO_DAMAGE: "CARGO_DAMAGE";
    readonly ROUTE_DEVIATION: "ROUTE_DEVIATION";
    readonly FRAUD: "FRAUD";
    readonly ACCIDENT: "ACCIDENT";
    readonly BREAKDOWN: "BREAKDOWN";
    readonly DISPUTE: "DISPUTE";
    readonly CARGO_SHORTAGE: "CARGO_SHORTAGE";
    readonly WRONG_DELIVERY: "WRONG_DELIVERY";
    readonly SOS: "SOS";
    readonly CHECKPOINT_FEE: "CHECKPOINT_FEE";
    readonly CARGO_DAMAGE_AT_PICKUP: "CARGO_DAMAGE_AT_PICKUP";
    readonly CARGO_DAMAGE_AT_DELIVERY: "CARGO_DAMAGE_AT_DELIVERY";
    readonly DEMURRAGE: "DEMURRAGE";
    readonly LOAD_CANCELLED: "LOAD_CANCELLED";
};
export type IncidentType = (typeof INCIDENT_TYPE)[keyof typeof INCIDENT_TYPE];
export declare const FRAUD_SEVERITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly CRITICAL: "CRITICAL";
};
export type FraudSeverity = (typeof FRAUD_SEVERITY)[keyof typeof FRAUD_SEVERITY];
export declare const SHOCK_TYPE: {
    readonly FUEL_SHORTAGE: "FUEL_SHORTAGE";
    readonly ROAD_CLOSURE: "ROAD_CLOSURE";
    readonly POLITICAL: "POLITICAL";
    readonly WEATHER: "WEATHER";
    readonly PAYMENT_CRISIS: "PAYMENT_CRISIS";
    readonly MANUAL: "MANUAL";
};
export type ShockType = (typeof SHOCK_TYPE)[keyof typeof SHOCK_TYPE];
export declare const ROAD_TYPE: {
    readonly ASPHALT: "ASPHALT";
    readonly GRAVEL: "GRAVEL";
    readonly MIXED: "MIXED";
};
export type RoadType = (typeof ROAD_TYPE)[keyof typeof ROAD_TYPE];
export declare const CORRIDOR_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly FROZEN: "FROZEN";
    readonly SEEDING: "SEEDING";
    readonly DEPRECATED: "DEPRECATED";
};
export type CorridorStatus = (typeof CORRIDOR_STATUS)[keyof typeof CORRIDOR_STATUS];
export declare const DRIVER_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
    readonly BLACKLISTED: "BLACKLISTED";
    readonly ON_TRIP: "ON_TRIP";
    readonly AVAILABLE: "AVAILABLE";
    readonly RESTING: "RESTING";
    readonly UNAVAILABLE: "UNAVAILABLE";
};
export type DriverStatus = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];
export declare const BUSINESS_SECTOR: {
    readonly FMCG: "FMCG";
    readonly AGRICULTURE: "AGRICULTURE";
    readonly MANUFACTURING: "MANUFACTURING";
    readonly CONSTRUCTION: "CONSTRUCTION";
    readonly RETAIL: "RETAIL";
    readonly OTHER: "OTHER";
};
export type BusinessSector = (typeof BUSINESS_SECTOR)[keyof typeof BUSINESS_SECTOR];
export declare const BUSINESS_TYPE: {
    readonly SOLE_TRADER: "SOLE_TRADER";
    readonly COMPANY: "COMPANY";
    readonly COOPERATIVE: "COOPERATIVE";
};
export type BusinessType = (typeof BUSINESS_TYPE)[keyof typeof BUSINESS_TYPE];
export declare const NOTIFICATION_CHANNEL: {
    readonly SMS: "SMS";
    readonly PUSH: "PUSH";
    readonly BOTH: "BOTH";
};
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];
export declare const CHECKPOINT_TYPE: {
    readonly POLICE: "POLICE";
    readonly WEIGHBRIDGE: "WEIGHBRIDGE";
    readonly TOLL: "TOLL";
    readonly FUEL_POINT: "FUEL_POINT";
    readonly CITY_BOUNDARY: "CITY_BOUNDARY";
    readonly CUSTOMS: "CUSTOMS";
};
export type CheckpointType = (typeof CHECKPOINT_TYPE)[keyof typeof CHECKPOINT_TYPE];
export declare const TX_DIRECTION: {
    readonly IN: "IN";
    readonly OUT: "OUT";
};
export type TxDirection = (typeof TX_DIRECTION)[keyof typeof TX_DIRECTION];
export declare const EXPENSE_TYPE: {
    readonly FUEL: "FUEL";
    readonly MAINTENANCE: "MAINTENANCE";
    readonly SALARY: "SALARY";
    readonly INSURANCE: "INSURANCE";
    readonly LOAN: "LOAN";
    readonly CHECKPOINT_FEE: "CHECKPOINT_FEE";
    readonly LOADING_FEE: "LOADING_FEE";
    readonly OTHER: "OTHER";
};
export type ExpenseType = (typeof EXPENSE_TYPE)[keyof typeof EXPENSE_TYPE];
export declare const TX_STATUS: {
    readonly PENDING: "PENDING";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
    readonly REVERSED: "REVERSED";
    readonly DISPUTED: "DISPUTED";
};
export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS];
export declare const MAINTENANCE_TYPE: {
    readonly OIL_CHANGE: "OIL_CHANGE";
    readonly TYRE_ROTATION: "TYRE_ROTATION";
    readonly BRAKE_SERVICE: "BRAKE_SERVICE";
    readonly ENGINE_SERVICE: "ENGINE_SERVICE";
    readonly FULL_SERVICE: "FULL_SERVICE";
    readonly REPAIR: "REPAIR";
};
export type MaintenanceType = (typeof MAINTENANCE_TYPE)[keyof typeof MAINTENANCE_TYPE];
export declare const ET_EVENT_NAME: {
    readonly TIMKAT: "TIMKAT";
    readonly ENKUTATASH: "ENKUTATASH";
    readonly IRREECHA: "IRREECHA";
    readonly FASIKA: "FASIKA";
    readonly GENA: "GENA";
    readonly MAWLID: "MAWLID";
    readonly RAMADAN_START: "RAMADAN_START";
    readonly RAMADAN_END: "RAMADAN_END";
    readonly MARKET_DAY: "MARKET_DAY";
    readonly HARVEST_BELG: "HARVEST_BELG";
    readonly HARVEST_MEHER: "HARVEST_MEHER";
    readonly NATIONAL_HOLIDAY: "NATIONAL_HOLIDAY";
};
export type EtEventName = (typeof ET_EVENT_NAME)[keyof typeof ET_EVENT_NAME];
export declare const DEMAND_IMPACT: {
    readonly HIGH_DEMAND: "HIGH_DEMAND";
    readonly LOW_DEMAND: "LOW_DEMAND";
    readonly NEUTRAL: "NEUTRAL";
    readonly ROUTE_DISRUPTION: "ROUTE_DISRUPTION";
};
export type DemandImpact = (typeof DEMAND_IMPACT)[keyof typeof DEMAND_IMPACT];
export declare const URGENCY_LEVEL: {
    readonly FLEXIBLE: 1;
    readonly NORMAL: 2;
    readonly URGENT: 3;
    readonly CRITICAL: 4;
};
export type UrgencyLevel = (typeof URGENCY_LEVEL)[keyof typeof URGENCY_LEVEL];
export declare const PAYOUT_SPEED: {
    readonly T0: "T0";
    readonly T1: "T1";
    readonly T3: "T3";
    readonly T7: "T7";
};
export type PayoutSpeed = (typeof PAYOUT_SPEED)[keyof typeof PAYOUT_SPEED];
export declare const CORRIDOR_TYPE: {
    readonly INTERCITY: "INTERCITY";
    readonly INTRACITY: "INTRACITY";
    readonly REGIONAL: "REGIONAL";
};
export type CorridorType = (typeof CORRIDOR_TYPE)[keyof typeof CORRIDOR_TYPE];
export declare const TRUCK_BRAND: {
    readonly ISUZU: "ISUZU";
    readonly TATA: "TATA";
    readonly SINO: "SINO";
    readonly FAW: "FAW";
    readonly FOTON: "FOTON";
    readonly HINO: "HINO";
    readonly MERCEDES: "MERCEDES";
    readonly ASHOK_LEYLAND: "ASHOK_LEYLAND";
    readonly OTHER: "OTHER";
};
export type TruckBrand = (typeof TRUCK_BRAND)[keyof typeof TRUCK_BRAND];
export declare const FUEL_TYPE: {
    readonly DIESEL: "DIESEL";
    readonly PETROL: "PETROL";
};
export type FuelType = (typeof FUEL_TYPE)[keyof typeof FUEL_TYPE];
export declare const BACKHAUL_STATUS: {
    readonly PENDING: "PENDING";
    readonly ACCEPTED: "ACCEPTED";
    readonly REJECTED: "REJECTED";
    readonly EXPIRED: "EXPIRED";
};
export type BackhaulStatus = (typeof BACKHAUL_STATUS)[keyof typeof BACKHAUL_STATUS];
export declare const CONSOLIDATED_LOAD_STATUS: {
    readonly COLLECTING: "COLLECTING";
    readonly READY: "READY";
    readonly IN_TRANSIT: "IN_TRANSIT";
    readonly DELIVERED: "DELIVERED";
    readonly CANCELLED: "CANCELLED";
};
export type ConsolidatedLoadStatus = (typeof CONSOLIDATED_LOAD_STATUS)[keyof typeof CONSOLIDATED_LOAD_STATUS];
export declare const SUB_LOAD_STATUS: {
    readonly PENDING: "PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly CANCELLED: "CANCELLED";
    readonly DELIVERED: "DELIVERED";
};
export type SubLoadStatus = (typeof SUB_LOAD_STATUS)[keyof typeof SUB_LOAD_STATUS];
export declare const AGGREGATOR_TYPE: {
    readonly FIELD_AGENT: "FIELD_AGENT";
    readonly CONSOLIDATION_AGENT: "CONSOLIDATION_AGENT";
    readonly ERP_SYSTEM: "ERP_SYSTEM";
    readonly SELF_ORGANIZED: "SELF_ORGANIZED";
};
export type AggregatorType = (typeof AGGREGATOR_TYPE)[keyof typeof AGGREGATOR_TYPE];
export declare const CONSOLIDATION_SHORTFALL_POLICY: {
    readonly PLATFORM_ABSORB: "PLATFORM_ABSORB";
    readonly DISTRIBUTE: "DISTRIBUTE";
    readonly AGENT_BEARS: "AGENT_BEARS";
};
export type ConsolidationShortfallPolicy = (typeof CONSOLIDATION_SHORTFALL_POLICY)[keyof typeof CONSOLIDATION_SHORTFALL_POLICY];
export declare const BROKER_SUGGESTION_STATUS: {
    readonly PENDING: "PENDING";
    readonly FLEET_ACCEPTED: "FLEET_ACCEPTED";
    readonly ORDERER_ACCEPTED: "ORDERER_ACCEPTED";
    readonly BOTH_ACCEPTED: "BOTH_ACCEPTED";
    readonly REJECTED: "REJECTED";
    readonly EXPIRED: "EXPIRED";
};
export type BrokerSuggestionStatus = (typeof BROKER_SUGGESTION_STATUS)[keyof typeof BROKER_SUGGESTION_STATUS];
export declare const DRIVER_EARNING_TYPE: {
    readonly ON_TIME_BONUS: "ON_TIME_BONUS";
    readonly CHECKPOINT_BONUS: "CHECKPOINT_BONUS";
    readonly FUEL_REPORT_BONUS: "FUEL_REPORT_BONUS";
    readonly BACKHAUL_BONUS: "BACKHAUL_BONUS";
    readonly PERFECT_WEEK: "PERFECT_WEEK";
    readonly ROAD_ALERT_BONUS: "ROAD_ALERT_BONUS";
};
export type DriverEarningType = (typeof DRIVER_EARNING_TYPE)[keyof typeof DRIVER_EARNING_TYPE];
export declare const DRIVER_EARNING_STATUS: {
    readonly PENDING: "PENDING";
    readonly PAID: "PAID";
};
export type DriverEarningStatus = (typeof DRIVER_EARNING_STATUS)[keyof typeof DRIVER_EARNING_STATUS];
export declare const LIQUIDITY_INCENTIVE_TYPE: {
    readonly GUARANTEED_MINIMUM: "GUARANTEED_MINIMUM";
    readonly FUEL_SUBSIDY: "FUEL_SUBSIDY";
    readonly BROKER_BONUS: "BROKER_BONUS";
    readonly DRIVER_BONUS: "DRIVER_BONUS";
};
export type LiquidityIncentiveType = (typeof LIQUIDITY_INCENTIVE_TYPE)[keyof typeof LIQUIDITY_INCENTIVE_TYPE];
export declare const VOUCHER_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly REDEEMED: "REDEEMED";
    readonly EXPIRED: "EXPIRED";
    readonly CANCELLED: "CANCELLED";
};
export type VoucherStatus = (typeof VOUCHER_STATUS)[keyof typeof VOUCHER_STATUS];
export declare const RECOVERY_RESOURCE_TYPE: {
    readonly MECHANIC: "MECHANIC";
    readonly TOW_TRUCK: "TOW_TRUCK";
    readonly REPLACEMENT_TRUCK: "REPLACEMENT_TRUCK";
    readonly FUEL_DELIVERY: "FUEL_DELIVERY";
};
export type RecoveryResourceType = (typeof RECOVERY_RESOURCE_TYPE)[keyof typeof RECOVERY_RESOURCE_TYPE];
export declare const TRIP_EVENT_TYPE: {
    readonly PICKUP_CONFIRMED: "PICKUP_CONFIRMED";
    readonly CHECKPOINT_LOGGED: "CHECKPOINT_LOGGED";
    readonly DELIVERY_CONFIRMED: "DELIVERY_CONFIRMED";
    readonly CARGO_CONDITION_RECORDED: "CARGO_CONDITION_RECORDED";
    readonly SOS_TRIGGERED: "SOS_TRIGGERED";
    readonly INCIDENT_REPORTED: "INCIDENT_REPORTED";
};
export type TripEventType = (typeof TRIP_EVENT_TYPE)[keyof typeof TRIP_EVENT_TYPE];
export declare const TRIP_EVENT_RECONCILIATION_STATUS: {
    readonly ACCEPTED: "ACCEPTED";
    readonly REJECTED: "REJECTED";
    readonly REQUIRES_REVIEW: "REQUIRES_REVIEW";
};
export type TripEventReconciliationStatus = (typeof TRIP_EVENT_RECONCILIATION_STATUS)[keyof typeof TRIP_EVENT_RECONCILIATION_STATUS];
export declare const REFERRAL_STATUS: {
    readonly PENDING: "PENDING";
    readonly QUALIFIED: "QUALIFIED";
    readonly REWARDED: "REWARDED";
};
export type ReferralStatus = (typeof REFERRAL_STATUS)[keyof typeof REFERRAL_STATUS];
export declare const SHIFT_DAY: {
    readonly MON: "MON";
    readonly TUE: "TUE";
    readonly WED: "WED";
    readonly THU: "THU";
    readonly FRI: "FRI";
    readonly SAT: "SAT";
    readonly SUN: "SUN";
};
export type ShiftDay = (typeof SHIFT_DAY)[keyof typeof SHIFT_DAY];
export declare const FUEL_PRICE_SOURCE: {
    readonly MANUAL: "MANUAL";
    readonly DRIVER_REPORT: "DRIVER_REPORT";
    readonly API: "API";
};
export type FuelPriceSource = (typeof FUEL_PRICE_SOURCE)[keyof typeof FUEL_PRICE_SOURCE];
export declare const AGENT_TYPE: {
    readonly FIELD_AGENT: "FIELD_AGENT";
    readonly CONSOLIDATION_AGENT: "CONSOLIDATION_AGENT";
};
export type AgentType = (typeof AGENT_TYPE)[keyof typeof AGENT_TYPE];
export declare const ROAD_ALERT_TYPES: {
    readonly POLICE_ACTIVE: "POLICE_ACTIVE";
    readonly WEIGHBRIDGE_STRICT: "WEIGHBRIDGE_STRICT";
    readonly ROAD_DAMAGE: "ROAD_DAMAGE";
    readonly FLOODING: "FLOODING";
    readonly FUEL_EMPTY: "FUEL_EMPTY";
    readonly ACCIDENT: "ACCIDENT";
    readonly ROAD_CLOSED: "ROAD_CLOSED";
    readonly CHECKPOINT_CLOSED: "CHECKPOINT_CLOSED";
};
export type RoadAlertType = (typeof ROAD_ALERT_TYPES)[keyof typeof ROAD_ALERT_TYPES];
export declare const FUEL_AVAILABILITY_STATUS: {
    readonly HAS_FUEL: "HAS_FUEL";
    readonly LIMITED: "LIMITED";
    readonly QUEUE_GT_1HR: "QUEUE_GT_1HR";
    readonly OUT: "OUT";
};
export type FuelAvailabilityStatus = (typeof FUEL_AVAILABILITY_STATUS)[keyof typeof FUEL_AVAILABILITY_STATUS];
//# sourceMappingURL=enums.d.ts.map