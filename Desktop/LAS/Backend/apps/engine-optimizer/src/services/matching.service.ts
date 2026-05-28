/**
 * RUIT CBE - Engine 2: WDM Matching Service
 * Implements Weighted Driver Matching (WDM) algorithm with Phase 2 enhancements
 * Phase 4: Added multi-stop zone bonus support
 * Phase 7: Added zero-history branching, open queue mode, home zone return bonus
 * Phase 16: Added block/preference integration
 */
import { prisma } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { WdmWeights, StrategyConfig } from '@ruit/shared-db';

// Haversine formula for distance calculation (from backhaul.service.ts)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * PHASE 16: Check if two users have block/preference relationship
 * Returns { blocked, preferred }
 */
async function checkBlockPreferenceStatus(
  fromUserId: string,
  toUserId: string
): Promise<{ blocked: boolean; preferred: boolean }> {
  try {
    // Check both directions for block
    const fromBlocks = await prisma.loadBlockPreference.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
    });

    const toBlocks = await prisma.loadBlockPreference.findUnique({
      where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
    });

    const blocked =
      fromBlocks?.type === 'BLOCKED' ||
      toBlocks?.type === 'BLOCKED';

    // Check for mutual PREFERRED
    const mutualPreferred =
      fromBlocks?.type === 'PREFERRED' &&
      toBlocks?.type === 'PREFERRED';

    return {
      blocked,
      preferred: !!mutualPreferred,
    };
  } catch (error) {
    console.error('[WDM] checkBlockPreferenceStatus error:', error);
    return { blocked: false, preferred: false };
  }
}

interface WDMScoreInput {
  driver: {
    id: string;
    trustScore?: number;
    onTimeRate?: number;
    availabilityStatus?: string;
    preferredCorridorIds?: string[];
    currentZoneId?: string | null;
    currentLat?: number | null;
    currentLng?: number | null;
    routeFamiliarityScore?: any;
    completedTripCount?: number;
    homeZoneId?: string | null;
  };
  truck: {
    id: string;
    currentLat?: number | null;
    currentLng?: number | null;
    currentZoneId?: string | null;
  };
  load: {
    id: string;
    corridorId: string;
    pickupZoneId?: string | null;
    stops: Array<{
      lat?: number | null;
      lng?: number | null;
      stopType: string;
      zoneId?: string | null;
    }>;
  };
  corridor: {
    id: string;
    corridorType: string; // 'INTRACITY' | 'INTERCITY' | 'REGIONAL'
    destinationZoneId?: string | null;
  };
}

interface WDMScoreResult {
  finalScore: number;
  isGuaranteedOffer?: boolean;
  factorScores: {
    proximityScore: number;
    zoneMatch: number;
    corridorFamiliarity: number;
    trustScore: number;
    onTimeRate: number;
    availability: number;
    routeFamiliarity: number;
    loadPreference: number;
    multiStopZoneBonus: number;
    homeZoneReturnBonus: number;
  };
  details: {
    distanceMeters?: number;
    isPeakHours?: boolean;
    isPreferredCorridor?: boolean;
    hasAllStopZones?: boolean;
    hasHomeZoneMatch?: boolean;
    usedDefaults?: boolean;
  };
}

/**
 * Calculate multi-stop zone bonus
 * When load has 2+ stops, drivers who have previous trips to ALL of the stops' zones get a bonus
 * This is additive on top of the routeFamiliarity factor
 * Returns: multiStopZoneBonusbandScore from config if driver has visited all zones, 0 otherwise
 */
