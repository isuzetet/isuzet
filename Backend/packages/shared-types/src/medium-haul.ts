/**
 * Isuzet Medium-Haul Platform — TypeScript Interfaces
 * All data structures for medium-haul and intra-city freight optimization
 */

import type {
  CorridorType,
  TruckBrand,
  FuelType,
  FuelPriceSource,
  BackhaulStatus,
  ConsolidatedLoadStatus,
  SubLoadStatus,
  AggregatorType,
  ConsolidationShortfallPolicy,
  BrokerSuggestionStatus,
  DriverEarningType,
  DriverEarningStatus,
  LiquidityIncentiveType,
  VoucherStatus,
  RecoveryResourceType,
  TripEventType,
  TripEventReconciliationStatus,
  ReferralStatus,
  AgentType,
} from './enums.js';

export interface ZoneData {
  id: string;
  name: string;
  nameAmharic: string;
  city: string;
  boundingBoxNorthLat: number;
  boundingBoxSouthLat: number;
  boundingBoxEastLng: number;
  boundingBoxWestLng: number;
  centerLat: number;
  centerLng: number;
  isCommercial: boolean;
  adjacentZoneIds: string[];
  truckDemandIndex: number;
  averageTransitMinutesOffPeak: number;
  averageTransitMinutesPeak: number;
}

export interface TerminalData {
  id: string;
  name: string;
  nameAmharic: string;
  zoneId: string;
  lat: number;
  lng: number;
  currentQueueCount: number;
  averageWaitTimeMinutes: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  isMajorInterchange: boolean;
  hasOvernightParking: boolean;
  hasFuelNearby: boolean;
  hasMechanic: boolean;
  queueRadiusMeters: number;
  presencePingIntervalMinutes: number;
  absenceGracePeriodMinutes: number;
}

export interface BackhaulSuggestionData {
  id: string;
  sourceTripId: string;
  suggestedLoadId: string;
  truckId: string;
  driverId: string;
  fleetOwnerId: string;
  projectedFreeAt: string;
  projectedFreeLat: number;
  projectedFreeLng: number;
  distanceToPickupKm: number;
  matchScore: number;
  status: BackhaulStatus;
  bonusOfferedEtb: number;
  isNightRestricted: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface ConsolidatedLoadData {
  id: string;
  masterLoadId: string;
  consolidationType: string;
  aggregatorId: string;
  aggregatorType: AggregatorType;
  originCity: string;
  destinationCity: string;
  corridorId: string;
  totalWeightKg: number;
  totalEscrowEtb: number;
  status: ConsolidatedLoadStatus;
  collectionDeadline: string;
  minimumFillPct: number;
  currentFillPct: number;
  shortfallPolicy: ConsolidationShortfallPolicy;
  subLoads: SubLoadData[];
}

export interface SubLoadData {
  id: string;
  consolidatedLoadId: string;
  ordererId: string;
  weightKg: number;
  weightQuintals: number;
  cargoDescription: string;
  escrowAmountEtb: number;
  status: SubLoadStatus;
  createdAt: string;
}

export interface CheckpointIntelligenceData {
  id: string;
  corridorId: string;
  lat: number;
  lng: number;
  checkpointType: string;
  locationName: string;
  averageFeeEtb: number;
  maxFeeEtb: number;
  reportCount: number;
  isOfficialToll: boolean;
  lastReportedAt: string;
}

export interface WeighbridgeLogData {
  id: string;
  tripId: string;
  truckId: string;
  locationName: string;
  recordedWeightKg: number;
  legalLimitKg: number;
  toleranceKg: number;
  wasOverweight: boolean;
  withinTolerance: boolean;
  fineAmountEtb: number;
  delayMinutes: number;
  loggedAt: string;
}

export interface FuelPriceSnapshotData {
  id: string;
  recordedAt: string;
  dieselPriceEtbPerLiter: number;
  petrolPriceEtbPerLiter: number;
  region: string;
  source: FuelPriceSource;
}

export interface DigitalVoucherData {
  id: string;
  tripId: string;
  loadId: string;
  amountEtb: number;
  issuedToDriverId: string;
  status: VoucherStatus;
  expiresAt: string;
  signature: string;
}

export interface RecoveryResourceData {
  id: string;
  name: string;
  resourceType: RecoveryResourceType;
  ownerPhone: string;
  lat: number;
  lng: number;
  zoneId: string;
  specializations: string[];
  averageResponseMinutes: number;
  isVerified: boolean;
  rating: number;
}

export interface FleetLiveState {
  truckId: string;
  plateNumber: string;
  currentLat: number | null;
  currentLng: number | null;
  currentZoneId: string | null;
  currentZoneName: string | null;
  status: string;
  driverName: string | null;
  currentLoadId: string | null;
  availableFromAt: string | null;
  lastPingAt: string | null;
}

export interface ZoneDemandState {
  zoneId: string;
  zoneName: string;
  availableTrucks: number;
  openLoads: number;
  demandIndex: number;
  terminalQueueCount: number;
}

export interface TripEconomics {
  loadId: string;
  grossRevenueEtb: number;
  fuelCostEstimateEtb: number;
  checkpointFeesEtb: number;
  platformCommissionEtb: number;
  brokerCommissionEtb: number;
  driverBonusEtb: number;
  netPayoutToFleetEtb: number;
  revenuePerKm: number;
  revenuePerQuintal: number;
}

export interface IsuzetAnalyticsScore {
  fleetOwnerId: string;
  score: number;
  trustTierScore: number;
  documentComplianceScore: number;
  utilizationScore: number;
  onTimeScore: number;
  computedAt: string;
  isFrozenForMaintenance: boolean;
}
