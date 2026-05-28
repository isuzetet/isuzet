import 'dotenv/config';
import { prisma } from '@ruit/shared-db';
import { Prisma, Prisma as PrismaLib, TripStatus, LoadStatus, TruckStatus } from '@prisma/client';

// CHANGE 10: Fleet Economics Analytics
export async function getFleetEconomics(
  fleetOwnerId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<{
  fleetOwnerId: string;
  dateRange: { from: Date; to: Date };
  totalTrips: number;
  totalRevenueEtb: number;
  totalFleetPayoutEtb: number;
  totalCommissionsEtb: number;
  totalCheckpointFeesEtb: number;
  averageRevenuePerTripEtb: number;
  utilizationRate: number;
}> {
  const now = new Date();
  const from = fromDate ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
  const to = toDate ?? now;

  // Get all trips for this fleet in date range
  const trips = await prisma.trip.findMany({
    where: {
      truck: {
        fleetOwnerId,
      },
      completedAt: {
        gte: from,
        lte: to,
      },
      status: TripStatus.COMPLETED,
    },
    include: {
      load: {
        select: {
          finalRateEtb: true,
          fleetPayoutEtb: true,
          ruitCommissionEtb: true,
          totalCheckpointFeesEtb: true,
        },
      },
      truck: {
        select: {
          plateNumber: true,
        },
      },
    },
  });

  // Get truck count for utilization calculation
  const truckCount = await prisma.truck.count({
    where: { fleetOwnerId },
  });

  const daysInRange = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));

  // Calculate totals with Decimal conversion
  let totalRevenueEtb = 0;
  let totalFleetPayoutEtb = 0;
  let totalCommissionsEtb = 0;
  let totalCheckpointFeesEtb = 0;

  for (const trip of trips) {
    if (trip.load) {
      totalRevenueEtb += new PrismaLib.Decimal(trip.load.finalRateEtb ?? 0).toNumber();
      totalFleetPayoutEtb += new PrismaLib.Decimal(trip.load.fleetPayoutEtb ?? 0).toNumber();
      totalCommissionsEtb += new PrismaLib.Decimal(trip.load.ruitCommissionEtb ?? 0).toNumber();
      totalCheckpointFeesEtb += new PrismaLib.Decimal(trip.load.totalCheckpointFeesEtb ?? 0).toNumber();
    }
  }

  const totalTrips = trips.length;
  const averageRevenuePerTripEtb = totalTrips > 0 ? totalRevenueEtb / totalTrips : 0;

  // Utilization rate: trips / (trucks * days)
  const theoreticalMaxTrips = truckCount * daysInRange;
  const utilizationRate = theoreticalMaxTrips > 0 ? (totalTrips / theoreticalMaxTrips) * 100 : 0;

  return {
    fleetOwnerId,
    dateRange: { from, to },
    totalTrips,
    totalRevenueEtb,
    totalFleetPayoutEtb,
    totalCommissionsEtb,
    totalCheckpointFeesEtb,
    averageRevenuePerTripEtb,
    utilizationRate,
  };
}

// CHANGE 11: Idle Analysis
export async function getFleetIdleAnalysis(fleetOwnerId: string): Promise<{
  totalTrucks: number;
  idleTrucks: number;
  utilizationPercent: number;
  longestIdleHours: number;
  trucks: Array<{
    truckId: string;
    plateNumber: string;
    status: string;
    idleHours: number;
    zoneId: string | null;
  }>;
}> {
  const now = new Date();

  // Get all trucks for this fleet
  const trucks = await prisma.truck.findMany({
    where: { fleetOwnerId },
    select: {
      id: true,
      plateNumber: true,
      status: true,
      currentZoneId: true,
    },
  });

  const truckData: Array<{
    truckId: string;
    plateNumber: string;
    status: string;
    idleHours: number;
    zoneId: string | null;
  }> = [];

  let idleTrucks = 0;
  let longestIdleHours = 0;

  for (const truck of trucks) {
    // Find current availability slot
    const slot = await prisma.truckAvailabilitySlot.findFirst({
      where: {
        truckId: truck.id,
        availableFrom: { lte: now },
        OR: [
          { availableUntil: null },
          { availableUntil: { gt: now } },
        ],
      },
      orderBy: { availableFrom: 'desc' },
    });

    const idleHours = slot
      ? (now.getTime() - slot.availableFrom.getTime()) / (1000 * 60 * 60)
      : 0;

    const isIdle = truck.status === TruckStatus.IDLE || idleHours > 24;

    if (isIdle) {
      idleTrucks++;
    }

    if (idleHours > longestIdleHours) {
      longestIdleHours = idleHours;
    }

    truckData.push({
      truckId: truck.id,
      plateNumber: truck.plateNumber,
      status: truck.status,
      idleHours: Math.round(idleHours * 100) / 100,
      zoneId: truck.currentZoneId,
    });
  }

  // Sort by idle hours descending
  truckData.sort((a, b) => b.idleHours - a.idleHours);

  const totalTrucks = trucks.length;
  const utilizationPercent = totalTrucks > 0
    ? ((totalTrucks - idleTrucks) / totalTrucks) * 100
    : 0;

  return {
    totalTrucks,
    idleTrucks,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    longestIdleHours: Math.round(longestIdleHours * 100) / 100,
    trucks: truckData,
  };
}

