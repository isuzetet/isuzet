import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { randomInt } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

// Trip stop creation input
type CreateMultiStopTripInput = {
  loadId: string;
  stops: Array<{
    stopNumber: number;
    locationLat: number;
    locationLng: number;
    locationName: string;
    cargoQuantityKg: number;
    recipientName: string;
    recipientPhone: string;
    timeWindowStart?: Date;
    timeWindowEnd?: Date;
    escrowReleasePct?: number;
  }>;
  escrowMode: 'FULL_ON_FINAL' | 'PROPORTIONAL' | 'ORDERER_CONFIG';
};

type StopArrivalInput = {
  tripId: string;
  stopId: string;
  driverLat: number;
  driverLng: number;
};

type StopDeliveryInput = {
  tripId: string;
  stopId: string;
  recipientOtp: string;
  podPhotoUrl?: string;
};

// Generate 4-digit OTP using crypto.randomInt (security requirement)
function generateOtp(): string {
  return randomInt(1000, 9999).toString().padStart(4, '0');
}

// Calculate proportional escrow percentages
function calculateProportionalEscrow(stopCount: number): number[] {
  const basePct = Math.floor(100 / stopCount);
  const percentages: number[] = [];
  
  for (let i = 0; i < stopCount; i++) {
    if (i === stopCount - 1) {
      // Last stop gets remainder to ensure total is exactly 100
      const sumOthers = percentages.reduce((a, b) => a + b, 0);
      percentages.push(100 - sumOthers);
    } else {
      percentages.push(basePct);
    }
  }
  
  return percentages;
}

/**
 * Create multi-stop trip with TripStop records
 * Validates stops, generates OTPs, handles escrow mode
 */
export async function createMultiStopTrip(data: CreateMultiStopTripInput): Promise<{
  success: boolean;
  data?: { tripStops: any[] };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    // Validate: at least 2 stops
    if (data.stops.length < 2) {
      return {
        success: false,
        error: { code: 'MIN_STOPS_REQUIRED', message: 'Multi-stop trips require at least 2 stops' }
      };
    }

    // Validate: stopNumbers sequential starting from 1
    const sortedStops = [...data.stops].sort((a, b) => a.stopNumber - b.stopNumber);
    for (let i = 0; i < sortedStops.length; i++) {
      if (sortedStops[i].stopNumber !== i + 1) {
        return {
          success: false,
          error: { code: 'INVALID_STOP_SEQUENCE', message: 'Stop numbers must be sequential starting from 1' }
        };
      }
    }

    // Get the load to find the trip
    const load = await tx.load.findUnique({
      where: { id: data.loadId },
      include: { trips: true }
    });

    if (!load) {
      return {
        success: false,
        error: { code: 'LOAD_NOT_FOUND', message: 'Load not found' }
      };
    }

    // Get the associated trip
    const trip = load.trips?.[0];
    if (!trip) {
      return {
        success: false,
        error: { code: 'TRIP_NOT_FOUND', message: 'No trip found for this load' }
      };
    }

    // Handle escrow percentages based on mode
    let escrowPercentages: number[] = [];

    if (data.escrowMode === 'FULL_ON_FINAL') {
      // All stops get 0 except last which gets 100
      escrowPercentages = sortedStops.map((_, i) => i === sortedStops.length - 1 ? 100 : 0);
    } else if (data.escrowMode === 'PROPORTIONAL') {
      // Ignore provided values, calculate evenly
      escrowPercentages = calculateProportionalEscrow(sortedStops.length);
    } else if (data.escrowMode === 'ORDERER_CONFIG') {
      // Validate each stop has explicit escrowReleasePct
      for (let i = 0; i < sortedStops.length; i++) {
        const pct = sortedStops[i].escrowReleasePct;
        if (pct === undefined || pct === null) {
          return {
            success: false,
            error: { code: 'STOP_ESCROW_PCT_REQUIRED', message: `Stop ${i + 1} must have escrowReleasePct in ORDERER_CONFIG mode` }
          };
        }
        escrowPercentages.push(pct);
      }

      // Validate sum equals 100
      const sum = escrowPercentages.reduce((a, b) => a + b, 0);
      if (sum !== 100) {
        return {
          success: false,
          error: { code: 'STOP_ESCROW_PCT_INVALID', message: `Sum of escrowReleasePct must equal 100, got ${sum}` }
        };
      }
    }

    // Create all TripStop records
    const createdStops = [];
    for (let i = 0; i < sortedStops.length; i++) {
      const stop = sortedStops[i];
      const otp = generateOtp();

      const tripStop = await (tx.tripStop as any).create({
        data: {
          id: generateId('tps'),
          tripId: trip.id,
          stopNumber: stop.stopNumber,
          locationLat: stop.locationLat,
          locationLng: stop.locationLng,
          locationName: stop.locationName,
          cargoQuantityKg: stop.cargoQuantityKg,
          recipientName: stop.recipientName,
          recipientPhone: stop.recipientPhone,
          timeWindowStart: stop.timeWindowStart,
          timeWindowEnd: stop.timeWindowEnd,
          status: 'PENDING',
          escrowReleasePct: escrowPercentages[i],
          recipientOtp: otp,
        }
      });

      createdStops.push(tripStop);
    }

    return {
      success: true,
      data: { tripStops: createdStops }
    };
  });
}

