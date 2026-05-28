import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { invalidateCache, getRedisClient } from '@ruit/shared-utils';
import { addJob, QUEUES } from '@ruit/shared-queue';
import { TRIP_STATUS, REGION, FUEL_PRICE_SOURCE, DRIVER_EARNING_TYPE } from '@ruit/shared-types';
import Redis from 'ioredis';
import { writeLocationPingToTimescale } from './timescale.service.js';
import { notifyLocationSubscribers } from './sse.service.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Named constant for fuel report bonus (can be overridden by StrategyVersion)
const FUEL_REPORT_BONUS_ETB = 5;

export interface FleetLiveState {
  truckId: string;
  plateNumber: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  currentZoneId: string | null;
  availableFromAt: Date | null;
  activeDriverId: string | null;
  currentLoadId: string | null;
  lastPingAt: Date | null;
}

// Redis key pattern for latest location
const LOCATION_KEY = (tripId: string) => `location:trip:${tripId}`;
const LOCATION_TTL = 3600; // 1 hour — auto-expires after trip likely ended

/**
 * Get deviation threshold in km based on location type (urban vs intercity)
 * Urban (commercial zones): 6km
 * Intercity: 3km
 */
async function getDeviationThresholdKm(
  lat: number,
  lng: number,
  strategyVersionId: string
): Promise<number> {
  // Get strategy version for threshold values
  const strategy = await prisma.strategyVersion.findUnique({
    where: { id: strategyVersionId },
    select: {
      urbanDeviationThresholdKm: true,
      intercityDeviationThresholdKm: true,
    },
  });

  // Default thresholds if not in strategy
  const urbanThreshold = strategy?.urbanDeviationThresholdKm || 6;
  const intercityThreshold = strategy?.intercityDeviationThresholdKm || 3;

  // Check if current location is in an urban (commercial) zone
  const commercialZones = await prisma.zone.findMany({
    where: {
      isCommercial: true,
    },
    select: {
      id: true,
      isCommercial: true,
      centerLat: true,
      centerLng: true,
    },
  });

  // Check if our current location matches any commercial zone center
  // (simplified check - could be enhanced with distance calculation)
  for (const zone of commercialZones) {
    if (
      zone.centerLat &&
      zone.centerLng &&
      Math.abs(Number(zone.centerLat) - lat) < 0.1 &&
      Math.abs(Number(zone.centerLng) - lng) < 0.1
    ) {
      return Number(urbanThreshold);
    }
  }

  // Default to intercity threshold
  return Number(intercityThreshold);
}

export interface LocationPingInput {
  tripId: string;
  driverId: string;
  loadId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speedKmh?: number;
  headingDeg?: number;
  altitudeM?: number;
  batteryLevel?: number;
  source: 'PHONE' | 'HARDWARE';
  deviceId?: string;
  isOfflineSync?: boolean;
  // For offline sync: array of queued pings
  offlinePings?: Array<{
    lat: number;
    lng: number;
    timestamp: string; // ISO string
    accuracy?: number;
  }>;
}

