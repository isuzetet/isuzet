/**
 * RUIT CBE — Entity Status Enums and Constants
 * All enums from the database schema
 */

// User Status
export const USER_STATUS = {
  PENDING_KYC: 'PENDING_KYC',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLACKLISTED: 'BLACKLISTED',
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

// Truck Status
export const TRUCK_STATUS = {
  ACTIVE: 'ACTIVE',
  ON_TRIP: 'ON_TRIP',
  MAINTENANCE: 'MAINTENANCE',
  SUSPENDED: 'SUSPENDED',
  RETIRED: 'RETIRED',
} as const;
export type TruckStatus = (typeof TRUCK_STATUS)[keyof typeof TRUCK_STATUS];

// Load Status
export const LOAD_STATUS = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  QUOTING: 'QUOTING',
  MATCHED: 'MATCHED',
  READY_TO_MATCH: 'READY_TO_MATCH',
  DEPARTED: 'DEPARTED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;
export type LoadStatus = (typeof LOAD_STATUS)[keyof typeof LOAD_STATUS];

// Trip Status
export const TRIP_STATUS = {
  PENDING: 'PENDING',
  EN_ROUTE: 'EN_ROUTE',
  AT_CHECKPOINT: 'AT_CHECKPOINT',
  DELIVERED: 'DELIVERED',
  DISPUTED: 'DISPUTED',
  CANCELLED: 'CANCELLED',
  DELAYED: 'DELAYED',
  EMERGENCY: 'EMERGENCY',
} as const;
export type TripStatus = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];

// Assignment Status
export const ASSIGNMENT_STATUS = {
  SUGGESTED: 'SUGGESTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

// Incident Status
export const INCIDENT_STATUS = {
  OPEN: 'OPEN',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  EVIDENCE_COLLECTION: 'EVIDENCE_COLLECTION',
  AWAITING_RESOLUTION: 'AWAITING_RESOLUTION',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED',
  CLOSED: 'CLOSED',
} as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

// Incident Severity
export const INCIDENT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];

// Payment Model
export const PAYMENT_MODEL = {
  ESCROW: 'ESCROW',
  COD: 'COD',
  ROLLING_CREDIT: 'ROLLING_CREDIT',
  PARTIAL_ADVANCE: 'PARTIAL_ADVANCE',
} as const;
export type PaymentModel = (typeof PAYMENT_MODEL)[keyof typeof PAYMENT_MODEL];

// Truck Type
export const TRUCK_BODY_TYPE = {
  FLATBED: 'FLATBED',
  COVERED: 'COVERED',
  REFRIGERATED: 'REFRIGERATED',
  TANKER: 'TANKER',
  TIPPER: 'TIPPER',
  LOWBED: 'LOWBED',
  LIVESTOCK: 'LIVESTOCK',
  OTHER: 'OTHER',
} as const;
export type TruckBodyType = (typeof TRUCK_BODY_TYPE)[keyof typeof TRUCK_BODY_TYPE];

export const TRUCK_TYPE = {
  FLATBED: 'FLATBED',
  REEFER: 'REEFER',
  TANKER: 'TANKER',
  BOX: 'BOX',
  TIPPER: 'TIPPER',
  CURTAINSIDER: 'CURTAINSIDER',
} as const;
export type TruckType = (typeof TRUCK_TYPE)[keyof typeof TRUCK_TYPE];

// Cargo Type
export const CARGO_TYPE = {
  GENERAL: 'GENERAL',
  PERISHABLE: 'PERISHABLE',
  HAZMAT: 'HAZMAT',
  LIVESTOCK: 'LIVESTOCK',
  FMCG: 'FMCG',
  CONSTRUCTION: 'CONSTRUCTION',
  AGRICULTURE: 'AGRICULTURE',
  // Phase 10: New cargo types
  KHAT: 'KHAT',
  FRESH_FISH: 'FRESH_FISH',
  CUT_FLOWERS: 'CUT_FLOWERS',
  FROZEN_MEAT: 'FROZEN_MEAT',
  FRESH_PRODUCE: 'FRESH_PRODUCE',
  DAIRY: 'DAIRY',
  BAGGED_GRAIN: 'BAGGED_GRAIN',
  CEMENT: 'CEMENT',
  BEVERAGES: 'BEVERAGES',
  COFFEE: 'COFFEE',
  COTTON_SESAME: 'COTTON_SESAME',
  HONEY: 'HONEY',
} as const;