/**
 * Confirm driver arrival at a stop
 * Validates sequential completion (must complete previous stops first)
 */
export async function confirmStopArrival(data: StopArrivalInput): Promise<{
  success: boolean;
  data?: { stop: any };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    // Find the stop
    const stop = await (tx.tripStop as any).findUnique({
      where: { id: data.stopId },
      include: { trip: true }
    });

    if (!stop) {
      return {
        success: false,
        error: { code: 'STOP_NOT_FOUND', message: 'Trip stop not found' }
      };
    }

    // Verify the stop belongs to the specified trip
    if (stop.tripId !== data.tripId) {
      return {
        success: false,
        error: { code: 'STOP_TRIP_MISMATCH', message: 'Stop does not belong to this trip' }
      };
    }

    // Verify this is the NEXT sequential stop (all previous must be COMPLETED)
    const previousStops = await (tx.tripStop as any).findMany({
      where: {
        tripId: data.tripId,
        stopNumber: { lt: stop.stopNumber }
      }
    });

    const incompletePrevStops = previousStops.filter((s: any) => s.status !== 'COMPLETED');
    if (incompletePrevStops.length > 0) {
      return {
        success: false,
        error: { code: 'PREVIOUS_STOPS_INCOMPLETE', message: 'Cannot arrive at this stop - complete previous stops first' }
      };
    }

    // Update stop status to ARRIVED
    const updatedStop = await (tx.tripStop as any).update({
      where: { id: data.stopId },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date()
      }
    });

    // Log the GPS arrival (using an event)
    await tx.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'STOP_ARRIVAL',
        aggregateId: data.stopId,
        aggregateType: 'TRIP_STOP',
        actorId: data.tripId,
        actorRole: 'DRIVER',
        strategyVersionId: 'default',
        payload: {
          tripId: data.tripId,
          stopId: data.stopId,
          lat: data.driverLat,
          lng: data.driverLng,
          timestamp: new Date().toISOString()
        } as any
      }
    });

    return {
      success: true,
      data: { stop: updatedStop }
    };
  });
}

/**
 * Confirm delivery at a stop with OTP verification
 * Handles escrow release based on mode
 */
