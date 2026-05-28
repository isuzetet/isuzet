import { prisma } from '@ruit/shared-db';
import { normalizePhone, generateOtp, storeOtp, type AccessTokenPayload } from '@ruit/shared-auth';
import { ROLES } from '@ruit/shared-types';
import { getRedisClient } from '@ruit/shared-utils';
import { ulid } from 'ulid';

const TTL_SECONDS = 30;
const redis = getRedisClient();

type FleetUser = Pick<AccessTokenPayload, 'sub' | 'role' | 'entity_id' | 'entity_type'>;

interface CreateTruckInput {
  licensePlate: string;
  plateNumber?: string;
  capacityKg: number;
  registrationNumber?: string;
  truckType?: string;
  bodyType?: string;
  driverId?: string;
  status?: string;
}

interface UpdateTruckInput {
  licensePlate?: string;
  plateNumber?: string;
  capacityKg?: number;
  registrationNumber?: string;
  truckType?: string;
  bodyType?: string;
  driverId?: string | null;
  status?: string;
}

interface InviteDriverInput {
  fullName: string;
  phone: string;
  licenseNumber?: string;
  paymentType?: string;
  paymentAmount?: number;
}

interface UpdateDriverInput {
  fullName?: string;
  phone?: string;
  licenseNumber?: string;
  active?: boolean;
  status?: string;
  paymentType?: string;
  paymentAmount?: number | null;
}

function toDbTruckStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ACTIVE') return 'ACTIVE';
  if (normalized === 'INACTIVE') return 'INACTIVE';
  if (normalized === 'MAINTENANCE') return 'MAINTENANCE';
  if (normalized === 'IDLE') return 'IDLE';
  if (normalized === 'ON_TRIP') return 'ON_TRIP';
  return normalized;
}

function toMobileStatus(status?: string | null): string {
  return (status || 'ACTIVE').toLowerCase();
}

function requireFleetOwnerId(user: FleetUser): string {
  if ((user.role === ROLES.FLEET_OWNER || user.role === ROLES.FLEET_MANAGER) && user.entity_id) {
    return user.entity_id;
  }
  throw Object.assign(new Error('Fleet owner profile not found for this user'), {
    statusCode: 400,
    code: 'FLEET_NOT_FOUND',
  });
}

function mapTruck(truck: any) {
  const driver = truck.currentDriver || null;
  return {
    id: truck.id,
    plateNumber: truck.plateNumber,
    licensePlate: truck.plateNumber,
    registrationNumber: truck.libreNumber ?? null,
    libreNumber: truck.libreNumber ?? null,
    capacityKg: truck.capacityKg,
    truckType: truck.truckType,
    bodyType: truck.bodyType,
    currentDriverId: truck.currentDriverId ?? null,
    driverId: truck.currentDriverId ?? null,
    driver: driver
      ? {
          id: driver.id,
          fullName: driver.user?.fullName ?? '',
          phone: driver.user?.phone ?? '',
        }
      : null,
    status: toMobileStatus(truck.status),
    rawStatus: truck.status,
    isEligibleForLoads: truck.isEligibleForLoads,
    currentLat: truck.currentLat === null || truck.currentLat === undefined ? null : Number(truck.currentLat),
    currentLng: truck.currentLng === null || truck.currentLng === undefined ? null : Number(truck.currentLng),
    currentZoneId: truck.currentZoneId ?? null,
    availableFromAt: truck.availableFromAt?.toISOString?.() ?? null,
    createdAt: truck.createdAt.toISOString(),
    updatedAt: truck.updatedAt.toISOString(),
    fleetOwnerId: truck.fleetOwnerId,
  };
}