// Phase 10: Time-critical cargo types
export const TIME_CRITICAL_CARGO_TYPES = [
  CARGO_TYPE.KHAT,
  CARGO_TYPE.FRESH_FISH,
  CARGO_TYPE.CUT_FLOWERS,
  CARGO_TYPE.FROZEN_MEAT,
  CARGO_TYPE.FRESH_PRODUCE,
  CARGO_TYPE.DAIRY,
] as const;

// Phase 10: Livestock species
export const LIVESTOCK_SPECIES = {
  CATTLE: 'cattle',
  SHEEP: 'sheep',
  POULTRY: 'poultry',
} as const;

// Phase 10: Payment basis
export const PAYMENT_BASIS = {
  PER_KG: 'PER_KG',
  PER_HEAD: 'PER_HEAD',
} as const;

// Phase 10: Cold chain cargo types
export const COLD_CHAIN_CARGO_TYPES = [
  CARGO_TYPE.FROZEN_MEAT,
  CARGO_TYPE.FRESH_PRODUCE,
  CARGO_TYPE.DAIRY,
  CARGO_TYPE.CUT_FLOWERS,
] as const;
export type CargoType = (typeof CARGO_TYPE)[keyof typeof CARGO_TYPE];

// KYC Document Type
export const KYC_DOC_TYPE = {
  NATIONAL_ID: 'NATIONAL_ID',
  KEBELE_ID: 'KEBELE_ID',
  PASSPORT: 'PASSPORT',
  TRADE_LICENSE: 'TRADE_LICENSE',
  TIN_CERT: 'TIN_CERT',
  INSURANCE: 'INSURANCE',
  INSPECTION: 'INSPECTION',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
  BANK_STATEMENT: 'BANK_STATEMENT',
  VEHICLE_LOG_BOOK: 'VEHICLE_LOG_BOOK',
} as const;
export type KycDocType = (typeof KYC_DOC_TYPE)[keyof typeof KYC_DOC_TYPE];

// Transaction Type
export const TX_TYPE = {
  ESCROW_HOLD: 'ESCROW_HOLD',
  ESCROW_RELEASE: 'ESCROW_RELEASE',
  ADVANCE_PAYOUT: 'ADVANCE_PAYOUT',
  COMMISSION_DEDUCTION: 'COMMISSION_DEDUCTION',
  COD_LOG: 'COD_LOG',
  PENALTY: 'PENALTY',
  CREDIT_DRAWDOWN: 'CREDIT_DRAWDOWN',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type TxType = (typeof TX_TYPE)[keyof typeof TX_TYPE];

// Regional corridors
export const REGION = {
  NORTH: 'NORTH',
  SOUTH: 'SOUTH',
  EAST: 'EAST',
  WEST: 'WEST',
  CENTRAL: 'CENTRAL',
} as const;
export type Region = (typeof REGION)[keyof typeof REGION];

// Optimization Mode
export const OPTIMIZATION_MODE = {
  GROWTH: 'GROWTH',
  DENSITY: 'DENSITY',
  EFFICIENCY: 'EFFICIENCY',
  SHOCK: 'SHOCK',
} as const;
export type OptimizationMode = (typeof OPTIMIZATION_MODE)[keyof typeof OPTIMIZATION_MODE];

// Commission Config Type
export const COMMISSION_CONFIG_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
  TIERED: 'TIERED',
} as const;
export type CommissionConfigType = (typeof COMMISSION_CONFIG_TYPE)[keyof typeof COMMISSION_CONFIG_TYPE];

// Exposure Cap Scope
export const EXPOSURE_SCOPE = {
  CLIENT: 'CLIENT',
  FLEET: 'FLEET',
  CORRIDOR: 'CORRIDOR',
  SYSTEM: 'SYSTEM',
  CLUSTER: 'CLUSTER',
} as const;
export type ExposureScope = (typeof EXPOSURE_SCOPE)[keyof typeof EXPOSURE_SCOPE];