export async function confirmStopDelivery(data: StopDeliveryInput): Promise<{
  success: boolean;
  data?: { stop: any; escrowReleased?: boolean };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    // Find the stop
    const stop = await (tx.tripStop as any).findUnique({
      where: { id: data.stopId },
      include: { trip: { include: { load: true } } }
    });

    if (!stop) {
      return {
        success: false,
        error: { code: 'STOP_NOT_FOUND', message: 'Trip stop not found' }
      };
    }

    // Verify the stop belongs to the specified trip
    if (stop.tripId !== data.tripId) {
      return {
        success: false,
        error: { code: 'STOP_TRIP_MISMATCH', message: 'Stop does not belong to this trip' }
      };
    }

    // Verify stop is in ARRIVED status
    if (stop.status !== 'ARRIVED') {
      return {
        success: false,
        error: { code: 'STOP_NOT_ARRIVED', message: 'Stop must be in ARRIVED status before delivery confirmation' }
      };
    }

    // Verify OTP matches
    if (stop.recipientOtp !== data.recipientOtp) {
      return {
        success: false,
        error: { code: 'OTP_INVALID', message: 'Invalid OTP provided' }
      };
    }

    // Update stop status to COMPLETED
    const updatedStop = await (tx.tripStop as any).update({
      where: { id: data.stopId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        podPhotoUrl: data.podPhotoUrl
      }
    });

    let escrowReleased = false;

    // Check if this is the final stop
    const allStops = await (tx.tripStop as any).findMany({
      where: { tripId: data.tripId },
      orderBy: { stopNumber: 'asc' }
    });

    const isFinalStop = allStops[allStops.length - 1]?.id === data.stopId;

    // Handle escrow release
    // Get load info for escrow calculation
    const load = stop.trip?.load;
    const trip = stop.trip;

    if (load && trip) {
      const releasePct = stop.escrowReleasePct;
      
      // Determine if we should release escrow
      let shouldRelease = false;
      let releaseAmountCents = 0;

      // Get escrow mode from stops - check first stop to determine mode
      const firstStop = allStops[0];
      let escrowMode: 'FULL_ON_FINAL' | 'PROPORTIONAL' | 'ORDERER_CONFIG';

      if (firstStop.escrowReleasePct === 0 && allStops[allStops.length - 1].escrowReleasePct === 100) {
        escrowMode = 'FULL_ON_FINAL';
      } else if (allStops.every((s: any) => s.escrowReleasePct === firstStop.escrowReleasePct)) {
        escrowMode = 'PROPORTIONAL';
      } else {
        escrowMode = 'ORDERER_CONFIG';
      }

      if (escrowMode === 'FULL_ON_FINAL') {
        // Release 100% only at final stop
        if (isFinalStop) {
          shouldRelease = true;
          // Convert finalRateEtb to cents
          const finalRateEtb = load.finalRateEtb ? Number(load.finalRateEtb) : 0;
          releaseAmountCents = Math.round(finalRateEtb * 100);
        }
      } else if (escrowMode === 'PROPORTIONAL' || escrowMode === 'ORDERER_CONFIG') {
        // Release this stop's proportion at each stop completion
        shouldRelease = true;
        const finalRateEtb = load.finalRateEtb ? Number(load.finalRateEtb) : 0;
        releaseAmountCents = Math.round(finalRateEtb * 100 * (releasePct / 100));
      }

      if (shouldRelease && releaseAmountCents > 0) {
        // Create EscrowLedgerEntry
        await (tx.escrowLedgerEntry as any).create({
          data: {
            id: generateId('esc'),
            loadId: load.id,
            tripId: trip.id,
            fromUserId: load.ordererId,
            toUserId: trip.fleetOwnerId,
            amountCents: releaseAmountCents,
            type: 'STOP_DELIVERY_RELEASE',
            status: 'PENDING',
            notes: `Escrow release for stop ${stop.stopNumber} (${isFinalStop ? 'final' : 'partial'})`
          }
        });

        escrowReleased = true;
      }
    }

    return {
      success: true,
      data: { stop: updatedStop, escrowReleased }
    };
  });
}

/**
 * Get all stops for a trip ordered by stopNumber
 */
export async function getTripStops(tripId: string): Promise<{
  success: boolean;
  data?: { stops: any[] };
  error?: { code: string; message: string };
}> {
  try {
    const stops = await (prisma as any).tripStop.findMany({
      where: { tripId },
      orderBy: { stopNumber: 'asc' }
    });

    return {
      success: true,
      data: { stops }
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch trip stops' }
    };
  }
}

/**
 * Calculate multi-stop price with base price and premium
 */