function mapDriver(driver: any, affiliation?: any) {
  return {
    id: driver.id,
    userId: driver.userId,
    fullName: driver.user?.fullName ?? '',
    phone: driver.user?.phone ?? '',
    licenseNumber: driver.licenseNumber,
    trustTier: driver.trustTier ?? 0,
    trustScore: driver.trustScore === null || driver.trustScore === undefined ? null : Number(driver.trustScore),
    active: driver.status !== 'INACTIVE' && driver.deletedAt === null,
    status: driver.status,
    availabilityStatus: driver.availabilityStatus,
    fleetOwnerId: driver.fleetOwnerId ?? affiliation?.fleetOwnerId ?? null,
    paymentType: affiliation?.paymentType ?? null,
    paymentAmount: affiliation?.paymentAmount ?? null,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}

async function getDriverSummaries(driverIds: string[]) {
  const uniqueIds = [...new Set(driverIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, any>();

  const drivers = await prisma.driver.findMany({
    where: { id: { in: uniqueIds }, deletedAt: null },
    include: { user: { select: { fullName: true, phone: true } } },
  });
  return new Map(drivers.map((driver: any) => [driver.id, driver]));
}

async function attachTruckDrivers(trucks: any[]) {
  const driverMap = await getDriverSummaries(trucks.map((truck: any) => truck.currentDriverId).filter(Boolean));
  return trucks.map((truck: any) => ({
    ...truck,
    currentDriver: truck.currentDriverId ? driverMap.get(truck.currentDriverId) ?? null : null,
  }));
}

async function isDriverLinkedToFleet(driverId: string, fleetOwnerId: string): Promise<boolean> {
  const direct = await prisma.driver.findFirst({
    where: { id: driverId, fleetOwnerId, deletedAt: null },
    select: { id: true },
  });
  if (direct) return true;

  const affiliation = await prisma.driverFleetAffiliation.findFirst({
    where: { driverId, fleetOwnerId, status: 'ACTIVE' },
    select: { id: true },
  });
  return !!affiliation;
}

function sendInviteSms(phone: string, otp: string, fleetName?: string | null): void {
  const message = `ISUZET: ${fleetName || 'A fleet owner'} invited you as a driver. Verification code: ${otp}`;
  fetch('http://localhost:3013/internal/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message, template: null }),
  }).catch(() => {
    console.log(`[SMS MOCK] To: ${phone}, Message: ${message}`);
  });
}

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

export async function getFleetMetrics(user: FleetUser): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [totalTrucks, activeTrucks, availableDrivers, fleetOwner] = await Promise.all([
    prisma.truck.count({ where: { fleetOwnerId, deletedAt: null } }),
    prisma.truck.count({
      where: { fleetOwnerId, deletedAt: null, status: { in: ['ACTIVE', 'IDLE', 'ON_TRIP'] } },
    }),
    prisma.driver.count({
      where: { fleetOwnerId, deletedAt: null, status: 'ACTIVE', availabilityStatus: 'AVAILABLE' },
    }),
    prisma.fleetOwner.findUnique({ where: { id: fleetOwnerId }, select: { totalRevenueEtb: true } }),
  ]);

  const monthlyTrips = await (prisma as any).trip.findMany({
    where: { fleetOwnerId, createdAt: { gte: monthStart } },
    select: { fleetPayoutEtb: true },
  });

  const monthlyRevenueEtb = monthlyTrips.reduce((sum: number, trip: any) => {
    return sum + Number(trip.fleetPayoutEtb ?? 0);
  }, 0);

  return {
    success: true,
    data: {
      totalTrucks,
      activeTrucks,
      monthlyRevenueEtb: monthlyRevenueEtb || Number(fleetOwner?.totalRevenueEtb ?? 0),
      availableDrivers,
    },
  };
}

export async function getFleetTrucks(user: FleetUser): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const trucks = await prisma.truck.findMany({
    where: { fleetOwnerId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  return { success: true, data: (await attachTruckDrivers(trucks)).map(mapTruck) };
}

export async function getFleetTruck(user: FleetUser, truckId: string): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const truck = await prisma.truck.findFirst({
    where: { id: truckId, fleetOwnerId, deletedAt: null },
  });

  if (!truck) {
    throw Object.assign(new Error('Truck not found'), { statusCode: 404, code: 'TRUCK_NOT_FOUND' });
  }

  return { success: true, data: mapTruck((await attachTruckDrivers([truck]))[0]) };
}

export async function createFleetTruck(user: FleetUser, input: CreateTruckInput): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const plateNumber = (input.plateNumber || input.licensePlate || '').trim().toUpperCase();

  if (!plateNumber) {
    throw Object.assign(new Error('licensePlate is required'), { statusCode: 400, code: 'VALIDATION_ERROR' });
  }
  if (!Number.isInteger(input.capacityKg) || input.capacityKg <= 0) {
    throw Object.assign(new Error('capacityKg must be a positive integer'), { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  if (input.driverId) {
    if (!(await isDriverLinkedToFleet(input.driverId, fleetOwnerId))) {
      throw Object.assign(new Error('Driver is not linked to this fleet'), { statusCode: 400, code: 'DRIVER_NOT_LINKED' });
    }
  }

  try {
    const truck = await prisma.truck.create({
      data: {
        id: ulid(),
        fleetOwnerId,
        plateNumber,
        libreNumber: input.registrationNumber || null,
        truckType: input.truckType || input.bodyType || 'GENERAL',
        bodyType: input.bodyType || input.truckType || 'FLATBED',
        capacityKg: input.capacityKg,
        currentDriverId: input.driverId || null,
        status: toDbTruckStatus(input.status) || 'ACTIVE',
        isEligibleForLoads: false,
      },
    } as any);
    return { success: true, data: mapTruck((await attachTruckDrivers([truck]))[0]) };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw Object.assign(new Error('A truck with this plate number already exists'), {
        statusCode: 409,
        code: 'TRUCK_ALREADY_EXISTS',
      });
    }
    throw error;
  }
}

export async function updateFleetTruck(user: FleetUser, truckId: string, input: UpdateTruckInput): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const existing = await prisma.truck.findFirst({ where: { id: truckId, fleetOwnerId, deletedAt: null } });
  if (!existing) {
    throw Object.assign(new Error('Truck not found'), { statusCode: 404, code: 'TRUCK_NOT_FOUND' });
  }

  if (input.driverId) {
    if (!(await isDriverLinkedToFleet(input.driverId, fleetOwnerId))) {
      throw Object.assign(new Error('Driver is not linked to this fleet'), { statusCode: 400, code: 'DRIVER_NOT_LINKED' });
    }
  }

  const updateData: any = {};
  const plateNumber = input.plateNumber || input.licensePlate;
  if (plateNumber !== undefined) updateData.plateNumber = plateNumber.trim().toUpperCase();
  if (input.capacityKg !== undefined) {
    if (!Number.isInteger(input.capacityKg) || input.capacityKg <= 0) {
      throw Object.assign(new Error('capacityKg must be a positive integer'), { statusCode: 400, code: 'VALIDATION_ERROR' });
    }
    updateData.capacityKg = input.capacityKg;
  }
  if (input.registrationNumber !== undefined) updateData.libreNumber = input.registrationNumber || null;
  if (input.truckType !== undefined) updateData.truckType = input.truckType || 'GENERAL';
  if (input.bodyType !== undefined) updateData.bodyType = input.bodyType || 'FLATBED';
  if (input.driverId !== undefined) updateData.currentDriverId = input.driverId || null;
  if (input.status !== undefined) updateData.status = toDbTruckStatus(input.status);

  const truck = await prisma.truck.update({
    where: { id: truckId },
    data: updateData,
  } as any);

  return { success: true, data: mapTruck((await attachTruckDrivers([truck]))[0]) };
}

export async function deleteFleetTruck(user: FleetUser, truckId: string): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const truck = await prisma.truck.findFirst({ where: { id: truckId, fleetOwnerId, deletedAt: null } });
  if (!truck) {
    throw Object.assign(new Error('Truck not found'), { statusCode: 404, code: 'TRUCK_NOT_FOUND' });
  }

  await prisma.truck.update({
    where: { id: truckId },
    data: {
      deletedAt: new Date(),
      status: 'INACTIVE',
      currentDriverId: null,
      marketplaceAvailable: false,
      isEligibleForLoads: false,
    },
  });

  return { success: true, data: { deleted: true, truckId } };
}

export async function getFleetDrivers(user: FleetUser): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const affiliations = await prisma.driverFleetAffiliation.findMany({
    where: { fleetOwnerId, status: 'ACTIVE' },
  });
  const affiliatedDriverIds = affiliations.map((affiliation: any) => affiliation.driverId);
  const drivers = await prisma.driver.findMany({
    where: {
      deletedAt: null,
      OR: [{ fleetOwnerId }, { id: { in: affiliatedDriverIds } }],
    },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, phone: true } } },
  });

  const affiliationMap = new Map(affiliations.map((affiliation: any) => [affiliation.driverId, affiliation]));
  return { success: true, data: drivers.map((driver: any) => mapDriver(driver, affiliationMap.get(driver.id))) };
}

