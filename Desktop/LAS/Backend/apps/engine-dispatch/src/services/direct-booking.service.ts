import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { QueueNames } from '@ruit/shared-types/src/queues';
import { redis } from '@ruit/shared-queue';
import { Queue } from 'bullmq';
import { canDriverAcceptNewLoad } from './hos.service.js';

interface CreateDirectBookingData {
  loadId: string;
  ordererId: string;
  requestedDriverId: string;
  requestedTruckId?: string;
}

interface RespondToDirectBookingData {
  bookingId: string;
  driverId: string;
  accept: boolean;
}

interface DirectBookingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

const TIER_1_TRUST_THRESHOLD = 40;

export async function createDirectBooking(data: CreateDirectBookingData): Promise<DirectBookingResult> {
  const { loadId, ordererId, requestedDriverId, requestedTruckId } = data;

  // Check load exists
  const load = await prisma.load.findUnique({ where: { id: loadId } });
  if (!load) {
    return { success: false, error: { code: 'LOAD_NOT_FOUND', message: `Load ${loadId} not found` } };
  }

  if (load.ordererId !== ordererId) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Orderer does not own this load' } };
  }

  // Check driver exists
  const driver = await prisma.driver.findUnique({ where: { id: requestedDriverId } });
  if (!driver) {
    return { success: false, error: { code: 'DRIVER_NOT_FOUND', message: `Driver ${requestedDriverId} not found` } };
  }

  // Check driver trust tier - must be Tier 1 or above (trust >= 40)
  const driverTrustScore = driver.trustScore.toNumber();
  if (driverTrustScore < TIER_1_TRUST_THRESHOLD) {
    return {
      success: false,
      error: {
        code: 'DRIVER_NOT_ELIGIBLE_FOR_DIRECT_BOOKING',
        message: `Driver trust score ${driverTrustScore} is below Tier 1 threshold (${TIER_1_TRUST_THRESHOLD})`,
      },
    };
  }

  // Check truck insurance if truckId provided
  if (requestedTruckId) {
    const truck = await prisma.truck.findUnique({ where: { id: requestedTruckId } });
    if (!truck) {
      return { success: false, error: { code: 'TRUCK_NOT_FOUND', message: `Truck ${requestedTruckId} not found` } };
    }

    if (truck.insuranceExpiry && new Date(truck.insuranceExpiry) < new Date()) {
      return {
        success: false,
        error: {
          code: 'TRUCK_INSURANCE_EXPIRED',
          message: 'Truck insurance has expired',
        },
      };
    }
  }

  // Check LoadBlockPreference if orderer has blocked this driver
  const blockPreference = await (prisma as any).loadBlockPreference.findFirst({
    where: {
      fromUserId: ordererId,
      toUserId: driver.userId,
      type: 'BLOCKED',
    },
  });

  if (blockPreference) {
    return {
      success: false,
      error: {
        code: 'DRIVER_BLOCKED_BY_ORDERER',
        message: 'Driver is blocked by orderer',
      },
    };
  }

  // Check mutual preference - no block in either direction
  const mutualBlock = await (prisma as any).loadBlockPreference.findFirst({
    where: {
      fromUserId: driver.userId,
      toUserId: ordererId,
      type: 'BLOCKED',
    },
  });

  if (mutualBlock) {
    return {
      success: false,
      error: {
        code: 'MUTUAL_BLOCK_EXISTS',
        message: 'Driver has blocked this orderer',
      },
    };
  }

  // Check HOS - driver must be able to accept NEW loads
  const canAcceptLoad = await canDriverAcceptNewLoad(requestedDriverId);
  if (!canAcceptLoad) {
    return {
      success: false,
      error: {
        code: 'DRIVER_HOS_EXCEEDED',
        message: 'Driver has exceeded 14 hours driving hours today - cannot accept new loads',
      },
    };
  }

  // Get config for acceptance window
  const config = await getConfig();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.directBookingAcceptanceWindowMin * 60 * 1000);

  // Create DirectBooking in transaction
  const booking = await prisma.$transaction(async (tx: any) => {
    // Create the direct booking
    const newBooking = await (tx as any).directBooking.create({
      data: {
        id: generateId('dbl'),
        loadId,
        ordererId,
        requestedDriverId,
        requestedTruckId: requestedTruckId ?? null,
        offeredAt: now,
        expiresAt,
        status: 'PENDING',
      },
    });

    // Update load source to indicate direct booking
    await tx.load.update({
      where: { id: loadId },
      data: { source: 'DIRECT_BOOKING', directBookingId: newBooking.id },
    });

    return newBooking;
  });

  // Enqueue DIRECT_BOOKING_EXPIRY job with delay
  const queue = new Queue(QueueNames.DIRECT_BOOKING_EXPIRY, { connection: redis as any });
  await queue.add(
    'direct-booking-expiry',
    { bookingId: booking.id },
    { delay: config.directBookingAcceptanceWindowMin * 60 * 1000 }
  );

  // Notify driver via preferred notification method (placeholder - emit event)
  console.log(`Direct booking ${booking.id} created for load ${loadId}, driver ${requestedDriverId}. Expires at ${expiresAt.toISOString()}`);

  return { success: true, data: booking };
}