export async function calculateMultiStopPrice(
  basePricePerKmPerKg: number,
  totalDistanceKm: number,
  totalWeightKg: number,
  stopCount: number
): Promise<{ success: boolean; data?: { basePrice: number; multiStopAdjustment: number; totalPrice: number }; error?: { code: string; message: string } }> {
  try {
    // Get config for multi-stop premium
    const config = await getConfig();
    const multiStopPremiumPct = (config as any).multiStopPremiumPct ?? 6;

    // Base price: standard formula
    const basePrice = basePricePerKmPerKg * totalDistanceKm * totalWeightKg;

    // Multi-stop premium: (stopCount - 1) × config.multiStopPremiumPct / 100
    const premiumMultiplier = (stopCount - 1) * (multiStopPremiumPct / 100);
    const multiStopAdjustment = basePrice * premiumMultiplier;

    const totalPrice = basePrice + multiStopAdjustment;

    return {
      success: true,
      data: {
        basePrice,
        multiStopAdjustment,
        totalPrice
      }
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'CALCULATION_FAILED', message: 'Failed to calculate multi-stop price' }
    };
  }
}

/**
 * Confirm pickup at loading point with MANDATORY cargo photo
 * Required fields: cargoPhotoUrl, cargoPhotoGeoLat, cargoPhotoGeoLng, cargoPhotoTimestamp
 */
export async function confirmPickup(data: {
  tripId: string;
  loadStopId: string;
  cargoPhotoUrl: string;
  cargoPhotoGeoLat: number;
  cargoPhotoGeoLng: number;
  cargoPhotoTimestamp: Date;
  weightTicketPhotoUrl?: string;
}): Promise<{
  success: boolean;
  data?: { loadStop: any };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    // Validate cargo photo is provided
    if (!data.cargoPhotoUrl || !data.cargoPhotoUrl.trim()) {
      return {
        success: false,
        error: {
          code: 'CARGO_PHOTO_REQUIRED',
          message: 'Photo of loaded cargo is required before trip can begin'
        }
      };
    }

    // Find LoadStop
    const loadStop = await tx.loadStop.findUnique({
      where: { id: data.loadStopId },
      include: { load: true }
    });

    if (!loadStop) {
      return {
        success: false,
        error: { code: 'LOAD_STOP_NOT_FOUND', message: 'Load stop not found' }
      };
    }

    // Verify this is a PICKUP stop
    if (loadStop.stopType !== 'PICKUP') {
      return {
        success: false,
        error: { code: 'NOT_PICKUP_STOP', message: 'This is not a pickup stop' }
      };
    }

    // Verify trip exists and matches
    const trip = await tx.trip.findUnique({
      where: { id: data.tripId }
    });

    if (!trip) {
      return {
        success: false,
        error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' }
      };
    }

    if (trip.loadId !== loadStop.loadId) {
      return {
        success: false,
        error: { code: 'LOAD_STOP_TRIP_MISMATCH', message: 'Load stop does not belong to this trip' }
      };
    }

    // Update LoadStop with pickup photo and confirmation
    const updatedLoadStop = await tx.loadStop.update({
      where: { id: data.loadStopId },
      data: {
        pickupPhotoUrl: data.cargoPhotoUrl,
        pickupPhotoLat: new Decimal(String(data.cargoPhotoGeoLat)),
        pickupPhotoLng: new Decimal(String(data.cargoPhotoGeoLng)),
        pickupPhotoAt: data.cargoPhotoTimestamp,
        weightTicketPhotoUrl: data.weightTicketPhotoUrl || null,
        confirmedAt: new Date(),
        confirmedBy: trip.driverId
      }
    });

    // Update Trip to mark actual pickup time
    await tx.trip.update({
      where: { id: data.tripId },
      data: {
        actualPickupAt: new Date(),
        status: 'ACTIVE'
      }
    });

    // Create event for audit trail
    const { ulid } = await import('ulid');
    const strategyId = await tx.strategyVersion.findFirst({
      where: { isActive: true },
      select: { id: true }
    }).then((s: { id?: string } | null) => s?.id ?? 'str_default');

    await tx.event.create({
      data: {
        id: `evt_${ulid()}`,
        eventType: 'PICKUP_CONFIRMED_WITH_PHOTO',
        aggregateId: data.loadStopId,
        aggregateType: 'LOAD_STOP',
        actorId: trip.driverId,
        actorRole: 'DRIVER',
        strategyVersionId: strategyId,
        payload: {
          tripId: data.tripId,
          loadId: loadStop.loadId,
          cargoPhotoUrl: data.cargoPhotoUrl,
          cargoPhotoLat: data.cargoPhotoGeoLat,
          cargoPhotoLng: data.cargoPhotoGeoLng,
          confirmedAt: new Date().toISOString()
        } as any,
        metadata: {
          source: 'PICKUP_CONFIRMATION',
          timestamp: new Date().toISOString()
        } as any
      }
    });

    return {
      success: true,
      data: { loadStop: updatedLoadStop }
    };
  });
}