export async function getFleetDriver(user: FleetUser, driverId: string): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const affiliation = await prisma.driverFleetAffiliation.findFirst({
    where: { driverId, fleetOwnerId, status: 'ACTIVE' },
  });
  const driver = await prisma.driver.findFirst({
    where: {
      id: driverId,
      deletedAt: null,
      OR: [{ fleetOwnerId }, ...(affiliation ? [{ id: driverId }] : [])],
    },
    include: { user: { select: { fullName: true, phone: true } } },
  });

  if (!driver) {
    throw Object.assign(new Error('Driver not found'), { statusCode: 404, code: 'DRIVER_NOT_FOUND' });
  }

  return { success: true, data: mapDriver(driver, affiliation) };
}

export async function inviteFleetDriver(user: FleetUser, input: InviteDriverInput): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const phone = normalizePhone(input.phone);
  const fullName = input.fullName.trim();

  if (!fullName) {
    throw Object.assign(new Error('fullName is required'), { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const fleetOwner = await prisma.fleetOwner.findUnique({ where: { id: fleetOwnerId }, select: { companyName: true } });
  const existingUser = await (prisma as any).user.findUnique({
    where: { phone },
    include: { driver: true, fleetOwner: true, orderer: true },
  });

  let driver: any;
  let createdUser = false;

  if (existingUser) {
    if (existingUser.role !== ROLES.DRIVER || !existingUser.driver) {
      throw Object.assign(new Error('This phone number belongs to a non-driver account'), {
        statusCode: 409,
        code: 'PHONE_ROLE_CONFLICT',
      });
    }
    driver = existingUser.driver;
  } else {
    const otp = generateOtp();
    await storeOtp(phone, otp);
    const userId = ulid();
    const driverId = ulid();
    createdUser = true;

    await prisma.$transaction(async (tx: any) => {
      await tx.user.create({
        data: {
          id: userId,
          phone,
          fullName,
          role: ROLES.DRIVER,
          status: 'PENDING_KYC',
          kycTier: 0,
          preferredLanguage: 'am',
          notificationChannel: 'SMS',
          referralCode: `RUIT${userId.slice(-6).toUpperCase()}`,
        },
      });
      driver = await tx.driver.create({
        data: {
          id: driverId,
          userId,
          fleetOwnerId,
          licenseNumber: input.licenseNumber || 'PENDING',
          licenseClass: 'C',
          licenseExpiry: new Date('2099-12-31'),
          availabilityStatus: 'AVAILABLE',
          status: 'ACTIVE',
        },
      });
      await tx.notificationPreference.create({
        data: {
          userId,
          smsEnabled: true,
          pushEnabled: true,
          emailEnabled: false,
          assignmentNotify: 'SMS',
          payoutNotify: 'SMS',
          incidentNotify: 'BOTH',
          marketingNotify: false,
        },
      });
    });

    sendInviteSms(phone, otp, fleetOwner?.companyName);
  }

  const affiliation = await prisma.driverFleetAffiliation.upsert({
    where: { driverId_fleetOwnerId: { driverId: driver.id, fleetOwnerId } },
    update: {
      status: 'ACTIVE',
      isCurrentlyActive: true,
      paymentType: input.paymentType || 'SALARY',
      paymentAmount: input.paymentAmount ?? null,
      endDate: null,
      updatedAt: new Date(),
    },
    create: {
      id: ulid(),
      driverId: driver.id,
      fleetOwnerId,
      status: 'ACTIVE',
      isCurrentlyActive: true,
      paymentType: input.paymentType || 'SALARY',
      paymentAmount: input.paymentAmount ?? null,
    },
  });

  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      fleetOwnerId,
      licenseNumber: input.licenseNumber || driver.licenseNumber,
      status: 'ACTIVE',
    },
  });

  const linked = await prisma.driver.findUnique({
    where: { id: driver.id },
    include: { user: { select: { fullName: true, phone: true } } },
  });

  return { success: true, data: { ...mapDriver(linked, affiliation), inviteSent: createdUser } };
}

