import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { BACKHAUL_STATUS } from '@ruit/shared-types';

// Haversine formula
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function suggestBackhaul(
  tripId: string,
  projectedCompletionLat: number,
  projectedCompletionLng: number,
  projectedFreeAt: string
): Promise<any> {
  // Find trip
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { load: true },
  });

  if (!trip) {
    throw { code: 'TRIP_NOT_FOUND', message: 'Trip not found' };
  }

  // Find truck and driver
  const truck = await prisma.truck.findUnique({
    where: { id: trip.truckId || '' },
  });

  if (!truck) {
    throw { code: 'TRUCK_NOT_FOUND', message: 'Truck not found for trip' };
  }

  // Find OPEN loads within 25km
  const openLoads = await prisma.load.findMany({
    where: {
      status: { in: ['OPEN', 'READY_TO_MATCH'] },
    },
    include: {
      stops: {
        orderBy: { stopSequence: 'asc' },
        take: 1,
      },
    },
  });

  const candidates = [];

  for (const load of openLoads) {
    // Check if load has an active assignment
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        loadId: load.id,
        status: { in: ['SUGGESTED', 'ACCEPTED', 'ACTIVE'] },
      },
    });

    if (existingAssignment) continue;

    const firstPickup = load.stops[0];
    if (!firstPickup) continue;

    const distance = haversineDistance(
      projectedCompletionLat,
      projectedCompletionLng,
      Number(firstPickup.lat),
      Number(firstPickup.lng)
    );

    if (distance > 25000) continue; // > 25km

    // Calculate score
    let proximityScore = 0;
    if (distance < 2000) proximityScore = 1.0;
    else if (distance < 5000) proximityScore = 0.8;
    else if (distance < 10000) proximityScore = 0.6;
    else if (distance < 20000) proximityScore = 0.4;
    else if (distance < 50000) proximityScore = 0.2;

    // Check night restriction
    const corridor = await prisma.corridor.findUnique({ where: { id: load.corridorId } });
    const projectedTime = new Date(projectedFreeAt);
    const hour = projectedTime.getHours();
    const isNightTime = hour >= 19 && hour < 6;
    const nightRestricted = isNightTime && corridor?.isNightTimeRestricted;

    let matchScore = proximityScore;
    if (nightRestricted) matchScore *= 0.5;

    candidates.push({
      load,
      distance,
      matchScore,
      nightRestricted,
    });
  }

  // Sort by matchScore and take top 3
  candidates.sort((a: any, b: any) => b.matchScore - a.matchScore);
  const topCandidates = candidates.slice(0, 3);

// Create suggestions
  const suggestions = [];
  const config = await getConfig();
  const expiresAt = new Date(Date.now() + config.backhaulWindowIntercityMin * 60 * 1000);

  for (const candidate of topCandidates) {
    // Find fleet owner from truck
    const fleetOwnerId = truck.fleetOwnerId || '';

    const suggestion = await prisma.backhaulSuggestion.create({
      data: {
        id: generateId('bhs'),
        sourceTripId: tripId,
        suggestedLoadId: (candidate as any).load.id,
        fleetOwnerId,
        truckId: truck.id,
        driverId: trip.driverId,
        status: BACKHAUL_STATUS.PENDING,
        expiresAt,
        projectedFreeAt: new Date(projectedFreeAt),
        projectedFreeLat: projectedCompletionLat,
        projectedFreeLng: projectedCompletionLng,
        distanceToPickupKm: (candidate as any).distance / 1000,
        matchScore: (candidate as any).matchScore,
        bonusOfferedEtb: 0,
        createdAt: new Date(),
      },
    });

    suggestions.push({
      id: suggestion.id,
      load: {
        id: (candidate as any).load.id,
        corridorId: (candidate as any).load.corridorId,
        weightKg: (candidate as any).load.weightKg,
        loadType: (candidate as any).load.loadType,
      },
      matchScore: (candidate as any).matchScore,
      distance: Math.round((candidate as any).distance),
      nightRestricted: (candidate as any).nightRestricted,
      expiresAt,
    });
  }

  return { success: true, data: suggestions };
}

export async function respondToSuggestion(
  suggestionId: string,
  decision: 'ACCEPTED' | 'REJECTED',
  reason?: string
): Promise<any> {
  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const suggestion = await prisma.backhaulSuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion) {
    throw { code: 'NOT_FOUND', message: 'Suggestion not found' };
  }

  if (suggestion.status !== BACKHAUL_STATUS.PENDING) {
    throw { code: 'ALREADY_RESPONDED', message: 'Suggestion already responded to' };
  }

  if (new Date() > suggestion.expiresAt) {
    await prisma.backhaulSuggestion.update({
      where: { id: suggestionId },
      data: { status: BACKHAUL_STATUS.EXPIRED },
    });
    throw { code: 'SUGGESTION_EXPIRED', message: 'Suggestion has expired' };
  }

  const updated = await prisma.backhaulSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: decision === 'ACCEPTED' ? BACKHAUL_STATUS.ACCEPTED : BACKHAUL_STATUS.REJECTED,
      respondedAt: new Date(),
    },
  });

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: decision === 'ACCEPTED' ? 'BACKHAUL_ACCEPTED' : 'BACKHAUL_REJECTED',
      aggregateId: suggestionId,
      aggregateType: 'BACKHAUL_SUGGESTION',
      actorId: suggestion.fleetOwnerId,
      actorRole: 'FLEET_OWNER',
      strategyVersionId,
      payload: { suggestionId, decision, reason },
    },
  });

  return { success: true, data: updated };
}

export async function getPendingSuggestions(fleetOwnerId: string): Promise<any> {
  const now = new Date();

  const suggestions = await prisma.backhaulSuggestion.findMany({
    where: {
      fleetOwnerId,
      status: BACKHAUL_STATUS.PENDING,
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: 'asc' },
  });

  // Fetch suggested loads
  const loadIds = suggestions.map((s: any) => s.suggestedLoadId);
  const loads = await prisma.load.findMany({
    where: { id: { in: loadIds } },
    select: {
      id: true,
      corridorId: true,
      weightKg: true,
      loadType: true,
    },
  });
  const loadMap = new Map(loads.map((l: any) => [l.id, l]));

  const suggestionsWithLoads = suggestions.map((suggestion: any) => ({
    ...suggestion,
    suggestedLoad: loadMap.get(suggestion.suggestedLoadId),
  }));

  return { success: true, data: suggestionsWithLoads };
}