async function calculateMultiStopZoneBonus(
  driverId: string,
  load: WDMScoreInput['load']
): Promise<number> {
  // If fewer than 2 stops, no multi-stop bonus
  if (load.stops.length < 2) {
    return 0;
  }

  // Get unique zone IDs from stops (excluding pickup, focusing on delivery zones)
  const stopZoneIds = load.stops
    .filter(s => s.stopType === 'DROPOFF' || s.zoneId)
    .map(s => s.zoneId)
    .filter((z): z is string => z !== null && z !== undefined);

  if (stopZoneIds.length === 0) {
    return 0;
  }

  const uniqueZoneIds = [...new Set(stopZoneIds)];

  // Get zones that driver has previously visited (from trip history)
  const driverZones = await (prisma as any).trip.findMany({
    where: {
      driverId: driverId,
      status: 'COMPLETED',
    },
    select: {
      destinationZoneId: true,
    },
    distinct: ['destinationZoneId'],
  });

  const visitedZoneIds = new Set(
    driverZones.map((t: any) => t.destinationZoneId).filter((z: string | null) => z !== null)
  );

  // Check if driver has visited ALL stop zones
  const hasAllZones = uniqueZoneIds.every(zoneId => visitedZoneIds.has(zoneId));

  if (!hasAllZones) {
    return 0;
  }

  // Get bonus from config (default 0.05 from DEFAULT_CONFIG)
  try {
    const config = await getConfig();
    return (config as any).multiStopZoneBonusScore ?? 0.05;
  } catch {
    return 0.05;
  }
}

/**
 * Calculate proximity score based on truck distance to first PICKUP stop
 * Score: distance < 2km = 1.0, < 5km = 0.8, < 10km = 0.6, < 20km = 0.4, < 50km = 0.2, >= 50km = 0.0
 */
function calculateProximityScore(truck: WDMScoreInput['truck'], load: WDMScoreInput['load']): number {
  // Get first PICKUP stop
  const firstPickup = load.stops.find(s => s.stopType === 'PICKUP');
  if (!firstPickup) return 0.5; // Neutral if no pickup stop found

  // If truck has no current location, return neutral score
  const truckLat = truck.currentLat;
  const truckLng = truck.currentLng;
  if (truckLat === null || truckLat === undefined || truckLng === null || truckLng === undefined) {
    return 0.5; // Neutral score when location unknown
  }

  // If pickup has no location, return neutral score
  const pickupLat = firstPickup.lat;
  const pickupLng = firstPickup.lng;
  if (pickupLat === null || pickupLat === undefined || pickupLng === null || pickupLng === undefined) {
    return 0.5;
  }

  const distance = haversineDistance(
    Number(truckLat),
    Number(truckLng),
    Number(pickupLat),
    Number(pickupLng)
  );

  // Distance in meters - score thresholds
  if (distance < 2000) return 1.0;
  if (distance < 5000) return 0.8;
  if (distance < 10000) return 0.6;
  if (distance < 20000) return 0.4;
  if (distance < 50000) return 0.2;
  return 0.0;
}

/**
 * Calculate zone match score
 * Only meaningful if corridor.corridorType = 'INTRACITY'
 * If INTRACITY: truck.currentZoneId === load.pickupZoneId → 1.0
 *                truck.currentZoneId in load.pickupZone.adjacentZoneIds → 0.5
 *                otherwise → 0.0
 * If not INTRACITY: always 0.5 (neutral)
 */
async function calculateZoneMatch(
  truck: WDMScoreInput['truck'],
  load: WDMScoreInput['load'],
  corridor: WDMScoreInput['corridor']
): Promise<number> {
  // If not INTRACITY corridor, return neutral score
  if (corridor.corridorType !== 'INTRACITY') {
    return 0.5;
  }

  const truckZoneId = truck.currentZoneId;
  const pickupZoneId = load.pickupZoneId;

  if (!truckZoneId || !pickupZoneId) {
    return 0.5; // Neutral if missing zone data
  }

  // Exact zone match
  if (truckZoneId === pickupZoneId) {
    return 1.0;
  }

  // Check adjacent zones
  const pickupZone = await prisma.zone.findUnique({
    where: { id: pickupZoneId },
    select: { adjacentZoneIds: true },
  });

  if (pickupZone?.adjacentZoneIds?.includes(truckZoneId)) {
    return 0.5;
  }

  return 0.0;
}

