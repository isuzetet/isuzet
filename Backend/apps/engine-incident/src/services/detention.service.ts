import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';

/**
 * Report checkpoint detention
 * Creates incident and marks trip with detention start time
 */
export async function reportCheckpointDetention(
  driverId: string,
  tripId: string,
  data: {
    checkpointName: string;
    lat: number;
    lng: number;
    reason: string;
  }
): Promise<{
  incidentId: string;
  escalationScheduledAt: Date;
}> {
  // Validate trip
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip || trip.driverId !== driverId) {
    throw new Error('UNAUTHORIZED_TRIP_ACCESS');
  }

  // Create incident
  const incidentId = generateId('inc');
  const now = new Date();

  const incident = await prisma.incident.create({
    data: {
      id: incidentId,
      tripId,
      incidentType: 'CHECKPOINT_DETENTION',
      reportedBy: driverId,
      reporterRole: 'DRIVER',
      status: 'OPEN',
      severity: 'MEDIUM',
      description: `Checkpoint detention at ${data.checkpointName}. Reason: ${data.reason}`,
      geoLat: data.lat,
      geoLng: data.lng,
    },
  });

  // Mark detention start on trip
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      detentionStartedAt: now,
    },
  });

  const config = await getConfig();

  // Calculate escalation time
  const escalationTime = new Date(
    now.getTime() + config.checkpointEscalationThresholdMin * 60 * 1000
  );

  // Emit event for escalation timer
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CHECKPOINT_DETENTION_STARTED',
      aggregateId: tripId,
      aggregateType: 'Trip',
      actorId: driverId,
      actorRole: 'DRIVER',
      strategyVersionId: 'default',
      payload: {
        incidentId,
        checkpointName: data.checkpointName,
        reason: data.reason,
        escalationScheduledAt: escalationTime.toISOString(),
        escalationThresholdMin: config.checkpointEscalationThresholdMin,
      },
    },
  });

  return {
    incidentId,
    escalationScheduledAt: escalationTime,
  };
}

/**
 * Resolve checkpoint detention (driver or OPS)
 * Clears detention flag - this is treated as NO FAULT
 */
export async function resolveDetention(
  incidentId: string,
  resolvedByUserId: string
): Promise<void> {
  // Validate incident exists
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });

  if (!incident || incident.incidentType !== 'CHECKPOINT_DETENTION') {
    throw new Error('INCIDENT_NOT_FOUND');
  }

  // Update incident
  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: 'Checkpoint detention resolved - no fault',
      liabilityParty: 'CHECKPOINT',
    },
  });

  // Clear detention flag on trip
  await prisma.trip.update({
    where: { id: incident.tripId },
    data: {
      detentionStartedAt: null,
    },
  });

  // Emit resolution event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CHECKPOINT_DETENTION_RESOLVED',
      aggregateId: incident.tripId,
      aggregateType: 'Trip',
      actorId: resolvedByUserId,
      actorRole: 'ADMIN',
      strategyVersionId: 'default',
      payload: {
        incidentId,
        resolvedBy: resolvedByUserId,
        noFault: true,
      },
    },
  });
}

/**
 * Check if a trip is currently detained (used by worker)
 */
export async function isCurrentlyDetained(tripId: string): Promise<boolean> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { detentionStartedAt: true },
  });

  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return trip.detentionStartedAt !== null;
}

/**
 * Get detention duration in minutes
 */
export async function getDetentionDuration(tripId: string): Promise<number> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { detentionStartedAt: true },
  });

  if (!trip || !trip.detentionStartedAt) {
    return 0;
  }

  const now = new Date();
  return Math.round((now.getTime() - trip.detentionStartedAt.getTime()) / 60000);
}