export async function updateFleetDriver(user: FleetUser, driverId: string, input: UpdateDriverInput): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const existing = await prisma.driver.findFirst({
    where: {
      id: driverId,
      deletedAt: null,
      OR: [
        { fleetOwnerId },
        {
          id: {
            in: (
              await prisma.driverFleetAffiliation.findMany({
                where: { fleetOwnerId, status: 'ACTIVE' },
                select: { driverId: true },
              })
            ).map((affiliation: any) => affiliation.driverId),
          },
        },
      ],
    },
    include: { user: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Driver not found'), { statusCode: 404, code: 'DRIVER_NOT_FOUND' });
  }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : undefined;

  try {
    await prisma.$transaction(async (tx: any) => {
      const userData: any = {};
      if (input.fullName !== undefined) userData.fullName = input.fullName.trim();
      if (normalizedPhone !== undefined) userData.phone = normalizedPhone;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: existing.userId }, data: userData });
      }

      const driverData: any = {};
      if (input.licenseNumber !== undefined) driverData.licenseNumber = input.licenseNumber || 'PENDING';
      if (input.active !== undefined) driverData.status = input.active ? 'ACTIVE' : 'INACTIVE';
      if (input.status !== undefined) driverData.status = input.status;
      if (Object.keys(driverData).length > 0) {
        await tx.driver.update({ where: { id: driverId }, data: driverData });
      }

      if (input.paymentType !== undefined || input.paymentAmount !== undefined) {
        await tx.driverFleetAffiliation.upsert({
          where: { driverId_fleetOwnerId: { driverId, fleetOwnerId } },
          update: {
            paymentType: input.paymentType || 'SALARY',
            paymentAmount: input.paymentAmount ?? null,
            updatedAt: new Date(),
          },
          create: {
            id: ulid(),
            driverId,
            fleetOwnerId,
            paymentType: input.paymentType || 'SALARY',
            paymentAmount: input.paymentAmount ?? null,
            status: 'ACTIVE',
          },
        });
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw Object.assign(new Error('Phone number is already in use'), { statusCode: 409, code: 'PHONE_ALREADY_EXISTS' });
    }
    throw error;
  }

  return getFleetDriver(user, driverId);
}

