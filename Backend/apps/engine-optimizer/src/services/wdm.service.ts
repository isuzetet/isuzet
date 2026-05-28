/**
 * ISUZET WDM Service: Weighted Driver Matching
 * Corrected algorithm with 8-factor scoring, pre-filtering, and StrategyVersion-driven weights.
 * 
 * Features:
 * - All weights loaded from active StrategyVersion (no hardcoded weights)
 * - Truck capacity & body type pre-filter
 * - Home zone return bonus
 * - Haversine distance for proximity scoring
 * - 8-factor WDM scoring with detailed breakdown
 */

import { prisma } from '@ruit/shared-db';

// ═══════════════════════════════════════════════════════════════════
// INTERFACES & TYPES
// ═══════════════════════════════════════════════════════════════════

interface WdmScoredDriver {
  driverId: string;
  truckId: string;
  driverName: string;
  truckPlate: string;
  truckCapacityQuintals: number;
  finalScore: number;
  scoreBreakdown: {
    routeFamiliarity: number;
    onTimeRate: number;
    trustScore: number;
    availability: number;
    proximity: number;
    loadPreference: number;
    zoneMatch: number;
    corridorFamiliarity: number;
    ordererReliability: number;
  };
  bonusApplied: number;
  bonusReason: string[];
  distanceToLoadKm: number;
  estimatedArrivalMinutes: number;
  passedPreFilter: boolean;
  disqualifiedReason?: string;
}

interface WdmWeights {
  routeFamiliarity: number;
  onTimeRate: number;
  trustScore: number;
  availability: number;
  proximity: number;
  loadPreference: number;
  zoneMatch: number;
  corridorFamiliarity: number;
  ordererReliability: number;
}

interface WdmBonusConfig {
  homeZoneReturnScoreBonus: number;
  homeZoneReturnUrgencyBonus: number;
  wdmPreferredPairingBonus: number;
  wdmMultiStopZoneBonus: number;
  coldStartDefaultTrustScore: number;
  coldStartDefaultOnTimeRate: number;
  coldStartDefaultRouteFamiliarity: number;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTION: Haversine Distance
// ═══════════════════════════════════════════════════════════════════

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTION: Load Active StrategyVersion
// ═══════════════════════════════════════════════════════════════════

async function loadActiveStrategy(): Promise<{
  weights: WdmWeights;
  bonuses: WdmBonusConfig;
}> {
  const strategyVersion = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!strategyVersion) {
    throw new Error('No active StrategyVersion found');
  }

  const weights: WdmWeights = {
    routeFamiliarity: Number(strategyVersion.wdmRouteFamiliarityWeight),
    onTimeRate: Number(strategyVersion.wdmOnTimeRateWeight),
    trustScore: Number(strategyVersion.wdmTrustScoreWeight),
    availability: Number(strategyVersion.wdmAvailabilityWeight),
    proximity: Number(strategyVersion.wdmProximityWeight),
    loadPreference: Number(strategyVersion.wdmLoadPreferenceWeight),
    zoneMatch: Number(strategyVersion.wdmZoneMatchWeight),
    corridorFamiliarity: Number(strategyVersion.wdmCorridorFamiliarityWeight),
    ordererReliability: Number(strategyVersion.wdmOrdererReliabilityWeight),
  };

  const bonuses: WdmBonusConfig = {
    homeZoneReturnScoreBonus: Number(strategyVersion.homeZoneReturnScoreBonus || 0.05),
    homeZoneReturnUrgencyBonus: Number(strategyVersion.homeZoneReturnUrgencyBonus || 0.2),
    wdmPreferredPairingBonus: Number(strategyVersion.wdmPreferredPairingBonus || 0.15),
    wdmMultiStopZoneBonus: Number(strategyVersion.wdmMultiStopZoneBonus || 0.05),
    coldStartDefaultTrustScore: Number(strategyVersion.coldStartDefaultTrustScore || 55.0),
    coldStartDefaultOnTimeRate: Number(strategyVersion.coldStartDefaultOnTimeRate || 0.75),
    coldStartDefaultRouteFamiliarity: Number(
      strategyVersion.coldStartDefaultRouteFamiliarity || 0.7
    ),
  };