// Incident Type
export const INCIDENT_TYPE = {
  LATE_DELIVERY: 'LATE_DELIVERY',
  CARGO_DAMAGE: 'CARGO_DAMAGE',
  ROUTE_DEVIATION: 'ROUTE_DEVIATION',
  FRAUD: 'FRAUD',
  ACCIDENT: 'ACCIDENT',
  BREAKDOWN: 'BREAKDOWN',
  DISPUTE: 'DISPUTE',
  CARGO_SHORTAGE: 'CARGO_SHORTAGE',
  WRONG_DELIVERY: 'WRONG_DELIVERY',
  SOS: 'SOS',
  CHECKPOINT_FEE: 'CHECKPOINT_FEE',
  CARGO_DAMAGE_AT_PICKUP: 'CARGO_DAMAGE_AT_PICKUP',
  CARGO_DAMAGE_AT_DELIVERY: 'CARGO_DAMAGE_AT_DELIVERY',
  DEMURRAGE: 'DEMURRAGE',
  LOAD_CANCELLED: 'LOAD_CANCELLED',
} as const;
export type IncidentType = (typeof INCIDENT_TYPE)[keyof typeof INCIDENT_TYPE];

// Fraud Severity
export const FRAUD_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type FraudSeverity = (typeof FRAUD_SEVERITY)[keyof typeof FRAUD_SEVERITY];

// Shock Type
export const SHOCK_TYPE = {
  FUEL_SHORTAGE: 'FUEL_SHORTAGE',
  ROAD_CLOSURE: 'ROAD_CLOSURE',
  POLITICAL: 'POLITICAL',
  WEATHER: 'WEATHER',
  PAYMENT_CRISIS: 'PAYMENT_CRISIS',
  MANUAL: 'MANUAL',
} as const;
export type ShockType = (typeof SHOCK_TYPE)[keyof typeof SHOCK_TYPE];

// Road Type
export const ROAD_TYPE = {
  ASPHALT: 'ASPHALT',
  GRAVEL: 'GRAVEL',
  MIXED: 'MIXED',
} as const;
export type RoadType = (typeof ROAD_TYPE)[keyof typeof ROAD_TYPE];

// Corridor Status
export const CORRIDOR_STATUS = {
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  SEEDING: 'SEEDING',
  DEPRECATED: 'DEPRECATED',
} as const;
export type CorridorStatus = (typeof CORRIDOR_STATUS)[keyof typeof CORRIDOR_STATUS];

// Driver Status
export const DRIVER_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLACKLISTED: 'BLACKLISTED',
  ON_TRIP: 'ON_TRIP',
  AVAILABLE: 'AVAILABLE',
  RESTING: 'RESTING',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;
export type DriverStatus = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];

// Business Sector
export const BUSINESS_SECTOR = {
  FMCG: 'FMCG',
  AGRICULTURE: 'AGRICULTURE',
  MANUFACTURING: 'MANUFACTURING',
  CONSTRUCTION: 'CONSTRUCTION',
  RETAIL: 'RETAIL',
  OTHER: 'OTHER',
} as const;
export type BusinessSector = (typeof BUSINESS_SECTOR)[keyof typeof BUSINESS_SECTOR];

// Business Type
export const BUSINESS_TYPE = {
  SOLE_TRADER: 'SOLE_TRADER',
  COMPANY: 'COMPANY',
  COOPERATIVE: 'COOPERATIVE',
} as const;
export type BusinessType = (typeof BUSINESS_TYPE)[keyof typeof BUSINESS_TYPE];

// Notification Channel
export const NOTIFICATION_CHANNEL = {
  SMS: 'SMS',
  PUSH: 'PUSH',
  BOTH: 'BOTH',
} as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

// Checkpoint Type
export const CHECKPOINT_TYPE = {
  POLICE: 'POLICE',
  WEIGHBRIDGE: 'WEIGHBRIDGE',
  TOLL: 'TOLL',
  FUEL_POINT: 'FUEL_POINT',
  CITY_BOUNDARY: 'CITY_BOUNDARY',
  CUSTOMS: 'CUSTOMS',
} as const;
export type CheckpointType = (typeof CHECKPOINT_TYPE)[keyof typeof CHECKPOINT_TYPE];

// Transaction Direction
export const TX_DIRECTION = {
  IN: 'IN',
  OUT: 'OUT',
} as const;
export type TxDirection = (typeof TX_DIRECTION)[keyof typeof TX_DIRECTION];

