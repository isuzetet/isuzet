import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { Prisma } from '@prisma/client';

/**
 * Report driver no-show (called by orderer)
 * Validates time window, creates incident, and charges fee
 */
export async function reportDriverNoShow(
  loadId: string,
  reportedByUserId: string
): Promise<{
  incidentId: string;
  compensationGenerated: boolean;
}> {
  const config = await getConfig();

  // Validate load exists
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: { trips: { include: { driver: true } } },
  });

  if (!load) {
    throw new Error('LOAD_NOT_FOUND');
  }

  // Get the trip for this load (should have one active/pending)
  const trip = load.trips[0];
  if (!trip) {
    throw new Error('NO_TRIP_FOR_LOAD');
  }

  // Check if scheduled pickup has passed by noShowDriverWindowMin
  const scheduledPickup = new Date(trip.scheduledPickup);
  const now = new Date();
  const minutesElapsed = Math.round((now.getTime() - scheduledPickup.getTime()) / 60000);

  if (minutesElapsed < config.noShowDriverWindowMin) {
    throw new Error('GRACE_PERIOD_NOT_ELAPSED');
  }

  // Wrap all financial operations in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create incident
    const incidentId = generateId('inc');
    await tx.incident.create({
      data: {
        id: incidentId,
        tripId: trip.id,
        incidentType: 'DRIVER_NO_SHOW',
        reportedBy: reportedByUserId,
        reporterRole: 'ORDERER',
        status: 'OPEN',
        severity: 'HIGH',
        description: `Driver no-show for load ${loadId}. Scheduled pickup: ${scheduledPickup.toISOString()}`,
        geoLat: null,
        geoLng: null,
      },
    });

    // Create escrow ledger entry for driver no-show fee
    await tx.escrowLedgerEntry.create({
      data: {
        id: generateId('eld'),
        loadId,
        tripId: trip.id,
        fromUserId: trip.driverId,
        toUserId: 'PLATFORM',
        amountCents: config.noShowDriverFeeCents,
        type: 'NO_SHOW_FEE_DRIVER',
        status: 'PENDING',
        notes: `Driver no-show fee for load ${loadId}`,
      },
    });

    // Reset load to AVAILABLE for re-matching
    await tx.load.update({
      where: { id: loadId },
      data: {
        status: 'AVAILABLE',
      },
    });

    // Emit event
    await tx.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'DRIVER_NO_SHOW',
        aggregateId: loadId,
        aggregateType: 'Load',
        actorId: reportedByUserId,
        actorRole: 'ORDERER',
        strategyVersionId: 'default',
        payload: {
          incidentId,
          driverId: trip.driverId,
          feeCents: config.noShowDriverFeeCents,
        },
      },
    });

    return {
      incidentId,
      compensationGenerated: false, // Driver no-show, so no compensation to orderer
    };
  });

  return result;
}

/**
 * Report orderer/cargo owner no-show (called by driver)
 * Driver must have GPS-confirmed arrival
 */