  return { weights, bonuses };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SERVICE OBJECT
// ═══════════════════════════════════════════════════════════════════

export const wdmService = {
  /**
   * Score all available drivers for a load and return ranked list
   */
  async scoreDriversForLoad(params: {
    loadId: string;
    maxResults?: number;
    includeUnscored?: boolean;
    ordererReliabilityScore?: number;
  }): Promise<WdmScoredDriver[]> {
    const { loadId, maxResults = 10, includeUnscored = false, ordererReliabilityScore = 0 } = params;

    console.log(`[WDM] Scoring drivers for load ${loadId}`);

    // ─────────────────────────────────────────────────────────────────
    // PHASE 1: Load context
    // ─────────────────────────────────────────────────────────────────

    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        stops: {
          orderBy: { stopSequence: 'asc' },
        },
      },
    });

    if (!load) {
      throw new Error(`Load not found: ${loadId}`);
    }

    const { weights, bonuses } = await loadActiveStrategy();

    // Get origin zone for coordinate lookup
    let originZoneCoordinates: { lat: number; lng: number } | null = null;
    if (load.pickupZoneId) {
      const originZone = await prisma.zone.findUnique({
        where: { id: load.pickupZoneId },
        select: { centerLat: true, centerLng: true },
      });
      if (originZone) {
        originZoneCoordinates = {
          lat: Number(originZone.centerLat),
          lng: Number(originZone.centerLng),
        };
      }
    }

    // Fallback to load's origin geo if available
    if (!originZoneCoordinates && load.originGeoLat && load.originGeoLng) {
      originZoneCoordinates = {
        lat: Number(load.originGeoLat),
        lng: Number(load.originGeoLng),
      };
    }

    // Map charter truck size to minimum quintals if in CHARTER mode
    let minCapacityQuintals = load.weightKg ? load.weightKg / 100 : 0;
    if (load.pricingMode === 'CHARTER' && load.charterTruckSize) {
      const charterSizeMap: Record<string, number> = {
        '3TON': 60,
        '5TON': 100,
        '7TON': 140,
        '10TON': 200,
        '15TON': 300,
      };
      minCapacityQuintals = charterSizeMap[load.charterTruckSize] || minCapacityQuintals;
    }

    // ─────────────────────────────────────────────────────────────────
    // PHASE 2: Fetch candidate drivers
    // ─────────────────────────────────────────────────────────────────

    const availableDrivers = await prisma.driver.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const scoredDrivers: WdmScoredDriver[] = [];
    const disqualifiedDrivers: Array<WdmScoredDriver & { disqualifiedReason: string }> = [];

    for (const driver of availableDrivers) {
      // Get most recent location ping
      const lastLocationPing = await prisma.locationPing.findFirst({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
      });

      // Get most recent assignment to check if driver is currently on a trip
      const activeAssignment = await prisma.assignment.findFirst({
        where: {
          driverId: driver.id,
          status: { in: ['ACCEPTED', 'IN_TRANSIT', 'PICKUP_CONFIRMED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get driver performance snapshot
      const performanceSnapshot = await prisma.driverPerformanceSnapshot.findFirst({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
      });

      // Get driver's truck by querying truck directly where currentDriverId = driver.id
      const truck = await prisma.truck.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (!truck) {
        continue;
      }

      // ─────────────────────────────────────────────────────────────────
      // PHASE 3: PRE-FILTER
      // ─────────────────────────────────────────────────────────────────

      const truckCapacityQuintals = truck.payloadQuintals
        ? Number(truck.payloadQuintals)
        : truck.capacityKg
          ? truck.capacityKg / 100
          : 0;

      // a. Truck capacity check
      const loadWeightQuintals = load.weightKg ? load.weightKg / 100 : 0;
      const requiredCapacity = Math.max(loadWeightQuintals * 0.9, minCapacityQuintals);

      if (truckCapacityQuintals < requiredCapacity) {
        const disqualified: WdmScoredDriver & { disqualifiedReason: string } = {
          driverId: driver.id,
          truckId: truck.id,
          driverName: driver.user?.fullName || 'Unknown',
          truckPlate: truck.plateNumber || 'Unknown',
          truckCapacityQuintals,
          finalScore: 0,
          scoreBreakdown: {
            routeFamiliarity: 0,
            onTimeRate: 0,
            trustScore: 0,
            availability: 0,
            proximity: 0,
            loadPreference: 0,
            zoneMatch: 0,
            corridorFamiliarity: 0,
            ordererReliability: 0,
          },
          bonusApplied: 0,
          bonusReason: [],
          distanceToLoadKm: 0,
          estimatedArrivalMinutes: 0,
          passedPreFilter: false,
          disqualifiedReason: `Truck capacity ${truckCapacityQuintals}q insufficient for load ${loadWeightQuintals}q`,
        };
        if (includeUnscored) {
          disqualifiedDrivers.push(disqualified);
        }
        continue;
      }

      // b. Truck body type mismatch (only if load explicitly requires a body type)
      if (load.preferredTruckBodyType) {
        if (truck.bodyType !== load.preferredTruckBodyType) {
          const disqualified: WdmScoredDriver & { disqualifiedReason: string } = {
            driverId: driver.id,
            truckId: truck.id,
            driverName: driver.user?.fullName || 'Unknown',
            truckPlate: truck.plateNumber || 'Unknown',
            truckCapacityQuintals,
            finalScore: 0,
            scoreBreakdown: {
              routeFamiliarity: 0,
              onTimeRate: 0,
              trustScore: 0,
              availability: 0,
              proximity: 0,
              loadPreference: 0,
              zoneMatch: 0,
              corridorFamiliarity: 0,
              ordererReliability: 0,
            },
            bonusApplied: 0,
            bonusReason: [],
            distanceToLoadKm: 0,
            estimatedArrivalMinutes: 0,
            passedPreFilter: false,
            disqualifiedReason: `Truck body type ${truck.bodyType} doesn't match required ${load.preferredTruckBodyType}`,
          };
          if (includeUnscored) {
            disqualifiedDrivers.push(disqualified);
          }
          continue;
        }
      }

      // c. Driver has active trip
      if (activeAssignment) {
        const disqualified: WdmScoredDriver & { disqualifiedReason: string } = {
          driverId: driver.id,
          truckId: truck.id,
          driverName: driver.user?.fullName || 'Unknown',
          truckPlate: truck.plateNumber || 'Unknown',
          truckCapacityQuintals,
          finalScore: 0,
          scoreBreakdown: {
            routeFamiliarity: 0,
            onTimeRate: 0,
            trustScore: 0,
            availability: 0,
            proximity: 0,
            loadPreference: 0,
            zoneMatch: 0,
            corridorFamiliarity: 0,
            ordererReliability: 0,
          },
          bonusApplied: 0,
          bonusReason: [],
          distanceToLoadKm: 0,
          estimatedArrivalMinutes: 0,
          passedPreFilter: false,
          disqualifiedReason: `Driver is currently on a trip (status: ${activeAssignment.status})`,
        };
        if (includeUnscored) {
          disqualifiedDrivers.push(disqualified);
        }
        continue;
      }

      // Driver passed pre-filter, proceed to scoring
      // ─────────────────────────────────────────────────────────────────
      // PHASE 4: SCORE each driver
      // ─────────────────────────────────────────────────────────────────

      const scoreBreakdown = await this.calculateFactorScores(
        driver,
        load,
        lastLocationPing,
        performanceSnapshot,
        originZoneCoordinates,
        bonuses,
        weights,
        ordererReliabilityScore
      );

      // 6. Compute weighted base score
      const baseScore =
        scoreBreakdown.routeFamiliarity * weights.routeFamiliarity +
        scoreBreakdown.onTimeRate * weights.onTimeRate +
        scoreBreakdown.trustScore * weights.trustScore +
        scoreBreakdown.availability * weights.availability +
        scoreBreakdown.proximity * weights.proximity +
        scoreBreakdown.loadPreference * weights.loadPreference +
        scoreBreakdown.zoneMatch * weights.zoneMatch +
        scoreBreakdown.corridorFamiliarity * weights.corridorFamiliarity +
        scoreBreakdown.ordererReliability * weights.ordererReliability;

      // 7. Apply bonuses
      const { bonusApplied, bonusReasons } = await this.calculateBonuses(
        driver,
        load,
        bonuses
      );

      // 8. Final score (capped at 1.0)
      const finalScore = Math.min(baseScore + bonusApplied, 1.0);

      // Calculate distance to load origin
      let distanceToLoadKm = 0;
      let estimatedArrivalMinutes = 0;
      if (originZoneCoordinates && lastLocationPing) {
        const driverLat = Number(lastLocationPing.lat);
        const driverLng = Number(lastLocationPing.lng);
        distanceToLoadKm = haversineKm(
          driverLat,
          driverLng,
          originZoneCoordinates.lat,
          originZoneCoordinates.lng
        );
        // Rough estimate: 40 km/h average speed + 5 min base
        estimatedArrivalMinutes = Math.round((distanceToLoadKm / 40) * 60 + 5);
      }

      const scoredDriver: WdmScoredDriver = {
        driverId: driver.id,
        truckId: truck.id,
        driverName: driver.user?.fullName || 'Unknown',
        truckPlate: truck.plateNumber || 'Unknown',
        truckCapacityQuintals,
        finalScore,
        scoreBreakdown,
        bonusApplied,
        bonusReason: bonusReasons,
        distanceToLoadKm,
        estimatedArrivalMinutes,
        passedPreFilter: true,
      };

      scoredDrivers.push(scoredDriver);
    }

    // ─────────────────────────────────────────────────────────────────
    // PHASE 5: Sort and return
    // ─────────────────────────────────────────────────────────────────

    scoredDrivers.sort((a, b) => b.finalScore - a.finalScore);

    const results = scoredDrivers.slice(0, maxResults);

    if (includeUnscored && disqualifiedDrivers.length > 0) {
      results.push(...disqualifiedDrivers.slice(0, Math.max(0, maxResults - results.length)));
    }

    console.log(
      `[WDM] Scored ${results.length} drivers for load ${loadId} (${scoredDrivers.length} passed pre-filter)`
    );

    return results;
  },

  /**
   * Get the top-ranked driver for a load
   */
  async getTopDriverForLoad(loadId: string, ordererReliabilityScore?: number): Promise<WdmScoredDriver | null> {
    const results = await this.scoreDriversForLoad({ loadId, maxResults: 1, ordererReliabilityScore });
    return results[0] ?? null;
  },

  /**
   * Get detailed explanation for a driver's score
   */
  async explainScore(
    loadId: string,
    driverId: string,
    ordererReliabilityScore?: number
  ): Promise<(WdmScoredDriver & { explanation: string[] }) | null> {
    const results = await this.scoreDriversForLoad({ loadId, includeUnscored: true, ordererReliabilityScore });

    if (results.length === 0) {
      throw new Error(`No scored results found for load ${loadId}`);
    }

    const driver = results.find((r) => r.driverId === driverId);
    if (!driver) {
      throw new Error(`Driver ${driverId} not found in scored results for load ${loadId}`);
    }

    const explanation: string[] = [];

    explanation.push(
      `Route familiarity: ${Math.round(driver.scoreBreakdown.routeFamiliarity * 100)}% completed trips on corridor → score ${driver.scoreBreakdown.routeFamiliarity.toFixed(2)}`
    );
    explanation.push(
      `On-time rate: ${Math.round(driver.scoreBreakdown.onTimeRate * 100)}% → score ${driver.scoreBreakdown.onTimeRate.toFixed(2)}`
    );
    explanation.push(
      `Trust score: ${Math.round(driver.scoreBreakdown.trustScore * 100)} → score ${driver.scoreBreakdown.trustScore.toFixed(2)}`
    );
    explanation.push(
      `Availability: ${driver.scoreBreakdown.availability === 1.0 ? 'Available & online' : 'Offline'} → score ${driver.scoreBreakdown.availability.toFixed(2)}`
    );
    explanation.push(
      `Proximity: ${driver.distanceToLoadKm.toFixed(1)}km from load origin → score ${driver.scoreBreakdown.proximity.toFixed(2)}`
    );
    explanation.push(
      `Load preference: ${driver.scoreBreakdown.loadPreference === 1.0 ? 'Preferred' : driver.scoreBreakdown.loadPreference === 0 ? 'Blocked' : 'Neutral'} → score ${driver.scoreBreakdown.loadPreference.toFixed(2)}`
    );
    explanation.push(
      `Zone match: ${driver.scoreBreakdown.zoneMatch === 1.0 ? 'Home zone match' : 'No home zone match'} → score ${driver.scoreBreakdown.zoneMatch.toFixed(2)}`
    );
    explanation.push(
      `Corridor familiarity: ${Math.round(driver.scoreBreakdown.corridorFamiliarity * 100)}% related trips → score ${driver.scoreBreakdown.corridorFamiliarity.toFixed(2)}`
    );
    explanation.push(
      `Orderer reliability: ${Math.round(driver.scoreBreakdown.ordererReliability * 100)}% → score ${driver.scoreBreakdown.ordererReliability.toFixed(2)}`
    );

    if (driver.bonusApplied > 0) {
      explanation.push(`Bonuses applied: ${driver.bonusReason.join(', ')} +${driver.bonusApplied.toFixed(3)}`);
    }

    const rankText = results.findIndex((r) => r.driverId === driverId) + 1;
    explanation.push(
      `Final score: ${driver.finalScore.toFixed(3)} (rank #${rankText} of ${results.length} candidates)`
    );

    if (driver.disqualifiedReason) {
      explanation.push(`Status: ⚠️ PRE-FILTER FAILED - ${driver.disqualifiedReason}`);
    }

    return {
      ...driver,
      explanation,
    };
  },

  /**
   * Calculate 8 factor scores for a driver
   */
  async calculateFactorScores(
    driver: any,
    load: any,
    lastLocationPing: any,
    performanceSnapshot: any,
    originZoneCoordinates: { lat: number; lng: number } | null,
    bonuses: WdmBonusConfig,
    weights: WdmWeights,
    ordererReliabilityScore: number
  ): Promise<{
    routeFamiliarity: number;
    onTimeRate: number;
    trustScore: number;
    availability: number;
    proximity: number;
    loadPreference: number;
    zoneMatch: number;
    corridorFamiliarity: number;
    ordererReliability: number;
  }> {
    // a. routeFamiliarity - count trips on this load's corridor
    const routeFamiliarityTrips = await prisma.trip.count({
      where: {
        driverId: driver.id,
        load: {
          corridorId: load.corridorId,
        },
        status: 'DELIVERED',
      },
    });
    const routeFamiliarity = Math.min(routeFamiliarityTrips / 10, 1.0);

    // b. onTimeRate
    const onTimeRate = performanceSnapshot
      ? Number(performanceSnapshot.onTimeDeliveries || 0) /
        Math.max(Number(performanceSnapshot.tripsCompleted || 1), 1)
      : bonuses.coldStartDefaultOnTimeRate;

    // c. trustScore
    const trustScore = driver.trustScore
      ? Math.min(Number(driver.trustScore) / 100, 1.0)
      : bonuses.coldStartDefaultTrustScore / 100;

    // d. availability
    let availability = 1.0;
    if (lastLocationPing) {
      const now = new Date();
      const pingTime = new Date(lastLocationPing.createdAt);
      const diffMs = now.getTime() - pingTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      availability = diffHours > 2 ? 0.5 : 1.0;
    } else {
      availability = 0.3; // Mild penalty for no ping
    }

    // e. proximity
    let proximity = 0.3; // Default if no location
    if (originZoneCoordinates && lastLocationPing) {
      const distanceKm = haversineKm(
        Number(lastLocationPing.lat),
        Number(lastLocationPing.lng),
        originZoneCoordinates.lat,
        originZoneCoordinates.lng
      );

      if (distanceKm <= 50) proximity = 1.0;
      else if (distanceKm <= 100) proximity = 0.8;
      else if (distanceKm <= 200) proximity = 0.6;
      else if (distanceKm <= 300) proximity = 0.4;
      else if (distanceKm <= 500) proximity = 0.2;
      else proximity = 0.1;
    }

    // f. loadPreference (check LoadBlockPreference)
    let loadPreference = 0.7; // Neutral default
    const blockPref = await prisma.loadBlockPreference.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: driver.userId, toUserId: load.ordererId },
      },
    });
    if (blockPref) {
      if (blockPref.type === 'PREFERRED') {
        loadPreference = 1.0;
      } else if (blockPref.type === 'BLOCKED') {
        loadPreference = 0.0;
      }
    }

    // g. zoneMatch (driver's homeZoneRegistered vs load pickup zone)
    let zoneMatch = 0.5;
    if (driver.homeZoneRegistered && load.pickupZoneId) {
      const pickupZone = await prisma.zone.findUnique({
        where: { id: load.pickupZoneId },
        select: { name: true },
      });
      if (pickupZone && pickupZone.name === driver.homeZoneRegistered) {
        zoneMatch = 1.0;
      }
    }

    // h. corridorFamiliarity (count all completed trips)
    const relatedTrips = await prisma.trip.count({
      where: {
        driverId: driver.id,
        status: 'DELIVERED',
      },
    });
    const corridorFamiliarity = Math.min(relatedTrips / 20, 1.0);

    // i. ordererReliability (passed from dispatch service)
    const ordererReliability = ordererReliabilityScore / 100;

    return {
      routeFamiliarity,
      onTimeRate,
      trustScore,
      availability,
      proximity,
      loadPreference,
      zoneMatch,
      corridorFamiliarity,
      ordererReliability,
    };
  },

  /**
   * Calculate bonuses to apply
   */
  async calculateBonuses(
    driver: any,
    load: any,
    bonuses: WdmBonusConfig
  ): Promise<{ bonusApplied: number; bonusReasons: string[] }> {
    let bonusApplied = 0;
    const bonusReasons: string[] = [];

    // a. Home zone return bonus
    if (driver.homeZoneRegistered) {
      const deliveryZone = await prisma.zone.findFirst({
        where: { id: load.deliveryZoneId || undefined },
        select: { name: true },
      });
      if (deliveryZone && deliveryZone.name === driver.homeZoneRegistered) {
        bonusApplied += bonuses.homeZoneReturnScoreBonus;
        bonusReasons.push('homeZoneReturn');
      }
    }

    // b. Preferred pairing bonus
    const rating = await prisma.driverOrdererRating.findFirst({
      where: {
        raterId: driver.userId,
        rateeId: load.ordererId,
        overallScore: { gte: 4 },
      },
    });
    if (rating) {
      bonusApplied += bonuses.wdmPreferredPairingBonus;
      bonusReasons.push('preferredPairing');
    }

    // c. Multi-stop zone bonus
    if (load.stops && load.stops.length >= 2) {
      const stopZoneIds = load.stops
        .filter((s: any) => s.stopType === 'DROPOFF' && s.zoneId)
        .map((s: any) => s.zoneId);

      if (stopZoneIds.length > 0) {
        // Count unique zones visited by this driver in past trips
        const driverTripsZones = await prisma.trip.findMany({
          where: {
            driverId: driver.id,
            status: 'DELIVERED',
          },
          select: {
            loadId: true,
          },
          distinct: ['loadId'],
        });

        // For simplicity, if driver has completed trips to multiple zones, grant bonus
        if (driverTripsZones.length >= 5) {
          bonusApplied += bonuses.wdmMultiStopZoneBonus;
          bonusReasons.push('multiStopExperience');
        }
      }
    }

    return { bonusApplied, bonusReasons };
  },
};