// Expense Type
export const EXPENSE_TYPE = {
  FUEL: 'FUEL',
  MAINTENANCE: 'MAINTENANCE',
  SALARY: 'SALARY',
  INSURANCE: 'INSURANCE',
  LOAN: 'LOAN',
  CHECKPOINT_FEE: 'CHECKPOINT_FEE',
  LOADING_FEE: 'LOADING_FEE',
  OTHER: 'OTHER',
} as const;
export type ExpenseType = (typeof EXPENSE_TYPE)[keyof typeof EXPENSE_TYPE];

// Transaction Status
export const TX_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
  DISPUTED: 'DISPUTED',
} as const;
export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS];

// Maintenance Type
export const MAINTENANCE_TYPE = {
  OIL_CHANGE: 'OIL_CHANGE',
  TYRE_ROTATION: 'TYRE_ROTATION',
  BRAKE_SERVICE: 'BRAKE_SERVICE',
  ENGINE_SERVICE: 'ENGINE_SERVICE',
  FULL_SERVICE: 'FULL_SERVICE',
  REPAIR: 'REPAIR',
} as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPE)[keyof typeof MAINTENANCE_TYPE];

// Event Types List
export const ET_EVENT_NAME = {
  TIMKAT: 'TIMKAT',
  ENKUTATASH: 'ENKUTATASH',
  IRREECHA: 'IRREECHA',
  FASIKA: 'FASIKA',
  GENA: 'GENA',
  MAWLID: 'MAWLID',
  RAMADAN_START: 'RAMADAN_START',
  RAMADAN_END: 'RAMADAN_END',
  MARKET_DAY: 'MARKET_DAY',
  HARVEST_BELG: 'HARVEST_BELG',
  HARVEST_MEHER: 'HARVEST_MEHER',
  NATIONAL_HOLIDAY: 'NATIONAL_HOLIDAY',
} as const;
export type EtEventName = (typeof ET_EVENT_NAME)[keyof typeof ET_EVENT_NAME];

// Demand Impact
export const DEMAND_IMPACT = {
  HIGH_DEMAND: 'HIGH_DEMAND',
  LOW_DEMAND: 'LOW_DEMAND',
  NEUTRAL: 'NEUTRAL',
  ROUTE_DISRUPTION: 'ROUTE_DISRUPTION',
} as const;
export type DemandImpact = (typeof DEMAND_IMPACT)[keyof typeof DEMAND_IMPACT];

// Priority Levels
export const URGENCY_LEVEL = {
  FLEXIBLE: 1,
  NORMAL: 2,
  URGENT: 3,
  CRITICAL: 4,
} as const;
export type UrgencyLevel = (typeof URGENCY_LEVEL)[keyof typeof URGENCY_LEVEL];

// Payout Speed
export const PAYOUT_SPEED = {
  T0: 'T0',
  T1: 'T1',
  T3: 'T3',
  T7: 'T7',
} as const;
export type PayoutSpeed = (typeof PAYOUT_SPEED)[keyof typeof PAYOUT_SPEED];

// Medium-Haul Platform Enums
export const CORRIDOR_TYPE = {
  INTERCITY: 'INTERCITY',
  INTRACITY: 'INTRACITY',
  REGIONAL: 'REGIONAL',
} as const;
export type CorridorType = (typeof CORRIDOR_TYPE)[keyof typeof CORRIDOR_TYPE];

export const TRUCK_BRAND = {
  ISUZU: 'ISUZU',
  TATA: 'TATA',
  SINO: 'SINO',
  FAW: 'FAW',
  FOTON: 'FOTON',
  HINO: 'HINO',
  MERCEDES: 'MERCEDES',
  ASHOK_LEYLAND: 'ASHOK_LEYLAND',
  OTHER: 'OTHER',
} as const;
export type TruckBrand = (typeof TRUCK_BRAND)[keyof typeof TRUCK_BRAND];

export const FUEL_TYPE = {
  DIESEL: 'DIESEL',
  PETROL: 'PETROL',
} as const;
export type FuelType = (typeof FUEL_TYPE)[keyof typeof FUEL_TYPE];

export const BACKHAUL_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type BackhaulStatus = (typeof BACKHAUL_STATUS)[keyof typeof BACKHAUL_STATUS];

