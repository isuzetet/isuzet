import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';

export interface CreateOffPlatformTripInput {
  driverId: string;
  fleetOwnerId?: string;
  originZoneId?: string;
  destZoneId?: string;
  corridorId?: string;
  cargoType?: string;
  weightKg?: number;
  earningsCents?: number;
  completedAt: Date;
}

export interface VerifyOffPlatformTripInput {
  tripId: string;
  fleetOwnerId: string;
}

export async function createOffPlatformTrip(
  input: CreateOffPlatformTripInput
): Promise<string> {
  const config = await getConfig();

  const trip = await prisma.offPlatformTrip.create({
    data: {
      id: generateId('opt'),
      driverId: input.driverId,
      fleetOwnerId: input.fleetOwnerId,
      originZoneId: input.originZoneId,
      destZoneId: input.destZoneId,
      corridorId: input.corridorId,
      cargoType: input.cargoType,
      weightKg: input.weightKg,
      earningsCents: input.earningsCents,
      completedAt: input.completedAt,
      verifiedByFleetOwner: false,
      trustWeightPct: 0,
    },
  });

  return trip.id;
}

export async function verifyOffPlatformTrip(input: VerifyOffPlatformTripInput): Promise<{
  tripId: string;
  verifiedByFleetOwner: boolean;
  trustWeightPct: number;
}> {
  const config = await getConfig();

  const trip = await prisma.offPlatformTrip.findUnique({
    where: { id: input.tripId },
  });

  if (!trip) {
    throw new Error(`Off-platform trip not found: ${input.tripId}`);
  }

  if (trip.fleetOwnerId !== input.fleetOwnerId) {
    throw new Error('Fleet owner ID mismatch');
  }

  // Update trip with verification and trust weight
  const trustWeight = Math.round(config.offPlatformTripVerifiedWeight * 100);

  const updated = await prisma.offPlatformTrip.update({
    where: { id: input.tripId },
    data: {
      verifiedByFleetOwner: true,
      trustWeightPct: trustWeight,
    },
  });

  return {
    tripId: updated.id,
    verifiedByFleetOwner: updated.verifiedByFleetOwner,
    trustWeightPct: updated.trustWeightPct,
  };
}

export async function getOffPlatformTrips(
  entityId: string,
  userRole: string
): Promise<any[]> {
  // DRIVER or FLEET_OWNER auth
  const trips = await prisma.offPlatformTrip.findMany({
    where: {
      ...(userRole === 'DRIVER' && { driverId: entityId }),
      ...(userRole === 'FLEET_OWNER' && { fleetOwnerId: entityId }),
    },
    orderBy: { completedAt: 'desc' },
  });

  return trips;
}