export async function deleteFleetDriver(user: FleetUser, driverId: string): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const driver = await prisma.driver.findFirst({
    where: {
      id: driverId,
      deletedAt: null,
      OR: [
        { fleetOwnerId },
        {
          id: {
            in: (
              await prisma.driverFleetAffiliation.findMany({
                where: { fleetOwnerId, status: 'ACTIVE' },
                select: { driverId: true },
              })
            ).map((affiliation: any) => affiliation.driverId),
          },
        },
      ],
    },
  });

  if (!driver) {
    throw Object.assign(new Error('Driver not found'), { statusCode: 404, code: 'DRIVER_NOT_FOUND' });
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.driverFleetAffiliation.updateMany({
      where: { driverId, fleetOwnerId },
      data: { status: 'INACTIVE', isCurrentlyActive: false, endDate: new Date(), updatedAt: new Date() },
    });
    await tx.truck.updateMany({
      where: { fleetOwnerId, currentDriverId: driverId },
      data: { currentDriverId: null },
    });
    await tx.driver.update({
      where: { id: driverId },
      data: { fleetOwnerId: null, status: 'INACTIVE' },
    });
  });

  return { success: true, data: { deleted: true, driverId } };
}

export async function getLiveFleet(user: FleetUser): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);

  const cacheKey = `fleet:live:${fleetOwnerId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { success: true, data: JSON.parse(cached) };
  }

  const trucks = await prisma.truck.findMany({
    where: { fleetOwnerId, deletedAt: null },
    include: {
      trips: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { load: true },
      },
    },
  } as any);

  const trucksWithDrivers = await attachTruckDrivers(trucks);
  const fleetStates = trucksWithDrivers.map((truck: any) => {
    const dto = mapTruck(truck);
    const currentLoad = truck.trips?.[0]?.load || null;
    return {
      ...dto,
      truckId: truck.id,
      activeDriver: dto.driver,
      currentLoad: currentLoad
        ? {
            id: currentLoad.id,
            type: currentLoad.loadType,
            status: currentLoad.status,
          }
        : null,
    };
  });

  await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(fleetStates));
  return { success: true, data: fleetStates };
}

export async function getIdleTrucks(user: FleetUser, queryFleetOwnerId?: string): Promise<any> {
  const fleetOwnerId =
    user.role === ROLES.OPS_ADMIN || user.role === ROLES.SUPER_ADMIN
      ? queryFleetOwnerId
      : requireFleetOwnerId(user);

  if (!fleetOwnerId) {
    throw Object.assign(new Error('Fleet owner not found'), { statusCode: 400, code: 'FLEET_NOT_FOUND' });
  }

  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  const trucks = await prisma.truck.findMany({
    where: {
      fleetOwnerId,
      deletedAt: null,
      OR: [{ status: 'IDLE' }, { availableFromAt: { lt: now }, currentDriverId: null }],
    },
    include: {
      trips: {
        where: { createdAt: { gt: fourHoursAgo } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { load: true },
      },
    },
  });

  const idleTrucks = [];
  for (const truck of trucks) {
    if (!truck.currentLat || !truck.currentLng) continue;

    const loads = await prisma.load.findMany({
      where: { status: { in: ['OPEN', 'READY_TO_MATCH'] }, stops: { some: { stopType: 'PICKUP' } } },
      include: { stops: { where: { stopType: 'PICKUP' }, orderBy: { stopSequence: 'asc' }, take: 1 } },
      take: 20,
    });

    const nearbyLoads = [];
    for (const load of loads) {
      const pickup = load.stops[0];
      if (!pickup) continue;

      const distance = haversineDistance(
        Number(truck.currentLat),
        Number(truck.currentLng),
        Number(pickup.lat),
        Number(pickup.lng)
      );

      if (distance <= 30000) {
        nearbyLoads.push({ loadId: load.id, distance: Math.round(distance), origin: pickup.address });
      }
    }

    nearbyLoads.sort((a: any, b: any) => a.distance - b.distance);
    idleTrucks.push({
      truckId: truck.id,
      plateNumber: truck.plateNumber,
      licensePlate: truck.plateNumber,
      currentLat: truck.currentLat,
      currentLng: truck.currentLng,
      currentZoneId: truck.currentZoneId,
      status: toMobileStatus(truck.status),
      lastPingAt: truck.trips[0]?.load?.lastLocationAt || null,
      nearestLoads: nearbyLoads.slice(0, 3),
    });
  }

  return { success: true, data: idleTrucks };
}

export async function getFleetRecommendations(user: FleetUser): Promise<any> {
  const fleetOwnerId = requireFleetOwnerId(user);
  const now = new Date();
  const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  const trucks = await prisma.truck.findMany({
    where: { fleetOwnerId, deletedAt: null },
    include: { trips: { orderBy: { createdAt: 'desc' }, take: 1, include: { load: true } } },
  });

  const recommendations = [];

  for (const truck of trucks) {
    const isApproachingFree =
      truck.availableFromAt && truck.availableFromAt > now && truck.availableFromAt <= sixtyMinutesFromNow;
    const isIdleAlert =
      truck.status === 'IDLE' && truck.trips[0]?.load?.lastLocationAt && truck.trips[0].load.lastLocationAt < fourHoursAgo;

    if (!(isApproachingFree || isIdleAlert) || !truck.currentLat || !truck.currentLng) continue;

    const loads = await prisma.load.findMany({ where: { status: { in: ['OPEN', 'READY_TO_MATCH'] } }, take: 10 });
    const loadIds = loads.map((load: any) => load.id);
    const pickups = await prisma.loadStop.findMany({
      where: { loadId: { in: loadIds }, stopType: 'PICKUP' },
      orderBy: { stopSequence: 'asc' },
    });
    const pickupMap = new Map();
    for (const pickup of pickups) {
      if (!pickupMap.has(pickup.loadId)) pickupMap.set(pickup.loadId, pickup);
    }

    const nearestLoads = [];
    for (const load of loads) {
      const pickup = pickupMap.get(load.id);
      if (!pickup) continue;
      const distance = haversineDistance(
        Number(truck.currentLat),
        Number(truck.currentLng),
        Number(pickup.lat),
        Number(pickup.lng)
      );
      if (distance <= 50000) {
        nearestLoads.push({ loadId: load.id, distance: Math.round(distance), origin: pickup.address });
      }
    }

    nearestLoads.sort((a: any, b: any) => a.distance - b.distance);
    recommendations.push({
      truckId: truck.id,
      plateNumber: truck.plateNumber,
      licensePlate: truck.plateNumber,
      recommendationType: isApproachingFree ? 'APPROACHING_FREE' : 'IDLE_ALERT',
      nearestLoads: nearestLoads.slice(0, isIdleAlert ? 1 : 3),
      message: isApproachingFree
        ? `Truck will be available at ${truck.availableFromAt?.toISOString()}`
        : 'Truck has been idle for over 4 hours, check location',
      urgency: !!isIdleAlert,
    });
  }

  return { success: true, data: recommendations };
}
