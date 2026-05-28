import { prisma, generateId } from '@ruit/shared-db';
import { BACKHAUL_STATUS } from '@ruit/shared-types';

// Haversine formula to calculate distance between two lat/lng points in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface CheckInBody {
  truckId: string;
  driverId: string;
  currentLat: number;
  currentLng: number;
}

export async function checkIn(terminalId: string, body: CheckInBody): Promise<any> {
  const { truckId, driverId, currentLat, currentLng } = body;

  const activeStrategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  const strategyVersionId = activeStrategy?.id || 'str_default';

  const terminal = await prisma.terminal.findUnique({
    where: { id: terminalId },
  });

  if (!terminal) {
    throw { code: 'TERMINAL_NOT_FOUND', message: 'Terminal not found' };
  }

  if (!terminal.isActive) {
    throw { code: 'TERMINAL_INACTIVE', message: 'Terminal is not active' };
  }

  // Calculate haversine distance
  const distance = haversineDistance(
    currentLat,
    currentLng,
    Number(terminal.lat),
    Number(terminal.lng)
  );

  if (distance > terminal.queueRadiusMeters) {
    throw { code: 'OUTSIDE_QUEUE_RADIUS', message: 'Truck is outside the queue radius' };
  }

  // Check if already in queue
  const existingEntry = await prisma.terminalQueueEntry.findFirst({
    where: {
      truckId,
      terminalId,
      isActive: true,
    },
  });

  if (existingEntry) {
    throw { code: 'ALREADY_IN_QUEUE', message: 'Truck is already in the terminal queue' };
  }

  // Get max queue position
  const maxPositionResult = await prisma.terminalQueueEntry.aggregate({
    where: {
      terminalId,
      isActive: true,
    },
    _max: {
      queuePosition: true,
    },
  });

  const queuePosition = (maxPositionResult._max.queuePosition || 0) + 1;

  // Get fleet owner from truck
  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
    select: { fleetOwnerId: true }
  });

  if (!truck) {
    throw { code: 'TRUCK_NOT_FOUND', message: 'Truck not found' };
  }

  // Transaction: create entry and update terminal count
  const [queueEntry] = await prisma.$transaction([
    prisma.terminalQueueEntry.create({
      data: {
        id: generateId('tqe'),
        terminalId,
        truckId,
        driverId,
        fleetOwnerId: truck.fleetOwnerId!,
        queuePosition,
        isActive: true,
        checkedInAt: new Date(),
        lastPresencePingAt: new Date(),
      },
    }),
    prisma.terminal.update({
      where: { id: terminalId },
      data: {
        currentQueueCount: {
          increment: 1,
        },
      },
    }),
  ]);

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'TERMINAL_QUEUE_JOINED',
      aggregateId: queueEntry.id,
      aggregateType: 'TERMINAL_QUEUE_ENTRY',
      actorId: driverId,
      actorRole: 'DRIVER',
      strategyVersionId,
      payload: {
        terminalId,
        truckId,
        driverId,
        queuePosition,
      },
    },
  });

  return { success: true, data: queueEntry };
}

export async function checkOut(terminalId: string, truckId: string): Promise<any> {
  const entry = await prisma.terminalQueueEntry.findFirst({
    where: {
      truckId,
      terminalId,
      isActive: true,
    },
  });

  if (!entry) {
    throw { code: 'NOT_IN_QUEUE', message: 'Truck is not in the terminal queue' };
  }

  // Transaction: update entry and decrement terminal count
  await prisma.$transaction([
    prisma.terminalQueueEntry.update({
      where: { id: entry.id },
      data: {
        isActive: false,
        droppedAt: new Date(),
        dropReason: 'VOLUNTARY',
      },
    }),
    prisma.terminal.update({
      where: { id: terminalId },
      data: {
        currentQueueCount: {
          decrement: 1,
        },
      },
    }),
  ]);

  // Fetch active strategy version
  const strategyVersionId = 'default';

  // Create event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'TERMINAL_QUEUE_DROPPED',
      aggregateId: entry.id,
      aggregateType: 'TERMINAL_QUEUE_ENTRY',
      actorId: entry.driverId || 'SYSTEM',
      actorRole: 'DRIVER',
      strategyVersionId,
      payload: {
        terminalId,
        truckId,
        dropReason: 'VOLUNTARY',
      },
    },
  });

  return { success: true, data: { message: 'Checked out successfully' } };
}

interface PresencePingBody {
  terminalId: string;
  truckId: string;
  currentLat: number;
  currentLng: number;
}