// CHANGE 12: Backhaul Performance
export async function getBackhaulPerformance(
  fromDate?: Date,
  toDate?: Date,
  corridorId?: string
): Promise<{
  totalSuggestions: number;
  acceptedCount: number;
  declinedCount: number;
  expiredCount: number;
  acceptanceRate: number;
  averageResponseTimeMinutes: number | null;
  perCorridor: Array<{
    corridorId: string;
    total: number;
    accepted: number;
    declined: number;
    expired: number;
  }>;
}> {
  const now = new Date();
  const from = fromDate ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = toDate ?? now;

  const where: Prisma.BackhaulSuggestionWhereInput = {
    createdAt: {
      gte: from,
      lte: to,
    },
  };

  if (corridorId) {
    where.corridorId = corridorId;
  }

  const suggestions = await prisma.backhaulSuggestion.findMany({
    where,
    select: {
      id: true,
      status: true,
      corridorId: true,
      createdAt: true,
      respondedAt: true,
    },
  });

  const totalSuggestions = suggestions.length;
  const acceptedCount = suggestions.filter((s) => s.status === 'ACCEPTED').length;
  const declinedCount = suggestions.filter((s) => s.status === 'DECLINED').length;
  const expiredCount = suggestions.filter((s) => s.status === 'EXPIRED').length;

  // Calculate average response time
  const respondedSuggestions = suggestions.filter((s) => s.respondedAt);
  let totalResponseMinutes = 0;
  for (const s of respondedSuggestions) {
    if (s.respondedAt) {
      totalResponseMinutes += (s.respondedAt.getTime() - s.createdAt.getTime()) / (1000 * 60);
    }
  }
  const averageResponseTimeMinutes = respondedSuggestions.length > 0
    ? Math.round((totalResponseMinutes / respondedSuggestions.length) * 100) / 100
    : null;

  const acceptanceRate = totalSuggestions > 0 ? (acceptedCount / totalSuggestions) * 100 : 0;

  // Group by corridor
  const corridorMap = new Map<string, { total: number; accepted: number; declined: number; expired: number }>();
  for (const s of suggestions) {
    const cid = s.corridorId ?? 'unknown';
    if (!corridorMap.has(cid)) {
      corridorMap.set(cid, { total: 0, accepted: 0, declined: 0, expired: 0 });
    }
    const data = corridorMap.get(cid)!;
    data.total++;
    if (s.status === 'ACCEPTED') data.accepted++;
    else if (s.status === 'DECLINED') data.declined++;
    else if (s.status === 'EXPIRED') data.expired++;
  }

  const perCorridor = Array.from(corridorMap.entries()).map(([corridorId, data]) => ({
    corridorId,
    ...data,
  }));

  return {
    totalSuggestions,
    acceptedCount,
    declinedCount,
    expiredCount,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    averageResponseTimeMinutes,
    perCorridor,
  };
}