export async function processLocationPing(input: LocationPingInput): Promise<{
  pingId: string;
  eta?: number;
  offlineSynced?: number;
}> {
  // 1. Write to TimescaleDB (async, non-blocking)
  writeLocationPingToTimescale({
    tripId: input.tripId,
    driverId: input.driverId,
    loadId: input.loadId,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy,
    speedKmh: input.speedKmh,
    headingDeg: input.headingDeg,
    altitudeM: input.altitudeM,
    batteryLevel: input.batteryLevel,
    source: input.source,
    deviceId: input.deviceId,
    isOfflineSync: input.isOfflineSync || false,
  }); // Fire and forget — do not await

  // 2. Store in main DB via Prisma (for cross-engine queries)
  const pingId = generateId('loc');
  await prisma.locationPing.create({
    data: {
      id: pingId,
      tripId: input.tripId,
      driverId: input.driverId,
      loadId: input.loadId,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy,
      speedKmh: input.speedKmh,
      headingDeg: input.headingDeg,
      altitudeM: input.altitudeM,
      batteryLevel: input.batteryLevel,
      source: input.source,
      deviceId: input.deviceId,
      isOfflineSync: input.isOfflineSync || false,
    }
  });

  // 3. Cache latest location in Redis
  const locationData = {
    lat: input.lat,
    lng: input.lng,
    speedKmh: input.speedKmh || 0,
    headingDeg: input.headingDeg || 0,
    batteryLevel: input.batteryLevel,
    source: input.source,
    updatedAt: new Date().toISOString(),
    tripId: input.tripId,
    driverId: input.driverId,
  };

  await redis.setex(
    LOCATION_KEY(input.tripId),
    LOCATION_TTL,
    JSON.stringify(locationData)
  );

  // 4. Update load's current position in PostgreSQL
  if (input.loadId) {
    await prisma.load.update({
      where: { id: input.loadId },
      data: {
        currentLat: input.lat,
        currentLng: input.lng,
        lastLocationAt: new Date(),
        lastPingSource: input.source,
      }
    }).catch((err: any) => {
      // Load update failure is non-fatal
      console.error('Load position update error (non-fatal):', err);
    });
  }

  // 5. Calculate ETA (simple distance-based calculation)
  let etaMinutes: number | undefined;
  if (input.loadId) {
    etaMinutes = await calculateETA(input.loadId, input.lat, input.lng);
  }

  // 6. Notify SSE subscribers (orderers watching this load)
  notifyLocationSubscribers(input.tripId, {
    ...locationData,
    etaMinutes,
  });

  // 7. Handle offline sync batch if provided
  let offlineSynced = 0;
  if (input.offlinePings && input.offlinePings.length > 0) {
    for (const offlinePing of input.offlinePings) {
      await writeLocationPingToTimescale({
        tripId: input.tripId,
        driverId: input.driverId,
        loadId: input.loadId,
        lat: offlinePing.lat,
        lng: offlinePing.lng,
        accuracy: offlinePing.accuracy,
        source: input.source,
        isOfflineSync: true,
      });
      offlineSynced++;
    }
  }

  // 8. Zone resolution and route deviation detection
  await processZoneAndDeviation(input.driverId, input.lat, input.lng, input.tripId);

  return {
    pingId,
    eta: etaMinutes,
    offlineSynced: offlineSynced > 0 ? offlineSynced : undefined,
  };
}