/**
 * METHOD 2: Confirm stop delivery using driver photo + GPS validation
 */
export async function confirmStopDeliveryPhotoGps(data: {
  tripId: string;
  stopId: string;
  photoUrl: string;
  lat: number;
  lng: number;
}): Promise<{
  success: boolean;
  data?: { stop: any; escrowReleased: boolean };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    const config = await getConfig();

    // Find the stop
    const stop = await tx.tripStop.findUnique({
      where: { id: data.stopId },
      include: { trip: { include: { load: true } } },
    });

    if (!stop) {
      return {
        success: false,
        error: { code: 'STOP_NOT_FOUND', message: 'Trip stop not found' },
      };
    }

    // Verify stop belongs to trip
    if (stop.tripId !== data.tripId) {
      return {
        success: false,
        error: { code: 'STOP_TRIP_MISMATCH', message: 'Stop does not belong to this trip' },
      };
    }

    // Verify stop is in ARRIVED status
    if (stop.status !== 'ARRIVED') {
      return {
        success: false,
        error: { code: 'STOP_NOT_ARRIVED', message: 'Stop must be in ARRIVED status' },
      };
    }

    // Validate photo URL is not empty
    if (!data.photoUrl || data.photoUrl.trim().length === 0) {
      return {
        success: false,
        error: { code: 'PHOTO_REQUIRED', message: 'Photo URL required' },
      };
    }

    // Calculate distance from stop location
    const dLat = (data.lat - stop.locationLat) * Math.PI / 180;
    const dLng = (data.lng - stop.locationLng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(stop.locationLat * Math.PI / 180) *
        Math.cos(data.lat * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceM = 6371 * c * 1000;

    // Validate GPS is within config radius
    if (distanceM > config.deliveryPhotoGpsRadiusM) {
      return {
        success: false,
        error: {
          code: 'GPS_OUT_OF_RANGE',
          message: `GPS location is ${Math.round(distanceM)}m away. Must be within ${config.deliveryPhotoGpsRadiusM}m`,
        },
      };
    }

    // Mark stop as completed
    const updatedStop = await tx.tripStop.update({
      where: { id: data.stopId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        podPhotoUrl: data.photoUrl,
      },
    });

    // Create escrow ledger entry
    const load = stop.trip?.load;
    const trip = stop.trip;

    if (load && trip) {
      await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('eld'),
          loadId: load.id,
          tripId: trip.id,
          fromUserId: 'ESCROW',
          toUserId: trip.driverId,
          amountCents: Math.round(load.estimatedValueCents * (stop.escrowReleasePct / 100)),
          type: 'STOP_DELIVERY_RELEASE_PHOTO',
          status: 'COMPLETED',
          notes: `Stop ${stop.stopNumber} delivered via photo+GPS validation`,
        },
      });
    }

    return {
      success: true,
      data: {
        stop: updatedStop,
        escrowReleased: true,
      },
    };
  });
}

/**
 * METHOD 3: Confirm stop delivery using community agent confirmation
 */
