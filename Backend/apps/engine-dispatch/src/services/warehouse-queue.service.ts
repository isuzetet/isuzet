import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';

export interface ReportWarehouseWaitInput {
  driverId: string;
  locationName: string;
  lat: number;
  lng: number;
  zoneId: string;
  currentWaitMin: number;
}

export async function reportWarehouseWait(input: ReportWarehouseWaitInput): Promise<string> {
  const config = await getConfig();

  // Find or create queue entry by locationName + zone proximity
  // For simplicity, match by locationName and zoneId
  const existing = await prisma.warehouseQueue.findFirst({
    where: {
      locationName: input.locationName,
      zoneId: input.zoneId,
    },
  });

  if (existing) {
    // Rolling average of last 5 reports
    const recentReports = await prisma.warehouseQueue.findMany({
      where: {
        locationName: input.locationName,
        zoneId: input.zoneId,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { currentWaitMin: true },
    });

    // Average the wait times including the new report
    const allWaitTimes = [...recentReports.map((r: any) => r.currentWaitMin), input.currentWaitMin];
    const avgWaitMin = Math.round(
      allWaitTimes.reduce((a: number, b: number) => a + b, 0) / allWaitTimes.length
    );

    const updated = await prisma.warehouseQueue.update({
      where: { id: existing.id },
      data: {
        currentWaitMin: avgWaitMin,
        lastReportedAt: new Date(),
        reportedByDriverId: input.driverId,
      },
    });

    return updated.id;
  } else {
    // Create new queue entry
    const newQueue = await prisma.warehouseQueue.create({
      data: {
        id: generateId('wq'),
        locationName: input.locationName,
        lat: input.lat,
        lng: input.lng,
        zoneId: input.zoneId,
        currentWaitMin: input.currentWaitMin,
        lastReportedAt: new Date(),
        reportedByDriverId: input.driverId,
      },
    });

    return newQueue.id;
  }
}

export async function getWarehouseQueues(zoneId?: string): Promise<any[]> {
  const config = await getConfig();
  const expiryHours = config.warehouseQueueExpiryHours;

  // Return active queue entries not older than warehouseQueueExpiryHours
  const expiryTime = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

  const queues = await prisma.warehouseQueue.findMany({
    where: {
      lastReportedAt: { gte: expiryTime },
      ...(zoneId && { zoneId }),
    },
    orderBy: { lastReportedAt: 'desc' },
  });

  return queues;
}