export async function presencePing(body: PresencePingBody): Promise<any> {
  const { terminalId, truckId, currentLat, currentLng } = body;

  const entry = await prisma.terminalQueueEntry.findFirst({
    where: {
      truckId,
      terminalId,
      isActive: true,
    },
    include: {
      terminal: true,
    },
  });

  if (!entry) {
    return { success: true, data: { inQueue: false } };
  }

  const terminal = entry.terminal;
  const distance = haversineDistance(
    currentLat,
    currentLng,
    Number(terminal.lat),
    Number(terminal.lng)
  );

  const now = new Date();

  if (distance <= terminal.queueRadiusMeters) {
    // Within radius - update ping time
    await prisma.terminalQueueEntry.update({
      where: { id: entry.id },
      data: {
        lastPresencePingAt: now,
      },
    });

    return {
      success: true,
      data: {
        inQueue: true,
        queuePosition: entry.queuePosition,
        withinRadius: true,
      },
    };
  }

  // Outside radius - check grace period
  const minutesSinceLastPing =
    (now.getTime() - entry.lastPresencePingAt.getTime()) / (1000 * 60);
  const minutesUntilDrop = terminal.absenceGracePeriodMinutes - minutesSinceLastPing;

  if (minutesSinceLastPing > terminal.absenceGracePeriodMinutes) {
    // Drop from queue
    await prisma.$transaction([
      prisma.terminalQueueEntry.update({
        where: { id: entry.id },
        data: {
          isActive: false,
          droppedAt: now,
          dropReason: 'ABSENCE',
        },
      }),
      prisma.terminal.update({
        where: { id: terminalId },
        data: {
          currentQueueCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    // Fetch active strategy version
    const strategyVersionId = 'default';

    // Create event
    await prisma.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'TERMINAL_QUEUE_DROPPED',
        aggregateId: entry.id,
        aggregateType: 'TERMINAL_QUEUE_ENTRY',
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        strategyVersionId,
        payload: {
          terminalId,
          truckId,
          dropReason: 'ABSENCE',
        },
      },
    });

    return {
      success: true,
      data: { inQueue: false, droppedReason: 'ABSENCE' },
    };
  }

  // Within grace period
  return {
    success: true,
    data: {
      inQueue: true,
      queuePosition: entry.queuePosition,
      withinRadius: false,
      minutesUntilDrop: Math.ceil(minutesUntilDrop),
    },
  };
}

export async function getTerminalQueue(terminalId: string): Promise<any> {
  const terminal = await prisma.terminal.findUnique({
    where: { id: terminalId },
  });

  if (!terminal) {
    throw { code: 'TERMINAL_NOT_FOUND', message: 'Terminal not found' };
  }

  const entries = await prisma.terminalQueueEntry.findMany({
    where: {
      terminalId,
      isActive: true,
    },
    orderBy: {
      queuePosition: 'asc',
    },
  });

  // Fetch trucks and drivers
  const truckIds = entries.map((e: any) => e.truckId);
  const driverIds = entries.map((e: any) => e.driverId);
  const trucks = await prisma.truck.findMany({
    where: { id: { in: truckIds } },
    select: { id: true, plateNumber: true }
  });
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds } },
    select: { id: true }
  });

  const truckMap = new Map(trucks.map((t: any) => [t.id, t.plateNumber]));
  const driverMap = new Map(drivers.map((d: any) => [d.id, d.id]));

  const now = new Date();

  const formattedEntries = entries.map((entry: any) => {
    const waitingMinutes = Math.floor(
      (now.getTime() - entry.checkedInAt.getTime()) / (1000 * 60)
    );

    return {
      id: entry.id,
      queuePosition: entry.queuePosition,
      truckPlateNumber: truckMap.get(entry.truckId) || null,
      driverName: driverMap.get(entry.driverId) || null,
      checkedInAt: entry.checkedInAt,
      waitingMinutes,
    };
  });

  return { success: true, data: formattedEntries };
}

export async function getTerminals(): Promise<any> {
  const terminals = await prisma.terminal.findMany({
    where: {
      isActive: true,
    },
    include: {
      zone: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedTerminals = terminals.map((terminal: any) => ({
    id: terminal.id,
    name: terminal.name,
    lat: terminal.lat,
    lng: terminal.lng,
    zoneName: terminal.zone?.name || null,
    currentQueueCount: terminal.currentQueueCount,
    averageWaitTimeMinutes: terminal.averageWaitTimeMinutes,
    queueRadiusMeters: terminal.queueRadiusMeters,
    isActive: terminal.isActive,
  }));

  return { success: true, data: formattedTerminals };
}