// Get latest location from Redis cache (fast)
export async function getLatestLocation(tripId: string) {
  const cached = await redis.get(LOCATION_KEY(tripId));
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

// Simple ETA calculation
// More accurate version in engine-corridor — this is a quick estimate
async function calculateETA(loadId: string, currentLat: number, currentLng: number): Promise<number | undefined> {
  try {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        stops: {
          where: {
            stopType: 'DELIVERY',
            confirmedAt: null,
          },
          orderBy: { stopSequence: 'asc' },
          take: 1,
        }
      }
    });

    const nextStop = load?.stops?.[0];
    if (!nextStop?.lat || !nextStop?.lng) return undefined;

    // Haversine distance
    const R = 6371;
    const dLat = toRad(Number(nextStop.lat) - currentLat);
    const dLng = toRad(Number(nextStop.lng) - currentLng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(currentLat)) * Math.cos(toRad(Number(nextStop.lat))) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Assume 60 km/h average speed on Ethiopian roads
    const averageSpeedKmh = 60;
    const etaMinutes = Math.round((distanceKm / averageSpeedKmh) * 60);

    return etaMinutes;
  } catch {
    return undefined;
  }
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Haversine distance in kilometers
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Process zone resolution and route deviation detection
export async function processZoneAndDeviation(
  driverId: string,
  lat: number,
  lng: number,
  tripId: string
): Promise<void> {
  try {
  // Get driver info
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      console.error('Driver not found:', driverId);
      return;
    }

    // Get truck associated with this driver
    const truck = await prisma.truck.findFirst({
      where: { currentDriverId: driverId },
    });

    // --- ZONE RESOLUTION ---
    const oldLat = driver.currentLat ? driver.currentLat.toNumber() : null;
    const oldLng = driver.currentLng ? driver.currentLng.toNumber() : null;

    let shouldResolveZone = false;

    if (oldLat !== null && oldLng !== null) {
      const distanceKm = haversineDistance(oldLat, oldLng, lat, lng);
      if (distanceKm > 1) {
        shouldResolveZone = true;
      }
    } else {
      // No previous position - always resolve zone
      shouldResolveZone = true;
    }

    let newZoneId: string | null = null;

    if (shouldResolveZone) {
      // Find matching zone by bounding box
      const zones = await prisma.zone.findMany({
        where: {
          boundingBoxSouthLat: { lte: lat },
          boundingBoxNorthLat: { gte: lat },
          boundingBoxWestLng: { lte: lng },
          boundingBoxEastLng: { gte: lng },
        },
        take: 1,
      });

      newZoneId = zones.length > 0 ? zones[0].id : null;

      // Update Driver
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLat: lat,
          currentLng: lng,
          currentZoneId: newZoneId,
        },
      });

      // Update Truck if exists
      if (truck) {
        await prisma.truck.update({
          where: { id: truck.id },
          data: {
            currentLat: lat,
            currentLng: lng,
            currentZoneId: newZoneId,
          },
        });

        // Invalidate fleet live cache
        if (truck.fleetOwnerId) {
          await invalidateCache(`fleet:live:${truck.fleetOwnerId}`);
        }
      }
    }

  // --- ROUTE DEVIATION DETECTION ---
    // Check for active trip and get load with corridor
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: driverId,
        status: {
          in: ['EN_ROUTE', 'AT_CHECKPOINT', 'DEPARTED'],
        },
      },
    });

    // Fetch corridor separately for route deviation detection
    let corridorWithZones: any = null;
    let load: any = null;
    if (activeTrip) {
      load = await prisma.load.findUnique({
        where: { id: activeTrip.loadId },
      });
      if (load?.corridorId) {
        corridorWithZones = await prisma.corridor.findUnique({
          where: { id: load.corridorId },
        });
      }
    }

    if (activeTrip && corridorWithZones && newZoneId) {
      const corridor = corridorWithZones;

      // Skip if corridor doesn't have origin/destination zones
      if (!corridor.originZoneId || !corridor.destinationZoneId) {
        return;
      }

      // Get current zone for deviation check
      const currentZone = driver.currentZoneId;

      let deviationDetected = false;
      let deviationKm = 0;

      if (corridor.corridorType === 'INTRACITY') {
        // For intracity: check if current zone matches corridor zones
        if (currentZone && currentZone !== corridor.originZoneId && currentZone !== corridor.destinationZoneId) {
          deviationDetected = true;
          // Calculate rough deviation distance from destination
          const destZone = await prisma.zone.findUnique({
            where: { id: corridor.destinationZoneId },
          });
          if (destZone && destZone.centerLat && destZone.centerLng) {
            deviationKm = haversineDistance(
              lat,
              lng,
              destZone.centerLat.toNumber(),
              destZone.centerLng.toNumber()
            );
          }
        }
      } else {
        // For INTERCITY: skip zone-based, use distance from origin/destination centers
        const originZone = await prisma.zone.findUnique({
          where: { id: corridor.originZoneId },
        });
        const destZone = await prisma.zone.findUnique({
          where: { id: corridor.destinationZoneId },
        });

        if (originZone?.centerLat && originZone?.centerLng && destZone?.centerLat && destZone?.centerLng) {
          const distFromOrigin = haversineDistance(
            lat,
            lng,
            originZone.centerLat.toNumber(),
            originZone.centerLng.toNumber()
          );
          const distFromDest = haversineDistance(
            lat,
            lng,
            destZone.centerLat.toNumber(),
            destZone.centerLng.toNumber()
          );

          // Get deviation threshold based on location type
          const activeStrategy = await prisma.strategyVersion.findFirst({
            where: { isActive: true },
            select: { id: true },
          });
          const deviationThreshold = await getDeviationThresholdKm(
            lat,
            lng,
            activeStrategy?.id || 'sv_phase1_growth'
          );

          // Deviation if > threshold from both
          if (distFromOrigin > deviationThreshold && distFromDest > deviationThreshold) {
            deviationDetected = true;
            deviationKm = Math.min(distFromOrigin, distFromDest);
          }
        }
      }

      // Check for existing open deviation
      const existingDeviation = await prisma.routeDeviation.findFirst({
        where: {
          tripId: activeTrip.id,
          returnedAt: null,
        },
      });

      if (deviationDetected && !existingDeviation) {
        // Create new deviation record
        await prisma.routeDeviation.create({
          data: {
            tripId: activeTrip.id,
            driverId: driverId,
            deviationStartLat: lat,
            deviationStartLng: lng,
            deviatedAt: new Date(),
            deviationKm: deviationKm,
          },
        });

        // Queue deviation job
        await addJob(QUEUES.ROUTE_DEVIATION, 'deviation-detected', {
          tripId: activeTrip.id,
          driverId: driverId,
          lat,
          lng,
          deviationKm,
        });
      } else if (!deviationDetected && existingDeviation) {
        // Mark as returned
        await prisma.routeDeviation.update({
          where: { id: existingDeviation.id },
          data: { returnedAt: new Date() },
        });
      }
    }
  } catch (error) {
    console.error('Error in processZoneAndDeviation:', error);
    // Non-fatal - don't throw
  }
}