// CHANGE 13: Zone Demand Snapshot
export async function getZoneDemandSnapshot(
  zoneId?: string
): Promise<Array<{
  id: string;
  zoneId: string;
  snapshotAt: Date;
  demandIndex: number;
  truckCount: number;
  openLoads: number;
}>> {
  let snapshots;

  if (zoneId) {
    // Get latest for specific zone
    const snapshot = await prisma.zoneDemandSnapshot.findFirst({
      where: { zoneId },
      orderBy: { snapshotAt: 'desc' },
    });
    snapshots = snapshot ? [snapshot] : [];
  } else {
    // Get latest snapshot per zone
    // Use distinct with orderBy
    const latestSnapshots = await prisma.$queryRaw<Array<{
      id: string;
      zone_id: string;
      snapshot_at: Date;
      demand_index: number;
    }>>`
      SELECT DISTINCT ON (zone_id) id, zone_id, snapshot_at, demand_index
      FROM zone_demand_snapshots
      ORDER BY zone_id, snapshot_at DESC
    `;

    snapshots = await prisma.zoneDemandSnapshot.findMany({
      where: {
        id: { in: latestSnapshots.map((s) => s.id) },
      },
    });
  }

  // Enrich with live data
  const enriched = await Promise.all(
    snapshots.map(async (snapshot) => {
      // Current truck count in zone
      const truckCount = await prisma.driver.count({
        where: {
          currentZoneId: snapshot.zoneId,
        },
      });

      // Open loads for this zone
      const openLoads = await prisma.load.count({
        where: {
          pickupZoneId: snapshot.zoneId,
          status: {
            in: [LoadStatus.OPEN, LoadStatus.READY_TO_MATCH],
          },
        },
      });

      return {
        id: snapshot.id,
        zoneId: snapshot.zoneId,
        snapshotAt: snapshot.snapshotAt,
        demandIndex: snapshot.demandIndex,
        truckCount,
        openLoads,
      };
    })
  );

  return enriched;
}