/**
 * Calculate corridor familiarity score
 * If load.corridorId in driver.preferredCorridorIds → 1.0
 * Else → 0.0
 */
function calculateCorridorFamiliarity(
  driver: WDMScoreInput['driver'],
  load: WDMScoreInput['load']
): number {
  const preferredCorridors = driver.preferredCorridorIds || [];
  if (preferredCorridors.includes(load.corridorId)) {
    return 1.0;
  }
  return 0.0;
}

/**
 * Calculate existing WDM factors (placeholder implementations)
 * These would be computed from actual driver/truck/load data
 */
function calculateExistingFactors(
  driver: WDMScoreInput['driver'],
  useDefaults: boolean = false,
  config?: StrategyConfig
): {
  trustScore: number;
  onTimeRate: number;
  availability: number;
  routeFamiliarity: number;
  loadPreference: number;
} {
  if (useDefaults && config) {
    // Use cold-start defaults from config
    return {
      trustScore: config.zeroHistoryStartingTrustScore / 100, // Convert 0-100 to 0-1
      onTimeRate: config.zeroHistoryOnTimeRateDefault,
      availability: driver.availabilityStatus === 'AVAILABLE' ? 1.0 : 0.0,
      routeFamiliarity: config.zeroHistoryRouteFamiliarityDefault,
      loadPreference: 0.5, // Neutral default
    };
  }

  // Trust score (0-100 scale normalized to 0-1)
  const trustScore = driver.trustScore ? Number(driver.trustScore) / 100 : 0.5;
  // On-time rate (already 0-1 scale)
  const onTimeRate = driver.onTimeRate ? Number(driver.onTimeRate) : 0.5;
  // Availability (1.0 if AVAILABLE, 0.0 otherwise)
  const availability = driver.availabilityStatus === 'AVAILABLE' ? 1.0 : 0.0;
  // Route familiarity (from stored score)
  const routeFamiliarity =
    driver.routeFamiliarityScore && typeof driver.routeFamiliarityScore === 'object' && 'score' in driver.routeFamiliarityScore
      ? Number(driver.routeFamiliarityScore.score)
      : 0.5;
  // Load preference (simplified - would check preferred truck types)
  const loadPreference = 0.5; // Neutral default

  return { trustScore, onTimeRate, availability, routeFamiliarity, loadPreference };
}

/**
 * Check if driver has home zone match (homeZoneId matches any load destination zone)
 */
function hasHomeZoneMatch(
  driver: WDMScoreInput['driver'],
  load: WDMScoreInput['load'],
  corridor: WDMScoreInput['corridor']
): boolean {
  const driverHomeZoneId = driver.homeZoneId;
  if (!driverHomeZoneId) {
    return false;
  }

  // Check if load has destination zone matching driver's home zone
  // First check corridor destination
  if (corridor.destinationZoneId === driverHomeZoneId) {
    return true;
  }

  // Check any dropoff stops
  const dropoffStops = load.stops.filter(s => s.stopType === 'DROPOFF');
  for (const stop of dropoffStops) {
    if (stop.zoneId === driverHomeZoneId) {
      return true;
    }
  }

  return false;
}

/**
 * Verify WDM weights sum to 1.0
 */
function verifyWeightsSumToOne(weights: WdmWeights): boolean {
  const sum =
    weights.proximity +
    weights.trust +
    weights.onTimeRate +
    weights.availability +
    weights.routeFamiliarity +
    weights.loadPreference +
    weights.zoneMatch +
    weights.corridorFamiliarity;

  if (Math.abs(sum - 1.0) > 0.001) {
    console.warn(`[WDM] WARNING: Weights sum to ${sum.toFixed(4)}, expected 1.0`);
    return false;
  }
  return true;
}

