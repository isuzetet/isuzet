import { prisma } from '@ruit/shared-db';

export async function getZoneDemand(zoneId: string): Promise<any> {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
  });

  if (!zone) {
    throw { code: 'ZONE_NOT_FOUND', message: 'Zone not found' };
  }

  // Count trucks in zone (using drivers with currentZoneId as proxy)
  const availableTrucks = await prisma.driver.count({
    where: {
      currentZoneId: zoneId,
      status: { in: ['AVAILABLE', 'ACTIVE'] },
    },
  });

  // Count open loads in zone
  const openLoads = await prisma.load.count({
    where: {
      pickupZoneId: zoneId,
      status: { in: ['OPEN', 'READY_TO_MATCH', 'QUOTING'] },
    },
  });

  // Get terminals in zone and sum queue counts
  const terminals = await prisma.terminal.findMany({
    where: { zoneId },
    select: { currentQueueCount: true },
  });

  const terminalQueueCount = terminals.reduce((sum: number, t: any) => sum + (t.currentQueueCount || 0), 0);

  return {
    success: true,
    data: {
      zoneId,
      zoneName: zone.name,
      availableTrucks,
      openLoads,
      demandIndex: zone.truckDemandIndex || 0,
      terminalQueueCount,
    },
  };
}

export async function getZones() {
  const zones = await prisma.zone.findMany();

  // Batch query for truck counts and open loads
  const zoneIds = zones.map((z: any) => z.id);

  // Get truck counts per zone
  const truckCounts = await prisma.driver.groupBy({
    by: ['currentZoneId'],
    where: {
      currentZoneId: { in: zoneIds },
      status: { in: ['AVAILABLE', 'ACTIVE'] },
    },
    _count: true,
  });

  // Get open loads per zone
  const loadCounts = await prisma.load.groupBy({
    by: ['pickupZoneId'],
    where: {
      pickupZoneId: { in: zoneIds },
      status: { in: ['OPEN', 'READY_TO_MATCH', 'QUOTING'] },
    },
    _count: true,
  });

  // Terminal queue counts
  const terminalCounts = await prisma.terminal.groupBy({
    by: ['zoneId'],
    where: { zoneId: { in: zoneIds } },
    _sum: { currentQueueCount: true },
  });

  const formattedZones = zones.map((zone: any) => {
    const truckCount = truckCounts.find((t: any) => t.currentZoneId === zone.id)?._count || 0;
    const openLoadCount = loadCounts.find((l: any) => l.pickupZoneId === zone.id)?._count || 0;
    const queueCount = terminalCounts.find((t: any) => t.zoneId === zone.id)?._sum.currentQueueCount || 0;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      availableTrucks: truckCount,
      openLoads: openLoadCount,
      demandIndex: zone.truckDemandIndex || 0,
      terminalQueueCount: queueCount,
    };
  });

  // Sort by demandIndex DESC
  formattedZones.sort((a: any, b: any) => b.demandIndex - a.demandIndex);

  return { success: true, data: formattedZones };
}
