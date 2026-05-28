import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';

/**
 * Report an obstacle and request reroute
 * Creates a RoadAlert and flags the trip as awaiting reroute approval
 */
export async function reportObstacle(
  driverId: string,
  tripId: string,
  data: {
    obstacleType: 'ROAD_CLOSED' | 'FLOODING' | 'ACCIDENT' | 'CHECKPOINT_CLOSED';
    lat: number;
    lng: number;
    detourEstimateMin: number;
  }
): Promise<{
  alertId: string;
  awaitingOpsApproval: boolean;
}> {
  // Validate trip exists and belongs to driver
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  if (trip.driverId !== driverId) {
    throw new Error('UNAUTHORIZED_TRIP_ACCESS');
  }

  // Create road alert
  const alertId = generateId('rda');
  const alert = await prisma.roadAlert.create({
    data: {
      id: alertId,
      reportedByUserId: driverId,
      corridorId: '', // Will be filled from trip's load corridor
      alertType: data.obstacleType,
      lat: data.lat,
      lng: data.lng,
      description: `Obstacle reported during trip: ${data.obstacleType}. Estimated detour time: ${data.detourEstimateMin} minutes`,
      severity: data.obstacleType === 'ROAD_CLOSED' ? 'HIGH' : 'MEDIUM',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours default
    },
  });

  // Flag trip as awaiting reroute approval
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      rerouteRequested: true,
    },
  });

  // Emit event for OPS review
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'REROUTE_REQUESTED',
      aggregateId: tripId,
      aggregateType: 'Trip',
      actorId: driverId,
      actorRole: 'DRIVER',
      strategyVersionId: 'default',
      payload: {
        alertId,
        obstacleType: data.obstacleType,
        driverId,
        coordinates: { lat: data.lat, lng: data.lng },
        detourEstimateMin: data.detourEstimateMin,
      },
    },
  });

  return {
    alertId,
    awaitingOpsApproval: true,
  };
}

/**
 * OPS Admin approves reroute and clears penalty
 */
export async function approveReroute(tripId: string, approvedByUserId: string): Promise<void> {
  // Validate trip exists
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  if (!trip.rerouteRequested) {
    throw new Error('REROUTE_NOT_REQUESTED');
  }

  // Approve reroute
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      rerouteApprovedAt: new Date(),
    },
  });

  // Emit approval event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'REROUTE_APPROVED',
      aggregateId: tripId,
      aggregateType: 'Trip',
      actorId: approvedByUserId,
      actorRole: 'ADMIN',
      strategyVersionId: 'default',
      payload: {
        approvedBy: approvedByUserId,
      },
    },
  });
}

/**
 * Check if a trip has approved reroute (used to skip deviation penalty)
 */
export async function hasApprovedReroute(tripId: string): Promise<boolean> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { rerouteApprovedAt: true },
  });

  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return trip.rerouteApprovedAt !== null;
}