export const CONSOLIDATED_LOAD_STATUS = {
  COLLECTING: 'COLLECTING',
  READY: 'READY',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type ConsolidatedLoadStatus = (typeof CONSOLIDATED_LOAD_STATUS)[keyof typeof CONSOLIDATED_LOAD_STATUS];

export const SUB_LOAD_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  DELIVERED: 'DELIVERED',
} as const;
export type SubLoadStatus = (typeof SUB_LOAD_STATUS)[keyof typeof SUB_LOAD_STATUS];

export const AGGREGATOR_TYPE = {
  FIELD_AGENT: 'FIELD_AGENT',
  CONSOLIDATION_AGENT: 'CONSOLIDATION_AGENT',
  ERP_SYSTEM: 'ERP_SYSTEM',
  SELF_ORGANIZED: 'SELF_ORGANIZED',
} as const;
export type AggregatorType = (typeof AGGREGATOR_TYPE)[keyof typeof AGGREGATOR_TYPE];

export const CONSOLIDATION_SHORTFALL_POLICY = {
  PLATFORM_ABSORB: 'PLATFORM_ABSORB',
  DISTRIBUTE: 'DISTRIBUTE',
  AGENT_BEARS: 'AGENT_BEARS',
} as const;
export type ConsolidationShortfallPolicy = (typeof CONSOLIDATION_SHORTFALL_POLICY)[keyof typeof CONSOLIDATION_SHORTFALL_POLICY];