// CHANGE 14: Analytics Score
export async function getAnalyticsScore(
  entityType: 'DRIVER' | 'FLEET' | 'CORRIDOR',
  entityId: string
): Promise<{
  entityType: string;
  entityId: string;
  score: number;
  grade: string;
  breakdown: Record<string, number | null>;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (entityType === 'DRIVER') {
    const driver = await prisma.driver.findUnique({
      where: { id: entityId },
      include: {
        user: {
          select: { trustScore: true },
        },
      },
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    // Calculate components
    const trustComponent = new PrismaLib.Decimal(driver.user?.trustScore ?? 0).toNumber() * 20;
    const complianceComponent = (driver.complianceScore ?? 0) * 10 / 100;

    // Trips in last 30 days
    const trips = await prisma.trip.findMany({
      where: {
        assignment: {
          driverId: entityId,
        },
        status: TripStatus.COMPLETED,
        completedAt: { gte: thirtyDaysAgo },
      },
      select: {
        completedAt: true,
        scheduledArrival: true,
      },
    });

    const tripCount = trips.length;
    const utilizationComponent = Math.min((tripCount / 30) * 5, 5);

    // On-time calculation
    const onTimeTrips = trips.filter(
      (t) => t.completedAt && t.scheduledArrival && t.completedAt <= t.scheduledArrival
    ).length;
    const onTimeComponent = tripCount > 0 ? (onTimeTrips / tripCount) * 5 : 0;

    const totalScore = trustComponent + complianceComponent + utilizationComponent + onTimeComponent;

    // Grade calculation
    let grade: string;
    if (totalScore >= 35) grade = 'A';
    else if (totalScore >= 28) grade = 'B';
    else if (totalScore >= 20) grade = 'C';
    else if (totalScore >= 12) grade = 'D';
    else grade = 'F';

    return {
      entityType: 'DRIVER',
      entityId,
      score: Math.round(totalScore * 100) / 100,
      grade,
      breakdown: {
        trustComponent: Math.round(trustComponent * 100) / 100,
        complianceComponent: Math.round(complianceComponent * 100) / 100,
        utilizationComponent: Math.round(utilizationComponent * 100) / 100,
        onTimeComponent: Math.round(onTimeComponent * 100) / 100,
        totalTrips: tripCount,
      },
    };
  }

  if (entityType === 'FLEET') {
    const fleetOwner = await prisma.fleetOwner.findUnique({
      where: { id: entityId },
    });

    if (!fleetOwner) {
      throw new Error('Fleet owner not found');
    }

    // Get all drivers in fleet
    const drivers = await prisma.driver.findMany({
      where: { fleetOwnerId: entityId },
      select: { id: true },
    });

    // Aggregate driver scores in parallel (not sequential)
    let totalDriverScore = 0;
    const driverScores = await Promise.all(
      drivers.map(async (driver) => {
        try {
          return await getAnalyticsScore('DRIVER', driver.id);
        } catch {
          // Skip drivers that can't be scored
          return null;
        }
      })
    ).then(results => results.filter((score): score is NonNullable<typeof score> => score !== null));
    
    for (const score of driverScores) {
      totalDriverScore += score.score;
    }

    const avgDriverScore = driverScores.length > 0 ? totalDriverScore / driverScores.length : 0;

    // Fleet size
    const fleetSize = await prisma.truck.count({
      where: { fleetOwnerId: entityId },
    });

    // Active trips
    const activeTrips = await prisma.trip.count({
      where: {
        truck: {
          fleetOwnerId: entityId,
        },
        status: TripStatus.EN_ROUTE,
      },
    });

    // Fleet score components
    const driverComponent = avgDriverScore * 0.7;
    const utilizationComponent = Math.min((activeTrips / Math.max(fleetSize, 1)) * 10, 10);
    const totalScore = driverComponent + utilizationComponent;

    let grade: string;
    if (totalScore >= 35) grade = 'A';
    else if (totalScore >= 28) grade = 'B';
    else if (totalScore >= 20) grade = 'C';
    else if (totalScore >= 12) grade = 'D';
    else grade = 'F';

    return {
      entityType: 'FLEET',
      entityId,
      score: Math.round(totalScore * 100) / 100,
      grade,
      breakdown: {
        avgDriverScore: Math.round(avgDriverScore * 100) / 100,
        driverComponent: Math.round(driverComponent * 100) / 100,
        utilizationComponent: Math.round(utilizationComponent * 100) / 100,
        fleetSize,
        activeTrips,
      },
    };
  }

  if (entityType === 'CORRIDOR') {
    const corridor = await prisma.corridor.findUnique({
      where: { id: entityId },
    });

    if (!corridor) {
      throw new Error('Corridor not found');
    }

    // Trips in this corridor
    const trips = await prisma.trip.findMany({
      where: {
        corridorId: entityId,
        status: TripStatus.COMPLETED,
        completedAt: { gte: thirtyDaysAgo },
      },
      select: {
        completedAt: true,
        scheduledArrival: true,
        load: {
          select: {
            id: true,
          },
        },
      },
    });

    const totalTrips = trips.length;
    const onTimeTrips = trips.filter(
      (t) => t.completedAt && t.scheduledArrival && t.completedAt <= t.scheduledArrival
    ).length;

    // Transit adherence
    const avgTransitAdherence = totalTrips > 0 ? (onTimeTrips / totalTrips) * 100 : 0;

    // Loads in corridor (last 30 days)
    const loadsInCorridor = await prisma.load.count({
      where: {
        corridorId: entityId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Theoretical capacity (estimate)
    const theoreticalCapacity = 100; // Simplified
    const utilizationRate = theoreticalCapacity > 0 ? (loadsInCorridor / theoreticalCapacity) * 100 : 0;

    // Weighted composite score
    // Weights: transit adherence 40%, utilization 40%, incident rate (inverse) 20%
    const transitComponent = avgTransitAdherence * 0.4;
    const utilizationComponent = utilizationRate * 0.4;
    const incidentComponent = 20; // Placeholder - would query incidents
    const totalScore = transitComponent + utilizationComponent + incidentComponent;

    let grade: string;
    if (totalScore >= 35) grade = 'A';
    else if (totalScore >= 28) grade = 'B';
    else if (totalScore >= 20) grade = 'C';
    else if (totalScore >= 12) grade = 'D';
    else grade = 'F';

    return {
      entityType: 'CORRIDOR',
      entityId,
      score: Math.round(totalScore * 100) / 100,
      grade,
      breakdown: {
        avgTransitAdherence: Math.round(avgTransitAdherence * 100) / 100,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        transitComponent: Math.round(transitComponent * 100) / 100,
        utilizationComponent: Math.round(utilizationComponent * 100) / 100,
        incidentComponent,
        totalTrips,
        loadsInCorridor,
      },
    };
  }

  throw new Error(`Invalid entity type: ${entityType}`);
}