export async function confirmStopDeliveryAgent(data: {
  tripId: string;
  stopId: string;
  agentUserId: string;
}): Promise<{
  success: boolean;
  data?: { stop: any; escrowReleased: boolean };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    // Find the stop
    const stop = await tx.tripStop.findUnique({
      where: { id: data.stopId },
      include: { trip: { include: { load: true } } },
    });

    if (!stop) {
      return {
        success: false,
        error: { code: 'STOP_NOT_FOUND', message: 'Trip stop not found' },
      };
    }

    // Verify stop belongs to trip
    if (stop.tripId !== data.tripId) {
      return {
        success: false,
        error: { code: 'STOP_TRIP_MISMATCH', message: 'Stop does not belong to this trip' },
      };
    }

    // Verify stop is in ARRIVED status
    if (stop.status !== 'ARRIVED') {
      return {
        success: false,
        error: { code: 'STOP_NOT_ARRIVED', message: 'Stop must be in ARRIVED status' },
      };
    }

    // Validate agent exists and has FIELD_AGENT role
    const agent = await tx.user.findUnique({
      where: { id: data.agentUserId },
    });

    if (!agent || agent.role !== 'FIELD_AGENT') {
      return {
        success: false,
        error: { code: 'AGENT_NOT_VALID', message: 'User is not a valid field agent' },
      };
    }

    // Mark stop as completed
    const updatedStop = await tx.tripStop.update({
      where: { id: data.stopId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Create escrow ledger entry
    const load = stop.trip?.load;
    const trip = stop.trip;

    if (load && trip) {
      await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('eld'),
          loadId: load.id,
          tripId: trip.id,
          fromUserId: 'ESCROW',
          toUserId: trip.driverId,
          amountCents: Math.round(load.estimatedValueCents * (stop.escrowReleasePct / 100)),
          type: 'STOP_DELIVERY_RELEASE_AGENT',
          status: 'COMPLETED',
          notes: `Stop ${stop.stopNumber} confirmed by agent ${data.agentUserId}`,
        },
      });
    }

    return {
      success: true,
      data: {
        stop: updatedStop,
        escrowReleased: true,
      },
    };
  });
}

/**
 * METHOD 4: Auto-release escrow after 24 hours (called by worker)
 */
export async function autoReleaseStopEscrow(
  stopId: string
): Promise<{
  success: boolean;
  data?: { released: boolean; amountCents: number };
  error?: { code: string; message: string };
}> {
  return await prisma.$transaction(async (tx: any) => {
    // Find the stop
    const stop = await tx.tripStop.findUnique({
      where: { id: stopId },
      include: { trip: { include: { load: true } } },
    });

    if (!stop) {
      return {
        success: false,
        error: { code: 'STOP_NOT_FOUND', message: 'Trip stop not found' },
      };
    }

    // Only auto-release if stop is in ARRIVED status and older than 24 hours
    if (stop.status !== 'ARRIVED') {
      return {
        success: false,
        error: { code: 'STOP_ALREADY_RELEASED', message: 'Stop already released or skipped' },
      };
    }

    if (!stop.arrivedAt) {
      return {
        success: false,
        error: { code: 'STOP_ARRIVAL_TIME_MISSING', message: 'Stop arrival time is missing' },
      };
    }

    const config = await getConfig();
    const ageHours = (Date.now() - stop.arrivedAt.getTime()) / (1000 * 60 * 60);

    if (ageHours < config.autoReleaseEscrowHours) {
      return {
        success: false,
        error: { code: 'TOO_EARLY', message: `Stop must be at least ${config.autoReleaseEscrowHours} hours old` },
      };
    }

    // Mark stop as completed
    const updatedStop = await tx.tripStop.update({
      where: { id: stopId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Create escrow ledger entry for auto-release
    const load = stop.trip?.load;
    const trip = stop.trip;
    let releasedAmount = 0;

    if (load && trip) {
      releasedAmount = Math.round(load.estimatedValueCents * (stop.escrowReleasePct / 100));

      await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('eld'),
          loadId: load.id,
          tripId: trip.id,
          fromUserId: 'ESCROW',
          toUserId: trip.driverId,
          amountCents: releasedAmount,
          type: 'STOP_DELIVERY_RELEASE_AUTO',
          status: 'COMPLETED',
          notes: `Stop ${stop.stopNumber} auto-released after 24 hours with no response`,
        },
      });

      // Emit event
      await tx.event.create({
        data: {
          id: generateId('evt'),
          eventType: 'STOP_AUTO_RELEASED',
          entityId: stopId,
          entityType: 'TripStop',
          metadata: {
            tripId: trip.id,
            loadId: load.id,
            amountCents: releasedAmount,
            ageHours: Math.round(ageHours),
          },
        },
      });
    }

    return {
      success: true,
      data: {
        released: true,
        amountCents: releasedAmount,
      },
    };
  });
}