export const BROKER_SUGGESTION_STATUS = {
  PENDING: 'PENDING',
  FLEET_ACCEPTED: 'FLEET_ACCEPTED',
  ORDERER_ACCEPTED: 'ORDERER_ACCEPTED',
  BOTH_ACCEPTED: 'BOTH_ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type BrokerSuggestionStatus = (typeof BROKER_SUGGESTION_STATUS)[keyof typeof BROKER_SUGGESTION_STATUS];

export const DRIVER_EARNING_TYPE = {
  ON_TIME_BONUS: 'ON_TIME_BONUS',
  CHECKPOINT_BONUS: 'CHECKPOINT_BONUS',
  FUEL_REPORT_BONUS: 'FUEL_REPORT_BONUS',
  BACKHAUL_BONUS: 'BACKHAUL_BONUS',
  PERFECT_WEEK: 'PERFECT_WEEK',
  ROAD_ALERT_BONUS: 'ROAD_ALERT_BONUS',
} as const;
export type DriverEarningType = (typeof DRIVER_EARNING_TYPE)[keyof typeof DRIVER_EARNING_TYPE];

export const DRIVER_EARNING_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const;
export type DriverEarningStatus = (typeof DRIVER_EARNING_STATUS)[keyof typeof DRIVER_EARNING_STATUS];

export const LIQUIDITY_INCENTIVE_TYPE = {
  GUARANTEED_MINIMUM: 'GUARANTEED_MINIMUM',
  FUEL_SUBSIDY: 'FUEL_SUBSIDY',
  BROKER_BONUS: 'BROKER_BONUS',
  DRIVER_BONUS: 'DRIVER_BONUS',
} as const;
export type LiquidityIncentiveType = (typeof LIQUIDITY_INCENTIVE_TYPE)[keyof typeof LIQUIDITY_INCENTIVE_TYPE];

export const VOUCHER_STATUS = {
  ACTIVE: 'ACTIVE',
  REDEEMED: 'REDEEMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type VoucherStatus = (typeof VOUCHER_STATUS)[keyof typeof VOUCHER_STATUS];

export const RECOVERY_RESOURCE_TYPE = {
  MECHANIC: 'MECHANIC',
  TOW_TRUCK: 'TOW_TRUCK',
  REPLACEMENT_TRUCK: 'REPLACEMENT_TRUCK',
  FUEL_DELIVERY: 'FUEL_DELIVERY',
} as const;
export type RecoveryResourceType = (typeof RECOVERY_RESOURCE_TYPE)[keyof typeof RECOVERY_RESOURCE_TYPE];

export const TRIP_EVENT_TYPE = {
  PICKUP_CONFIRMED: 'PICKUP_CONFIRMED',
  CHECKPOINT_LOGGED: 'CHECKPOINT_LOGGED',
  DELIVERY_CONFIRMED: 'DELIVERY_CONFIRMED',
  CARGO_CONDITION_RECORDED: 'CARGO_CONDITION_RECORDED',
  SOS_TRIGGERED: 'SOS_TRIGGERED',
  INCIDENT_REPORTED: 'INCIDENT_REPORTED',
} as const;
export type TripEventType = (typeof TRIP_EVENT_TYPE)[keyof typeof TRIP_EVENT_TYPE];

export const TRIP_EVENT_RECONCILIATION_STATUS = {
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  REQUIRES_REVIEW: 'REQUIRES_REVIEW',
} as const;
export type TripEventReconciliationStatus = (typeof TRIP_EVENT_RECONCILIATION_STATUS)[keyof typeof TRIP_EVENT_RECONCILIATION_STATUS];

export const REFERRAL_STATUS = {
  PENDING: 'PENDING',
  QUALIFIED: 'QUALIFIED',
  REWARDED: 'REWARDED',
} as const;
export type ReferralStatus = (typeof REFERRAL_STATUS)[keyof typeof REFERRAL_STATUS];

export const SHIFT_DAY = {
  MON: 'MON',
  TUE: 'TUE',
  WED: 'WED',
  THU: 'THU',
  FRI: 'FRI',
  SAT: 'SAT',
  SUN: 'SUN',
} as const;
export type ShiftDay = (typeof SHIFT_DAY)[keyof typeof SHIFT_DAY];

export const FUEL_PRICE_SOURCE = {
  MANUAL: 'MANUAL',
  DRIVER_REPORT: 'DRIVER_REPORT',
  API: 'API',
} as const;
export type FuelPriceSource = (typeof FUEL_PRICE_SOURCE)[keyof typeof FUEL_PRICE_SOURCE];

export const AGENT_TYPE = {
  FIELD_AGENT: 'FIELD_AGENT',
  CONSOLIDATION_AGENT: 'CONSOLIDATION_AGENT',
} as const;
export type AgentType = (typeof AGENT_TYPE)[keyof typeof AGENT_TYPE];

// Phase 9: Road Alert Types
export const ROAD_ALERT_TYPES = {
  POLICE_ACTIVE: 'POLICE_ACTIVE',
  WEIGHBRIDGE_STRICT: 'WEIGHBRIDGE_STRICT',
  ROAD_DAMAGE: 'ROAD_DAMAGE',
  FLOODING: 'FLOODING',
  FUEL_EMPTY: 'FUEL_EMPTY',
  ACCIDENT: 'ACCIDENT',
  ROAD_CLOSED: 'ROAD_CLOSED',
  CHECKPOINT_CLOSED: 'CHECKPOINT_CLOSED',
} as const;

// Phase 9: Fuel Availability Status
export const FUEL_AVAILABILITY_STATUS = {
  HAS_FUEL: 'HAS_FUEL',
  LIMITED: 'LIMITED',
  QUEUE_GT_1HR: 'QUEUE_GT_1HR',
  OUT: 'OUT',
} as const;
export type FuelAvailabilityStatus = (typeof FUEL_AVAILABILITY_STATUS)[keyof typeof FUEL_AVAILABILITY_STATUS];

// Phase 5: Cargo Offer Status
// CARGO_OFFER_STATUS and TRIP_STOP_STATUS are defined as Prisma enums in schema.prisma
// They are auto-generated into the Prisma client and should be imported from there if needed.
// Duplicate TypeScript enum definitions have been removed to maintain consistency.

export enum PricingMode {
  CONSOLIDATED = 'CONSOLIDATED',
  // Per-quintal pricing: multiple traders can share a truck
  // Price formula: baseRatePerKmPerQuintal * distance * weight * multipliers
  CHARTER = 'CHARTER',
  // Per-truck pricing: full truck chartered for a route
  // Price formula: charterBasePrice * cargoMultiplier * seasonalMultiplier
}

export enum CharterTruckSize {
  THREE_TON  = '3TON',
  FIVE_TON   = '5TON',
  SEVEN_TON  = '7TON',
  TEN_TON    = '10TON',
  FIFTEEN_TON = '15TON',
}

export enum RoadAlertType {
  POLICE_CHECKPOINT        = 'POLICE_CHECKPOINT',
  WEIGHBRIDGE_STRICT       = 'WEIGHBRIDGE_STRICT',
  ROAD_DAMAGE              = 'ROAD_DAMAGE',
  FLOODING_PASSABLE        = 'FLOODING_PASSABLE',
  FLOODING_IMPASSABLE      = 'FLOODING_IMPASSABLE',
  ACCIDENT_BLOCKING        = 'ACCIDENT_BLOCKING',
  ACCIDENT_CLEARED         = 'ACCIDENT_CLEARED',
  ROAD_CLOSED              = 'ROAD_CLOSED',
  FUEL_STATION_EMPTY       = 'FUEL_STATION_EMPTY',
  FUEL_STATION_LIMITED     = 'FUEL_STATION_LIMITED',
  SECURITY_ELEVATED        = 'SECURITY_ELEVATED',
  SECURITY_AVOID           = 'SECURITY_AVOID',
  CHECKPOINT_INTENSITY_NORMAL        = 'CHECKPOINT_INTENSITY_NORMAL',
  CHECKPOINT_INTENSITY_HEAVY         = 'CHECKPOINT_INTENSITY_HEAVY',
  CHECKPOINT_INTENSITY_CONFISCATION  = 'CHECKPOINT_INTENSITY_CONFISCATION',
}

export enum RoadAlertSeverity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RoadAlertSource {
  DRIVER_APP        = 'DRIVER_APP',
  DRIVER_USSD       = 'DRIVER_USSD',
  OPS_TEAM          = 'OPS_TEAM',
  TELEGRAM_HARVEST  = 'TELEGRAM_HARVEST',
  SYSTEM            = 'SYSTEM',
}

// ═══════════════════════════════════════════════════════════════════
// FUEL, EARNINGS, DOCUMENTS, AND RATINGS ENUMS
// ═══════════════════════════════════════════════════════════════════

export enum DocumentType {
  DRIVER_LICENSE          = 'DRIVER_LICENSE',
  VEHICLE_INSURANCE       = 'VEHICLE_INSURANCE',
  VEHICLE_INSPECTION      = 'VEHICLE_INSPECTION',
  ROAD_WORTHINESS         = 'ROAD_WORTHINESS',
  // Certificate of roadworthiness from NTSA/transport authority
  VEHICLE_REGISTRATION    = 'VEHICLE_REGISTRATION',
  GOODS_TRANSIT_PERMIT    = 'GOODS_TRANSIT_PERMIT',
  COOPERATIVE_MEMBERSHIP  = 'COOPERATIVE_MEMBERSHIP',
  HAZMAT_PERMIT           = 'HAZMAT_PERMIT',
}

export enum DocumentAlertStatus {
  UPCOMING   = 'UPCOMING',
  // Document expires in > 14 days — first warning
  WARNING    = 'WARNING',
  // Document expires in 8-14 days
  URGENT     = 'URGENT',
  // Document expires in 1-7 days
  EXPIRED    = 'EXPIRED',
  // Document has already expired
  RESOLVED   = 'RESOLVED',
  // Driver/fleet owner has uploaded renewed document
}

export enum OffPlatformTripStatus {
  REPORTED   = 'REPORTED',
  // Driver self-reported this trip
  VERIFIED   = 'VERIFIED',
  // Trip verified via field agent or supporting evidence
  DISPUTED   = 'DISPUTED',
  // Ops team flagged this report as suspicious
  ARCHIVED   = 'ARCHIVED',
  // Old trip archived after 90 days
}

// ═══════════════════════════════════════════════════════════════════
// TRUST SCORE, DISPUTE RESOLUTION, AND PAYMENT RAIL ENUMS
// ═══════════════════════════════════════════════════════════════════

export enum PaymentRailType {
  TELEBIRR         = 'TELEBIRR',
  CBE_BIRR         = 'CBE_BIRR',
  AMOLE            = 'AMOLE',
  HELLOCASH        = 'HELLOCASH',
  AWASH_WALLET     = 'AWASH_WALLET',
  BANK_TRANSFER    = 'BANK_TRANSFER',
}

export enum TrustScoreEventType {
  TRIP_COMPLETED        = 'TRIP_COMPLETED',
  // +points for completing a trip successfully
  TRIP_CANCELLED        = 'TRIP_CANCELLED',
  // -points for cancelling after acceptance
  NO_SHOW               = 'NO_SHOW',
  // -points for not showing up
  LATE_DELIVERY         = 'LATE_DELIVERY',
  // -points for arriving significantly late
  CARGO_DAMAGE          = 'CARGO_DAMAGE',
  // -points for damaged cargo reported
  POSITIVE_RATING       = 'POSITIVE_RATING',
  // +points from orderer rating
  NEGATIVE_RATING       = 'NEGATIVE_RATING',
  // -points from orderer rating
  DISPUTE_RESOLVED_FOR  = 'DISPUTE_RESOLVED_FOR',
  // +points when dispute resolved in driver's favor
  DISPUTE_RESOLVED_AGAINST = 'DISPUTE_RESOLVED_AGAINST',
  // -points when dispute resolved against driver
  ROAD_ALERT_VERIFIED   = 'ROAD_ALERT_VERIFIED',
  // +points when driver's road alert gets verified
  MANUAL_ADJUSTMENT     = 'MANUAL_ADJUSTMENT',
  // Ops team manual adjustment with required note
  TIER_BONUS            = 'TIER_BONUS',
  // Points bonus when reaching new tier
  DECAY                 = 'DECAY',
  // Periodic decay for inactive drivers
  COLD_START_GRANT      = 'COLD_START_GRANT',
  // Initial score grant for new drivers
}

export enum DisputeStatus {
  OPEN          = 'OPEN',
  UNDER_REVIEW  = 'UNDER_REVIEW',
  RESOLVED      = 'RESOLVED',
  ESCALATED     = 'ESCALATED',
  // Escalated to senior ops or external arbitration
  WITHDRAWN     = 'WITHDRAWN',
  // Party that raised dispute withdrew it
}

export enum DisputeOutcome {
  DRIVER_FAVOR    = 'DRIVER_FAVOR',
  ORDERER_FAVOR   = 'ORDERER_FAVOR',
  SPLIT           = 'SPLIT',
  // Compromise: partial refund or partial blame
  NO_FAULT        = 'NO_FAULT',
  // Resolved with no fault assigned to either party
  INCONCLUSIVE    = 'INCONCLUSIVE',
  // Could not determine outcome with available evidence
}

export enum PayoutStatus {
  PENDING     = 'PENDING',
  INITIATED   = 'INITIATED',
  // Request sent to payment provider
  COMPLETED   = 'COMPLETED',
  FAILED      = 'FAILED',
  REVERSED    = 'REVERSED',
  // Payout was reversed after completion
}

export enum MicroLoanStatus {
  PENDING    = 'PENDING',
  APPROVED   = 'APPROVED',
  DISBURSED  = 'DISBURSED',
  REPAID     = 'REPAID',
  DEFAULTED  = 'DEFAULTED',
  CANCELLED  = 'CANCELLED',
}

export enum CorridorImbalanceDirection {
  OUTBOUND_SURPLUS  = 'OUTBOUND_SURPLUS',
  // Too many trucks going FROM origin TO destination
  // (backhaul problem — drivers go empty returning)
  INBOUND_SURPLUS   = 'INBOUND_SURPLUS',
  // Too many trucks going the reverse direction
  BILATERAL_DEFICIT = 'BILATERAL_DEFICIT',
  // Not enough trucks in either direction
  BILATERAL_SURPLUS = 'BILATERAL_SURPLUS',
  // Too many trucks available in both directions
}

export enum BalancingInterventionType {
  PRICE_INCENTIVE         = 'PRICE_INCENTIVE',
  // Temporarily increase rate on underserved direction
  BACKHAUL_NUDGE          = 'BACKHAUL_NUDGE',
  // Push backhaul load notifications to drivers currently on outbound leg
  COOPERATIVE_ROUTING     = 'COOPERATIVE_ROUTING',
  // Suggest cooperative members pool for underserved corridor
  DRIVER_NOTIFICATION     = 'DRIVER_NOTIFICATION',
  // Broadcast corridor alert to available drivers in nearby zones
  LOAD_CONSOLIDATION      = 'LOAD_CONSOLIDATION',
  // Suggest consolidating pending loads to attract more trucks
  MANUAL_INTERVENTION     = 'MANUAL_INTERVENTION',
  // Ops team manually intervened (phone calls, agent dispatch)
}