export async function respondToDirectBooking(data: RespondToDirectBookingData): Promise<DirectBookingResult> {
  const { bookingId, driverId, accept } = data;
  const now = new Date();

  const booking = await (prisma as any).directBooking.findUnique({
    where: { id: bookingId },
    include: { load: true },
  });

  if (!booking) {
    return { success: false, error: { code: 'BOOKING_NOT_FOUND', message: `Direct booking ${bookingId} not found` } };
  }

  if (booking.requestedDriverId !== driverId) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Driver is not the requested driver' } };
  }

  if (booking.status !== 'PENDING') {
    return { success: false, error: { code: 'BOOKING_NOT_PENDING', message: `Booking is ${booking.status}, not PENDING` } };
  }

  if (booking.expiresAt < now) {
    await (prisma as any).directBooking.update({
      where: { id: bookingId },
      data: { status: 'EXPIRED', respondedAt: now },
    });
    return { success: false, error: { code: 'BOOKING_EXPIRED', message: 'Booking offer has expired' } };
  }

  await prisma.$transaction(async (tx: any) => {
    if (accept) {
      // Update booking status to ACCEPTED
      await (tx as any).directBooking.update({
        where: { id: bookingId },
        data: { status: 'ACCEPTED', respondedAt: now },
      });

      // Update load to ASSIGNED (skip WDM)
      await tx.load.update({
        where: { id: booking.loadId },
        data: {
          status: 'ASSIGNED',
          directBookingId: bookingId,
        },
      });

      // Create assignment
      const driver = await tx.driver.findUnique({ where: { id: driverId } });
      let truckId = booking.requestedTruckId;
      if (!truckId && driver) {
        const currentTruck = await tx.truck.findFirst({
          where: { currentDriverId: driverId },
        });
        truckId = currentTruck?.id;
      }
      
      if (truckId) {
        const config = await getConfig();
        const acceptanceDeadline = new Date(
          booking.createdAt.getTime() + config.directBookingAcceptanceWindowMin * 60 * 1000
        );
        await tx.assignment.create({
          data: {
            id: generateId('asn'),
            loadId: booking.loadId,
            truckId,
            driverId,
            fleetOwnerId: driver?.fleetOwnerId ?? '',
            status: 'ACCEPTED',
            acceptedAt: now,
            acceptanceDeadline,
            strategyVersionId: await tx.strategyVersion
              .findFirst({ where: { isActive: true }, select: { id: true }, orderBy: { activatedAt: 'desc' } })
              .then((s: any) => s?.id ?? 'str_default'),
          },
        });
      }

      console.log(`Driver ${driverId} accepted direct booking ${bookingId}. Load ${booking.loadId} assigned.`);
    } else {
      // Driver rejected - booking status becomes REJECTED
      await (tx as any).directBooking.update({
        where: { id: bookingId },
        data: { status: 'REJECTED', respondedAt: now },
      });

      // Update load back to PENDING for WDM matching
      await tx.load.update({
        where: { id: booking.loadId },
        data: { status: 'PENDING', source: 'MANUAL', directBookingId: null },
      });

      console.log(`Driver ${driverId} rejected direct booking ${bookingId}. Load ${booking.loadId} returned to WDM.`);
    }
  });

  return { success: true, data: { bookingId, status: accept ? 'ACCEPTED' : 'REJECTED' } };
}

export async function getDirectBookingById(bookingId: string): Promise<DirectBookingResult> {
  const booking = await (prisma as any).directBooking.findUnique({
    where: { id: bookingId },
    include: {
      load: {
        select: {
          id: true,
          originCity: true,
          destinationCity: true,
          cargoType: true,
          weightKg: true,
          pickupDate: true,
          finalRateEtb: true,
        },
      },
      driver: {
        include: { user: { select: { fullName: true, phone: true } } },
      },
    },
  });

  if (!booking) {
    return { success: false, error: { code: 'BOOKING_NOT_FOUND', message: `Direct booking ${bookingId} not found` } };
  }

  return { success: true, data: booking };
}
