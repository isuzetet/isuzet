import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';
import { EVENT_TYPES, DRIVER_STATUS } from '@ruit/shared-types';

interface BackhaulMatchingJob {
  tripId: string;
  truckId: string;
  driverId: string;
}

async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}) {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategy?.id ?? 'str_default',
      corridorId: params.payload.corridorId as string | null,
      payload: params.payload as any,
      metadata: {
        source: 'BACKHAUL_WORKER',
        timestamp: new Date().toISOString(),
      } as any,
    },
  });
}

export function createBackhaulWorker(): Worker {
  return new Worker<BackhaulMatchingJob>(
    QUEUES.BACKHAUL_MATCHING,
    async (job: Job<BackhaulMatchingJob>) => {
      const { tripId, truckId, driverId } = job.data;

      // Find the completed trip
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          load: true,
          truck: true,
        },
      });

      if (!trip) {
        throw new Error(`Trip not found: ${tripId}`);
      }

      // Get truck's current location
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
        include: {
          currentZone: true,
        },
      });

      if (!truck) {
        throw new Error(`Truck not found: ${truckId}`);
      }

      const currentZoneId = truck.currentZoneId;
      if (!currentZoneId) {
        return { success: false, reason: 'Truck has no current zone' };
      }

      // Get current zone and adjacent zones
      const currentZone = await prisma.zone.findUnique({
        where: { id: currentZoneId },
      });

      const pickupZoneIds = [currentZoneId];
      if (currentZone?.adjacentZoneIds?.length) {
        pickupZoneIds.push(...currentZone.adjacentZoneIds);
      }

      // Find the corridor of the completed trip (destination)
      if (!trip.load?.corridorId) {
        throw new Error(`Trip ${tripId} has no corridor`);
      }
      const completedCorridor = await prisma.corridor.findUnique({
        where: { id: trip.load.corridorId },
      });
      if (!completedCorridor) {
        throw new Error(`Corridor ${trip.load.corridorId} not found`);
      }

      const destinationZoneId = completedCorridor.destinationZoneId;
      if (!destinationZoneId) {
        throw new Error(`Corridor ${completedCorridor.id} has no destination zone`);
      }

      // Find open loads where:
      // - pickupZoneId = truck.currentZoneId OR in adjacent zones
      // - status IN ['OPEN', 'READY_TO_MATCH']
      // - corridorId IS NOT NULL
      // - weight can be handled by truck (convert kg to quintals: 100kg = 1 quintal)
      const truckPayloadQuintals = truck.payloadQuintals ? truck.payloadQuintals.toNumber() : 0;
      const truckPayloadKg = truckPayloadQuintals * 100;

      const matchingLoads = await prisma.load.findMany({
        where: {
          pickupZoneId: { in: pickupZoneIds },
          status: { in: ['OPEN', 'READY_TO_MATCH'] },
          weightKg: { lte: truckPayloadKg },
          deletedAt: null,
        },
        include: {
          orderer: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

    // Create BackhaulSuggestion records
    const config = await getConfig();
    const suggestions = [];
      for (const load of matchingLoads) {
        // Estimate distance between zones using corridor lookup
        // If a corridor exists between current zone and load pickup zone, use it
        let distanceToPickupKm = 50; // Default estimate
        try {
          const corridor = await prisma.corridor.findFirst({
            where: {
              OR: [
                { originZoneId: truck.currentZoneId, destinationZoneId: load.pickupZoneId },
                { originZoneId: load.pickupZoneId, destinationZoneId: truck.currentZoneId }
              ]
            },
            select: { distanceKm: true }
          });
          if (corridor?.distanceKm != null) {
            // distanceKm is a Decimal, convert to number
            distanceToPickupKm = Number(corridor.distanceKm) || 50;
          }
        } catch (e) {
          // Fall back to default if corridor lookup fails
          distanceToPickupKm = 50;
        }

        // Calculate match score: combination of capacity utilization and distance proximity
        const capacityUtilization = load.weightKg / truckPayloadKg; // 0 to 1
        const distanceBonus = Math.max(0.2, 1 - (distanceToPickupKm / 300)); // 0.2 to 1
        const matchScore = Math.round(
          (capacityUtilization * 0.5 + distanceBonus * 0.5) * 100
        ) / 100; // Final score 0 to 1

        const suggestion = await prisma.backhaulSuggestion.create({
          data: {
            sourceTripId: tripId,
            suggestedLoadId: load.id,
            truckId: truckId,
            driverId: driverId,
            fleetOwnerId: truck.fleetOwnerId ?? '',
            projectedFreeAt: new Date(),
            projectedFreeLat: truck.currentLat?.toNumber() ?? 0,
            projectedFreeLng: truck.currentLng?.toNumber() ?? 0,
            distanceToPickupKm: distanceToPickupKm,
            matchScore: matchScore,
            bonusOfferedEtb: 0, // Default - can be updated by engine-dispatch
            status: 'PENDING',
          expiresAt: new Date(Date.now() + config.backhaulWindowIntercityMin * 60 * 1000),
          },
        });
        
        suggestions.push(suggestion);

        // Emit event for each suggestion
        await emitEvent({
          eventType: 'BACKHAUL_SUGGESTION_CREATED',
          aggregateId: suggestion.id,
          aggregateType: 'BACKHAUL_SUGGESTION',
          actorId: 'SYSTEM',
          actorRole: 'BACKHAUL_WORKER',
          payload: {
            trip_id: tripId,
            load_id: load.id,
            truck_id: truckId,
            driver_id: driverId,
            corridor_id: load.corridorId,
          },
        });
      }

      // Log how many suggestions created
      console.log(`Created ${suggestions.length} backhaul suggestions for trip ${tripId}`);

      return {
        success: true,
        tripId,
        suggestionsCreated: suggestions.length,
        suggestionIds: suggestions.map(s => s.id),
      };
    },
    { connection: redis, concurrency: 5 }
  );
}

export { redis };