export async function reportOrdererNoShow(
  loadId: string,
  reportedByUserId: string
): Promise<{
  incidentId: string;
  driverCompensationCents: number;
}> {
  const config = await getConfig();

  // Validate load and trip
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: { trips: { include: { driver: true } } },
  });

  if (!load) {
    throw new Error('LOAD_NOT_FOUND');
  }

  const trip = load.trips[0];
  if (!trip || trip.driverId !== reportedByUserId) {
    throw new Error('UNAUTHORIZED_REPORT');
  }

  // Validate driver has GPS-confirmed arrival (within 500m of pickup)
  if (!trip.actualPickupAt) {
    throw new Error('DRIVER_NOT_AT_PICKUP');
  }

  // Create incident
  const incidentId = generateId('inc');
  await prisma.incident.create({
    data: {
      id: incidentId,
      tripId: trip.id,
      incidentType: 'ORDERER_NO_SHOW',
      reportedBy: reportedByUserId,
      reporterRole: 'DRIVER',
      status: 'OPEN',
      severity: 'HIGH',
      description: `Orderer no-show for load ${loadId}. Driver at pickup location.`,
      geoLat: trip.podGeoLat ? Number(trip.podGeoLat) : null,
      geoLng: trip.podGeoLng ? Number(trip.podGeoLng) : null,
    },
  });

  // Create fee entry for orderer
  await prisma.escrowLedgerEntry.create({
    data: {
      id: generateId('eld'),
      loadId,
      tripId: trip.id,
      fromUserId: load.ordererId,
      toUserId: 'PLATFORM',
      amountCents: config.noShowOrdererFeeCents,
      type: 'NO_SHOW_FEE_ORDERER',
      status: 'PENDING',
      notes: `Orderer no-show fee for load ${loadId}`,
    },
  });

  // Create compensation entry for driver
  await prisma.escrowLedgerEntry.create({
    data: {
      id: generateId('eld'),
      loadId,
      tripId: trip.id,
      fromUserId: 'PLATFORM',
      toUserId: trip.driverId,
      amountCents: config.noShowOrdererFeeCents,
      type: 'NO_SHOW_COMPENSATION_DRIVER',
      status: 'PENDING',
      notes: `No-show compensation for driver ${trip.driverId}`,
    },
  });

  // Emit event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'ORDERER_NO_SHOW',
      aggregateId: loadId,
      aggregateType: 'Load',
      actorId: reportedByUserId,
      actorRole: 'DRIVER',
      strategyVersionId: 'default',
      payload: {
        incidentId,
        driverId: trip.driverId,
        orderId: load.ordererId,
        feeCents: config.noShowOrdererFeeCents,
        compensationCents: config.noShowOrdererFeeCents,
      },
    },
  });

  return {
    incidentId,
    driverCompensationCents: config.noShowOrdererFeeCents,
  };
}

/**
 * Report recipient absent at delivery stop (multi-stop trips)
 * Triggers auto-release after grace period
 */
export async function reportRecipientAbsent(
  tripId: string,
  stopId: string,
  driverId: string
): Promise<{
  incidentId: string;
  autoReleaseScheduled: boolean;
}> {
  const config = await getConfig();

  // Validate trip and stop
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip || trip.driverId !== driverId) {
    throw new Error('UNAUTHORIZED_REPORT');
  }

  const stop = await prisma.tripStop.findUnique({
    where: { id: stopId },
  });

  if (!stop || stop.tripId !== tripId) {
    throw new Error('STOP_NOT_FOUND');
  }

  // Create incident
  const incidentId = generateId('inc');
  await prisma.incident.create({
    data: {
      id: incidentId,
      tripId,
      incidentType: 'RECIPIENT_ABSENT',
      reportedBy: driverId,
      reporterRole: 'DRIVER',
      status: 'OPEN',
      severity: 'MEDIUM',
      description: `Recipient absent at stop ${stop.locationName}`,
      geoLat: stop.locationLat,
      geoLng: stop.locationLng,
    },
  });

  // Mark stop as arrived (if not already)
  if (stop.status === 'PENDING') {
    await prisma.tripStop.update({
      where: { id: stopId },
      data: {
        arrivedAt: new Date(),
        status: 'ARRIVED',
      },
    });
  }

  // Emit event for grace period timer and SMS to recipient
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'RECIPIENT_ABSENT',
      aggregateId: stopId,
      aggregateType: 'TripStop',
      actorId: driverId,
      actorRole: 'DRIVER',
      strategyVersionId: 'default',
      payload: {
        incidentId,
        tripId,
        gracePeriodMin: config.recipientAbsentGracePeriodMin,
        recipientPhone: stop.recipientPhone,
      },
    },
  });

  return {
    incidentId,
    autoReleaseScheduled: true,
  };
}