/**
 * Calculate complete WDM score with all Phase 2 factors
 * Phase 4: Added multi-stop zone bonus for loads with 2+ stops
 * Phase 7: Added zero-history branching, open queue mode, home zone return bonus
 */
export async function calculateWDMatchScore(input: WDMScoreInput): Promise<WDMScoreResult> {
  const config = await getConfig();

  // VERIFY WEIGHTS SUM TO 1.0 BEFORE CALCULATION
  const weightsValid = verifyWeightsSumToOne(config.wdmWeights);
  if (!weightsValid) {
    console.warn('[WDM] Weight configuration validation failed');
  }

  // PHASE 7: ZERO-HISTORY BRANCHING
  const completedTrips = input.driver.completedTripCount ?? 0;

  // Tier 1: < 3 trips - Guaranteed offer, bypass WDM
  if (completedTrips < 3) {
    return {
      finalScore: 1.0, // Maximum score for guaranteed offers
      isGuaranteedOffer: true,
      factorScores: {
        proximityScore: 1.0,
        zoneMatch: 1.0,
        corridorFamiliarity: 1.0,
        trustScore: config.zeroHistoryStartingTrustScore / 100,
        onTimeRate: config.zeroHistoryOnTimeRateDefault,
        availability: 1.0,
        routeFamiliarity: config.zeroHistoryRouteFamiliarityDefault,
        loadPreference: 1.0,
        multiStopZoneBonus: 0,
        homeZoneReturnBonus: 0,
      },
      details: {
        hasAllStopZones: false,
        hasHomeZoneMatch: false,
      },
    };
  }

  // Calculate new Phase 2 factors
  const proximityScore = calculateProximityScore(input.truck, input.load);
  const zoneMatch = await calculateZoneMatch(input.truck, input.load, input.corridor);
  const corridorFamiliarity = calculateCorridorFamiliarity(input.driver, input.load);

  // Tier 2: 3-9 trips - Use WDM but with cold-start defaults
  const useColdStartDefaults = completedTrips >= 3 && completedTrips < 10;
  const existingFactors = calculateExistingFactors(input.driver, useColdStartDefaults, config);

  // Calculate multi-stop zone bonus (Phase 4)
  const multiStopZoneBonus = await calculateMultiStopZoneBonus(input.driver.id, input.load);

  // Calculate weighted raw score (before home zone bonus)
  const rawScore =
    proximityScore * config.wdmWeights.proximity +
    zoneMatch * config.wdmWeights.zoneMatch +
    corridorFamiliarity * config.wdmWeights.corridorFamiliarity +
    existingFactors.trustScore * config.wdmWeights.trust +
    existingFactors.onTimeRate * config.wdmWeights.onTimeRate +
    existingFactors.availability * config.wdmWeights.availability +
    existingFactors.routeFamiliarity * config.wdmWeights.routeFamiliarity +
    existingFactors.loadPreference * config.wdmWeights.loadPreference +
    multiStopZoneBonus;

  // PHASE 7: HOME ZONE RETURN BONUS (additive, after weighted sum)
  const homeZoneMatch = hasHomeZoneMatch(input.driver, input.load, input.corridor);
  const homeZoneReturnBonus = homeZoneMatch ? config.homeZoneReturnBonus : 0;
  const finalScore = Math.min(1.0, Math.max(0, rawScore + homeZoneReturnBonus));

  return {
    finalScore,
    factorScores: {
      proximityScore,
      zoneMatch,
      corridorFamiliarity,
      trustScore: existingFactors.trustScore,
      onTimeRate: existingFactors.onTimeRate,
      availability: existingFactors.availability,
      routeFamiliarity: existingFactors.routeFamiliarity,
      loadPreference: existingFactors.loadPreference,
      multiStopZoneBonus,
      homeZoneReturnBonus,
    },
    details: {
      isPreferredCorridor: corridorFamiliarity === 1.0,
      hasAllStopZones: multiStopZoneBonus > 0,
      hasHomeZoneMatch: homeZoneMatch,
      usedDefaults: useColdStartDefaults,
    },
  };
}

