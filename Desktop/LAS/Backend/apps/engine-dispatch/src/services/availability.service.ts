import { prisma } from '@ruit/shared-db';
import { ShiftDay } from '@ruit/shared-types';
import { ulid } from 'ulid';

interface CreateSlotBody {
  truckId: string;
  driverId?: string;
  availableFrom: string;
  availableUntil?: string;
  locationLat: number;
  locationLng: number;
  zoneId?: string;
  corridorPreferenceId?: string;
  isRecurring?: boolean;
  recurringDays?: string[];
}

export async function createAvailabilitySlot(body: CreateSlotBody, fleetOwnerId: string): Promise<any> {
  const { truckId, driverId, availableFrom, availableUntil, locationLat, locationLng, zoneId, corridorPreferenceId, isRecurring, recurringDays } = body;

  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
  });

  if (!truck) {
    throw { code: 'TRUCK_NOT_FOUND', message: 'Truck not found' };
  }

  if (truck.fleetOwnerId !== fleetOwnerId) {
    throw { code: 'NOT_AUTHORIZED', message: 'Truck does not belong to your fleet' };
  }

  const slot = await prisma.truckAvailabilitySlot.create({
    data: {
      id: ulid(),
      truckId,
      driverId: driverId || null,
      fleetOwnerId,
      availableFrom: new Date(availableFrom),
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      locationLat,
      locationLng,
      zoneId: zoneId || null,
      corridorPreferenceId: corridorPreferenceId || null,
      isRecurring: isRecurring || false,
      recurringDays: (recurringDays || []) as ShiftDay[],
      createdAt: new Date(),
    },
  });

  return { success: true, data: slot };
}

export async function getAvailabilitySlots(fleetOwnerId: string): Promise<any> {
  const fleetOwner = await prisma.fleetOwner.findFirst({
    where: { id: fleetOwnerId },
    include: {
      trucks: {
        select: { id: true },
      },
    },
  });

  if (!fleetOwner) {
    throw { code: 'FLEET_NOT_FOUND', message: 'Fleet owner not found' };
  }

  const truckIds = fleetOwner.trucks.map((t: any) => t.id);
  const now = new Date();

  const slots = await prisma.truckAvailabilitySlot.findMany({
    where: {
      truckId: { in: truckIds },
      OR: [
        { availableFrom: { gte: now } },
        { isRecurring: true },
      ],
    },
    orderBy: { availableFrom: 'asc' },
  });

  // Fetch truck details separately
  const truckIdsFromSlots = slots.map((s: any) => s.truckId);
  const trucks = await prisma.truck.findMany({
    where: { id: { in: truckIdsFromSlots } },
    select: { id: true, plateNumber: true },
  });
  const truckMap = new Map(trucks.map((t: any) => [t.id, t.plateNumber]));

  const slotsWithTrucks = slots.map((slot: any) => ({
    ...slot,
    truck: { plateNumber: truckMap.get(slot.truckId) },
  }));

  return { success: true, data: slotsWithTrucks };
}

export async function deleteAvailabilitySlot(slotId: string, fleetOwnerId: string) {
  const slot = await prisma.truckAvailabilitySlot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    throw { code: 'SLOT_NOT_FOUND', message: 'Availability slot not found' };
  }

  // Fetch truck to check ownership
  const truck = await prisma.truck.findUnique({
    where: { id: slot.truckId },
    select: { fleetOwnerId: true },
  });

  if (truck?.fleetOwnerId !== fleetOwnerId) {
    throw { code: 'NOT_AUTHORIZED', message: 'You do not own this truck' };
  }

  await prisma.truckAvailabilitySlot.delete({
    where: { id: slotId },
  });

  return { success: true, data: { deleted: true } };
}