// Get trucks in a specific zone
export async function getTrucksInZone(
  zoneId: string,
  fleetOwnerId: string | null,
  userRole: string
): Promise<Array<{
  truckId: string;
  plateNumber: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  driverId: string | null;
  driverName: string | null;
  activeLoadId: string | null;
  activeLoadStatus: string | null;
}>> {
  // Build where clause
  const whereClause: any = {
    currentZoneId: zoneId,
    status: { not: 'RETIRED' },
  };

  // FLEET_OWNER: only their trucks
  if (userRole === 'FLEET_OWNER' && fleetOwnerId) {
    whereClause.fleetOwnerId = fleetOwnerId;
  }

  const trucks = await prisma.truck.findMany({
    where: whereClause,
    include: {
      trips: {
        where: {
          status: {
            in: ['EN_ROUTE', 'IN_TRANSIT', 'DEPARTED', 'AT_CHECKPOINT'],
          },
        },
        take: 1,
        include: {
          load: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      fleetOwner: {
        include: {
          user: true,
        },
      },
    },
  });

  // Get driver info for each truck
  const result = [];
  for (const truck of trucks) {
    // Find active driver for this truck
    const driver = await prisma.driver.findFirst({
      where: {
        id: truck.currentDriverId ?? undefined,
      },
      include: {
        user: true,
      },
    });

    const activeTrip = truck.trips[0];

    result.push({
      truckId: truck.id,
      plateNumber: truck.plateNumber,
      status: truck.status,
      currentLat: truck.currentLat ? truck.currentLat.toNumber() : null,
      currentLng: truck.currentLng ? truck.currentLng.toNumber() : null,
      driverId: driver?.id ?? null,
      driverName: driver?.user?.fullName ?? null,
      activeLoadId: activeTrip?.load?.id ?? null,
      activeLoadStatus: activeTrip?.load?.status ?? null,
    });
  }

  return result;
}

// Get fleet live state
export async function getFleetLiveState(fleetOwnerId: string): Promise<FleetLiveState[]> {
  // Try cache first
  const cacheKey = `fleet:live:${fleetOwnerId}`;
  const cached = await getRedisClient().get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as FleetLiveState[];
  }

  // Cache miss - fetch from DB
  const trucks = await prisma.truck.findMany({
    where: {
      fleetOwnerId: fleetOwnerId,
    },
    include: {
      trips: {
        where: {
          status: {
            in: ['EN_ROUTE', 'IN_TRANSIT', 'DEPARTED', 'AT_CHECKPOINT'],
          },
        },
        take: 1,
        include: {
          load: true,
        },
      },
    },
  });

  const result: FleetLiveState[] = [];

  for (const truck of trucks) {
    // Find active driver
    const driver = truck.currentDriverId
      ? await prisma.driver.findUnique({
          where: { id: truck.currentDriverId },
        })
      : null;

    // Get last ping for this driver
    let lastPingAt: Date | null = null;
    if (driver) {
      const lastPing = await prisma.locationPing.findFirst({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      lastPingAt = lastPing?.createdAt ?? null;
    }

    const activeTrip = truck.trips[0];

    result.push({
      truckId: truck.id,
      plateNumber: truck.plateNumber,
      status: truck.status,
      currentLat: truck.currentLat ? truck.currentLat.toNumber() : null,
      currentLng: truck.currentLng ? truck.currentLng.toNumber() : null,
      currentZoneId: truck.currentZoneId,
      availableFromAt: truck.availableFromAt,
      activeDriverId: driver?.id ?? null,
      currentLoadId: activeTrip?.loadId ?? null,
      lastPingAt: lastPingAt,
    });
  }

  // Cache for 30 seconds
  await getRedisClient().setex(cacheKey, 30, JSON.stringify(result));

  return result;
}

// Log weighbridge entry
export async function logWeighbridgeEntry(
  input: {
    tripId: string;
    locationName: string;
    lat: number;
    lng: number;
    recordedWeightKg: number;
    legalLimitKg: number;
    fineAmountEtb?: number;
    delayMinutes?: number;
    corridorId?: string;
  },
  driverId: string,
  userId: string
): Promise<{ logId: string; wasOverweight: boolean; incidentCreated: boolean }> {
  // Find trip with load
  const trip = await prisma.trip.findUnique({
    where: { id: input.tripId },
    include: {
      load: true,
      truck: true,
    },
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  // Calculate tolerance
  const toleranceKg = Math.round(input.legalLimitKg * 0.05);
  const wasOverweight = input.recordedWeightKg > input.legalLimitKg;
  const withinTolerance = input.recordedWeightKg <= (input.legalLimitKg + toleranceKg);

  // Create weighbridge log
  const log = await prisma.weighbridgeLog.create({
    data: {
      tripId: input.tripId,
      truckId: trip.truckId,
      driverId: driverId,
      corridorId: input.corridorId,
      lat: input.lat,
      lng: input.lng,
      locationName: input.locationName,
      recordedWeightKg: input.recordedWeightKg,
      legalLimitKg: input.legalLimitKg,
      toleranceKg: toleranceKg,
      wasOverweight: wasOverweight,
      withinTolerance: withinTolerance,
      fineAmountEtb: input.fineAmountEtb ?? 0,
      delayMinutes: input.delayMinutes ?? 0,
      loggedAt: new Date(),
    },
  });

  let incidentCreated = false;

  // Check for serious overload
  if (wasOverweight && !withinTolerance) {
    // Update load with overload warning
    if (trip.load) {
      await prisma.load.update({
        where: { id: trip.load.id },
        data: { overloadWarningIssued: true },
      });

      // Add fine to checkpoint fees if provided
      if (input.fineAmountEtb && input.fineAmountEtb > 0) {
        const currentFees = trip.load.totalCheckpointFeesEtb || 0;
        await prisma.load.update({
          where: { id: trip.load.id },
          data: {
            totalCheckpointFeesEtb: currentFees + input.fineAmountEtb,
          },
        });
      }
    }

  // Create incident
      await prisma.incident.create({
        data: {
          id: generateId('inc'),
          tripId: input.tripId,
          incidentType: 'OVERLOAD_DETECTED',
          severity: 'HIGH',
          reportedBy: userId,
          reporterRole: 'DRIVER',
          status: 'OPEN',
          description: `Overload detected at weighbridge. Recorded: ${input.recordedWeightKg}kg, Limit: ${input.legalLimitKg}kg`,
          geoLat: input.lat,
          geoLng: input.lng,
        } as any,
      });

    incidentCreated = true;

    // Queue weighbridge intel
    await addJob(QUEUES.WEIGHBRIDGE_INTEL, 'weighbridge-overload', {
      tripId: input.tripId,
      driverId: driverId,
      lat: input.lat,
      lng: input.lng,
      recordedWeightKg: input.recordedWeightKg,
      legalLimitKg: input.legalLimitKg,
    });
  }

  return {
    logId: log.id,
    wasOverweight,
    incidentCreated,
  };
}

// Get current fuel price(s)
export async function getCurrentFuelPrice(
  region?: string
): Promise<Array<{
  id: string;
  dieselPriceEtbPerLiter: number;
  petrolPriceEtbPerLiter: number | null;
  region: string;
  recordedAt: Date;
}>> {
  if (region) {
    // Get latest for specific region
    const snapshot = await prisma.fuelPriceSnapshot.findFirst({
      where: { region },
      orderBy: { recordedAt: 'desc' },
    });

    if (!snapshot) {
      return [];
    }

    return [
      {
        id: snapshot.id,
        dieselPriceEtbPerLiter: snapshot.dieselPriceEtbPerLiter.toNumber(),
        petrolPriceEtbPerLiter: snapshot.petrolPriceEtbPerLiter?.toNumber() ?? null,
        region: snapshot.region,
        recordedAt: snapshot.recordedAt,
      },
    ];
  } else {
    // Get latest for all regions
    const snapshots = await prisma.fuelPriceSnapshot.findMany({
      orderBy: { recordedAt: 'desc' },
    });

    // Deduplicate by region (keep first/latest of each)
    const seen = new Set<string>();
    const result = [];

    for (const snapshot of snapshots) {
      if (!seen.has(snapshot.region)) {
        seen.add(snapshot.region);
        result.push({
          id: snapshot.id,
          dieselPriceEtbPerLiter: snapshot.dieselPriceEtbPerLiter.toNumber(),
          petrolPriceEtbPerLiter: snapshot.petrolPriceEtbPerLiter?.toNumber() ?? null,
          region: snapshot.region,
          recordedAt: snapshot.recordedAt,
        });
      }
    }

    return result;
  }
}

// Report fuel price
export async function reportFuelPrice(
  input: {
    dieselPriceEtbPerLiter: number;
    region: string;
    petrolPriceEtbPerLiter?: number;
  },
  driverId: string
): Promise<{ snapshot: any; bonusEarned: number }> {
  // Validate region
  const validRegions = Object.values(REGION);
  if (!validRegions.includes(input.region as any)) {
    throw new Error('Invalid region');
  }

  // Try to get bonus amount from StrategyVersion
  let bonusAmount = FUEL_REPORT_BONUS_ETB;
  try {
    const activeStrategy = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
    });
    // Check if fuelReportBonusEtb exists on the model (cast to any for safety)
    if (activeStrategy && (activeStrategy as any).fuelReportBonusEtb) {
      bonusAmount = (activeStrategy as any).fuelReportBonusEtb;
    }
  } catch {
    // Use default
  }

  // Create snapshot
  const snapshot = await prisma.fuelPriceSnapshot.create({
    data: {
      dieselPriceEtbPerLiter: input.dieselPriceEtbPerLiter,
      petrolPriceEtbPerLiter: input.petrolPriceEtbPerLiter ?? null,
      region: input.region,
      source: 'DRIVER_REPORT' as any,
      reportedByDriverId: driverId,
      recordedAt: new Date(),
    },
  });

  // Create driver earning
  await prisma.driverEarning.create({
    data: {
      driverId: driverId,
      earningType: 'FUEL_REPORT_BONUS' as any,
      amountEtb: bonusAmount,
      status: 'PENDING' as any,
      paidByFleetOwner: false,
    },
  });

  // Queue fuel intel job
  await addJob(QUEUES.FUEL_INTEL, 'fuel-price-reported', {
    driverId,
    region: input.region,
    dieselPriceEtbPerLiter: input.dieselPriceEtbPerLiter,
    snapshotId: snapshot.id,
  });

  return {
    snapshot: {
      id: snapshot.id,
      dieselPriceEtbPerLiter: snapshot.dieselPriceEtbPerLiter.toNumber(),
      petrolPriceEtbPerLiter: snapshot.petrolPriceEtbPerLiter?.toNumber() ?? null,
      region: snapshot.region,
      recordedAt: snapshot.recordedAt,
    },
    bonusEarned: bonusAmount,
  };
}