/**
 * PHASE 7: Check if zone has open queue mode active
 */
function isOpenQueueZone(zoneId: string, config: StrategyConfig): boolean {
  return config.openQueueZoneIds.includes(zoneId);
}

/**
 * Find nearest available drivers for time-critical loads
 * Bypasses WDM, uses proximity-based matching with acceptance deadline
 */
async function findTimeCriticalDrivers(
  pickupLat: number,
  pickupLng: number,
  config: StrategyConfig
): Promise<
  Array<{
    driverId: string;
    truckId: string;
    distanceKm: number;
    acceptanceDeadline: Date;
    isGuaranteedOffer: boolean;
  }>
> {
  // Get available drivers
  const drivers = await prisma.driver.findMany({
    where: { availabilityStatus: 'AVAILABLE' },
  });

  // Calculate distances and filter by proximity
  const results = [];
  for (const driver of drivers) {
    // Get driver's active truck
    const truck = await prisma.truck.findFirst({
      where: { 
        currentDriverId: driver.id,
        status: 'ACTIVE',
      },
    });

    if (!truck) continue;

    const truckLat = truck.currentLat ? (truck.currentLat as any).toNumber() : null;
    const truckLng = truck.currentLng ? (truck.currentLng as any).toNumber() : null;

    if (truckLat === null || truckLng === null) continue;

    const distanceMeters = haversineDistance(pickupLat, pickupLng, truckLat, truckLng);
    const distanceKm = distanceMeters / 1000;

    // Include all available drivers (sorted later)
    results.push({
      driverId: driver.id,
      truckId: truck.id,
      distanceKm,
      acceptanceDeadline: new Date(
        Date.now() + config.timeCriticalAcceptanceWindowMin * 60 * 1000
      ),
      isGuaranteedOffer: true,
    });
  }

  // Sort by distance and return top 3
  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, 3);
}

/**
 * Find best matching drivers for a load using WDM algorithm
 * Phase 7: Added open queue mode support
 * Phase 10: Added time-critical load bypass
 */
export async function findBestMatches(
  loadId: string,
  limit: number = 5
): Promise<
  Array<{
    driverId: string;
    truckId: string;
    score: number;
    isGuaranteedOffer?: boolean;
    details: any;
  }>
