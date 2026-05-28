import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { prisma } from '@ruit/shared-db';
import { ROLES } from '@ruit/shared-types';
import { ulid } from 'ulid';
import {
  createFleetTruck,
  deleteFleetDriver,
  deleteFleetTruck,
  getFleetDrivers,
  getFleetTruck,
  getFleetTrucks,
  inviteFleetDriver,
  updateFleetDriver,
  updateFleetTruck,
} from '../../apps/engine-dispatch/src/services/fleet.service';

const created = {
  users: [] as string[],
  fleetOwners: [] as string[],
  drivers: [] as string[],
  trucks: [] as string[],
};

function fleetUser(userId: string, fleetOwnerId: string) {
  return {
    sub: userId,
    role: ROLES.FLEET_OWNER,
    entity_id: fleetOwnerId,
    entity_type: 'FLEET_OWNER',
  };
}

async function createFleetOwner(seed: string) {
  const userId = ulid();
  const fleetOwnerId = ulid();
  await prisma.user.create({
    data: {
      id: userId,
      phone: `+2519${seed.slice(-8).padStart(8, '0')}`,
      fullName: `Fleet Owner ${seed}`,
      role: ROLES.FLEET_OWNER,
      status: 'ACTIVE',
    },
  });
  await prisma.fleetOwner.create({
    data: {
      id: fleetOwnerId,
      userId,
      companyName: `Launch Fleet ${seed}`,
      primaryCorridors: [],
    },
  });
  created.users.push(userId);
  created.fleetOwners.push(fleetOwnerId);
  return { userId, fleetOwnerId, token: fleetUser(userId, fleetOwnerId) };
}

async function createDriver(seed: string, fleetOwnerId?: string) {
  const userId = ulid();
  const driverId = ulid();
  await prisma.user.create({
    data: {
      id: userId,
      phone: `+2517${seed.slice(-8).padStart(8, '0')}`,
      fullName: `Driver ${seed}`,
      role: ROLES.DRIVER,
      status: 'ACTIVE',
    },
  });
  await prisma.driver.create({
    data: {
      id: driverId,
      userId,
      fleetOwnerId,
      licenseNumber: `LIC-${seed}`,
      licenseClass: 'C',
      status: 'ACTIVE',
      availabilityStatus: 'AVAILABLE',
    },
  });
  created.users.push(userId);
  created.drivers.push(driverId);
  return { userId, driverId };
}

async function createOrdererUser(seed: string) {
  const userId = ulid();
  await prisma.user.create({
    data: {
      id: userId,
      phone: `+2518${seed.slice(-8).padStart(8, '0')}`,
      fullName: `Orderer ${seed}`,
      role: ROLES.ORDERER,
      status: 'ACTIVE',
    },
  });
  created.users.push(userId);
  return userId;
}

describe('Fleet management launch contracts', () => {
  let ownerA: Awaited<ReturnType<typeof createFleetOwner>>;
  let ownerB: Awaited<ReturnType<typeof createFleetOwner>>;
  let seed: string;

  beforeAll(() => {
    (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
  });

  beforeEach(async () => {
    seed = Date.now().toString();
    ownerA = await createFleetOwner(seed);
    ownerB = await createFleetOwner(`${Number(seed) + 1}`);
  });

  afterEach(async () => {
    await prisma.driverFleetAffiliation.deleteMany({
      where: { OR: [{ driverId: { in: created.drivers } }, { fleetOwnerId: { in: created.fleetOwners } }] },
    });
    await prisma.truck.deleteMany({ where: { id: { in: created.trucks } } });
    await prisma.driver.deleteMany({ where: { id: { in: created.drivers } } });
    await prisma.fleetOwner.deleteMany({ where: { id: { in: created.fleetOwners } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    created.users = [];
    created.fleetOwners = [];
    created.drivers = [];
    created.trucks = [];
  });

  it('scopes truck CRUD by JWT entity_id and returns mobile aliases', async () => {
    const truckResponse = await createFleetTruck(ownerA.token, {
      licensePlate: `AA-${seed.slice(-5)}`,
      registrationNumber: `LIB-${seed.slice(-5)}`,
      capacityKg: 12000,
    });
    const truck = truckResponse.data;
    created.trucks.push(truck.id);

    expect(truck.fleetOwnerId).toBe(ownerA.fleetOwnerId);
    expect(truck.plateNumber).toBe(truck.licensePlate);
    expect(truck.registrationNumber).toBe(`LIB-${seed.slice(-5)}`);

    const ownerATrucks = await getFleetTrucks(ownerA.token);
    expect(ownerATrucks.data.map((item: any) => item.id)).toContain(truck.id);

    await expect(getFleetTruck(ownerB.token, truck.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'TRUCK_NOT_FOUND',
    });

    const updated = await updateFleetTruck(ownerA.token, truck.id, {
      status: 'maintenance',
      capacityKg: 14000,
    });
    expect(updated.data.status).toBe('maintenance');
    expect(updated.data.capacityKg).toBe(14000);

    await deleteFleetTruck(ownerA.token, truck.id);
    const stored = await prisma.truck.findUnique({ where: { id: truck.id } });
    expect(stored?.deletedAt).toBeTruthy();
    expect(stored?.status).toBe('INACTIVE');
    expect((await getFleetTrucks(ownerA.token)).data.map((item: any) => item.id)).not.toContain(truck.id);
  });

  it('links existing drivers, rejects non-driver phones, and unlinks without hard delete', async () => {
    const driver = await createDriver(`${Number(seed) + 2}`);
    const driverUser = await prisma.user.findUniqueOrThrow({ where: { id: driver.userId } });

    const invite = await inviteFleetDriver(ownerA.token, {
      fullName: 'Existing Driver',
      phone: driverUser.phone,
      licenseNumber: 'LIC-LAUNCH',
      paymentType: 'SALARY',
      paymentAmount: 12000,
    });
    expect(invite.data.id).toBe(driver.driverId);
    expect(invite.data.fleetOwnerId).toBe(ownerA.fleetOwnerId);
    expect(invite.data.inviteSent).toBe(false);

    const drivers = await getFleetDrivers(ownerA.token);
    expect(drivers.data.map((item: any) => item.id)).toContain(driver.driverId);

    const updated = await updateFleetDriver(ownerA.token, driver.driverId, {
      fullName: 'Updated Driver',
      active: true,
    });
    expect(updated.data.fullName).toBe('Updated Driver');

    const ordererId = await createOrdererUser(`${Number(seed) + 3}`);
    const orderer = await prisma.user.findUniqueOrThrow({ where: { id: ordererId } });
    await expect(
      inviteFleetDriver(ownerA.token, {
        fullName: 'Wrong Role',
        phone: orderer.phone,
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'PHONE_ROLE_CONFLICT' });

    await deleteFleetDriver(ownerA.token, driver.driverId);
    const storedDriver = await prisma.driver.findUnique({ where: { id: driver.driverId } });
    const affiliation = await prisma.driverFleetAffiliation.findUnique({
      where: { driverId_fleetOwnerId: { driverId: driver.driverId, fleetOwnerId: ownerA.fleetOwnerId } },
    });
    expect(storedDriver).toBeTruthy();
    expect(storedDriver?.fleetOwnerId).toBeNull();
    expect(storedDriver?.status).toBe('INACTIVE');
    expect(affiliation?.status).toBe('INACTIVE');
  });
});

export {};