> {
  // Get load with full details
  const load = await prisma.load.findUnique({
    where: { id: loadId },
  });

  if (!load) {
    return [];
  }

  const config = await getConfig();

  // PHASE 10: TIME-CRITICAL LOAD BYPASS
  // If load is time-critical, bypass WDM and use proximity-based matching
  if (load.isTimeCritical && load.originGeoLat && load.originGeoLng) {
    const pickupLat = (load.originGeoLat as any).toNumber();
    const pickupLng = (load.originGeoLng as any).toNumber();
    
    const timeCriticalMatches = await findTimeCriticalDrivers(pickupLat, pickupLng, config);
    
    return timeCriticalMatches.map((match) => ({
      driverId: match.driverId,
      truckId: match.truckId,
      score: 100, // Time-critical matches get max score
      isGuaranteedOffer: match.isGuaranteedOffer,
      details: {
        timeCriticalMatch: true,
        distanceKm: match.distanceKm,
        acceptanceDeadline: match.acceptanceDeadline,
      },
    }));
  }

  // Fetch corridor and stops separately
  const [corridor, stops] = await Promise.all([
    prisma.corridor.findUnique({
      where: { id: load.corridorId },
    }),
    prisma.loadStop.findMany({
      where: { loadId },
    }),
  ]);

  if (!corridor) {
    return [];
  }

  // PHASE 7: OPEN QUEUE MODE
  // Check if load's origin zone has open queue mode
  const isOpenQueue = load.pickupZoneId ? isOpenQueueZone(load.pickupZoneId, config) : false;

  let availableDrivers;

  if (isOpenQueue) {
    // Open queue mode: Include drivers with GPS pings in zone within last 120 minutes
    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);

    // Find drivers with recent location pings in the zone
    const recentPings = await (prisma as any).locationPing.findMany({
      where: {
        zoneId: load.pickupZoneId,
        timestamp: { gte: twoHoursAgo },
      },
      distinct: ['driverId'],
      select: { driverId: true },
    });

    const driverIdsFromPings = recentPings.map((p: any) => p.driverId);

    // Also include AVAILABLE drivers
    availableDrivers = await prisma.driver.findMany({
      where: {
        OR: [
          { availabilityStatus: 'AVAILABLE' },
          { id: { in: driverIdsFromPings } },
        ],
      },
      include: { user: true },
      take: 100,
    });
  } else {
    // Standard mode: Only AVAILABLE drivers
    availableDrivers = await prisma.driver.findMany({
      where: { availabilityStatus: 'AVAILABLE' },
      include: { user: true },
      take: 50,
    });
  }

  const matches = [];

  for (const driver of availableDrivers) {
    // Get driver's current truck
    const truck = await prisma.truck.findFirst({
      where: { currentDriverId: driver.id },
    });

    if (!truck) continue;

    // PHASE 16: CHECK BLOCK/PREFERENCE BEFORE WDM CALCULATION
    const blockStatus = await checkBlockPreferenceStatus(load.ordererId, driver.userId);
    
    // If blocked in either direction, exclude this driver entirely
    if (blockStatus.blocked) {
      continue;
    }

    const scoreResult = await calculateWDMatchScore({
      driver: {
        id: driver.id,
        trustScore: driver.trustScore ? (driver.trustScore as any).toNumber() : undefined,
        onTimeRate: driver.onTimeRate ? (driver.onTimeRate as any).toNumber() : undefined,
        availabilityStatus: driver.availabilityStatus,
        preferredCorridorIds: driver.preferredCorridorIds,
        currentZoneId: driver.currentZoneId,
        currentLat: driver.currentLat ? (driver.currentLat as any).toNumber() : undefined,
        currentLng: driver.currentLng ? (driver.currentLng as any).toNumber() : undefined,
        routeFamiliarityScore: driver.routeFamiliarityScore,
        completedTripCount: (driver as any).completedTripCount || 0,
        homeZoneId: (driver as any).homeZoneId || null,
      },
      truck: {
        id: truck.id,
        currentLat: truck.currentLat ? (truck.currentLat as any).toNumber() : undefined,
        currentLng: truck.currentLng ? (truck.currentLng as any).toNumber() : undefined,
        currentZoneId: truck.currentZoneId,
      },
      load: {
        id: load.id,
        corridorId: load.corridorId,
        pickupZoneId: load.pickupZoneId,
        stops: stops.map((s: any) => ({
          lat: s.lat ? (s.lat as any).toNumber() : null,
          lng: s.lng ? (s.lng as any).toNumber() : null,
          stopType: s.stopType,
          zoneId: s.zoneId,
        })),
      },
      corridor: {
        id: corridor.id,
        corridorType: (corridor as any).corridorType,
        destinationZoneId: (corridor as any).destinationZoneId,
      },
    });

    // PHASE 16: Apply preferred bonus (+0.15) if mutual preference
    let finalScore = scoreResult.finalScore;
    if (blockStatus.preferred) {
      finalScore = Math.min(1.0, finalScore + 0.15);
    }

    matches.push({
      driverId: driver.id,
      truckId: truck.id,
      score: finalScore,
      isGuaranteedOffer: scoreResult.isGuaranteedOffer,
      details: {
        ...scoreResult,
        preferredBonus: blockStatus.preferred ? 0.15 : 0,
      },
    });
  }

  // Sort by score descending and return top N
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}

// Export verification function for testing
export { verifyWeightsSumToOne };
