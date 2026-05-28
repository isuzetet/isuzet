import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';

export interface ReportFuelPriceInput {
  driverId: string;
  dieselPriceEtbPerLiter: number;
  petrolPriceEtbPerLiter?: number;
  region: string;
  lat?: number;
  lng?: number;
}

export interface GetFuelStationsInput {
  zoneId?: string;
}

export async function reportFuelPrice(input: ReportFuelPriceInput): Promise<string> {
  const config = await getConfig();

  // Check cooldown - reject if same driver + same region within fuelReportCooldownHours
  const cooldownHours = config.fuelReportCooldownHours;
  const cutoffTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

  const recentReport = await prisma.fuelPriceSnapshot.findFirst({
    where: {
      reportedByDriverId: input.driverId,
      region: input.region,
      createdAt: { gte: cutoffTime },
    },
  });

  if (recentReport) {
    throw new Error(
      `Fuel report cooldown active. Can report again after ${cooldownHours} hours`
    );
  }

  // Create FuelPriceSnapshot
  const snapshot = await prisma.fuelPriceSnapshot.create({
    data: {
      id: generateId('fps'),
      dieselPriceEtbPerLiter: Math.floor(input.dieselPriceEtbPerLiter),
      petrolPriceEtbPerLiter: input.petrolPriceEtbPerLiter
        ? Math.floor(input.petrolPriceEtbPerLiter)
        : null,
      region: input.region,
      source: 'DRIVER_REPORT',
      reportedByDriverId: input.driverId,
    },
  });

  return snapshot.id;
}

export async function getFuelStations(zoneId?: string): Promise<any[]> {
  // Get recent fuel reports grouped by region/station
  // Query last 7 days of reports
  const lookbackDays = 7;
  const cutoffTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const reports = await prisma.fuelPriceSnapshot.findMany({
    where: {
      source: { in: ['DRIVER_REPORT', 'MANUAL'] },
      createdAt: { gte: cutoffTime },
    },
    orderBy: [{ region: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  // Group by region
  const grouped: Record<string, any> = {};

  for (const report of reports) {
    if (!grouped[report.region]) {
      grouped[report.region] = {
        region: report.region,
        avgDieselPrice: 0,
        avgPetrolPrice: 0,
        reportCount: 0,
        latestReport: report.createdAt,
        reports: [],
      };
    }

    grouped[report.region].reports.push({
      id: report.id,
      dieselPrice: Number(report.dieselPriceEtbPerLiter),
      petrolPrice: report.petrolPriceEtbPerLiter ? Number(report.petrolPriceEtbPerLiter) : null,
      reportedAt: report.createdAt,
      source: report.source,
    });
  }

  // Calculate averages
  const result = Object.values(grouped).map((group: any) => {
    const validDiesel = group.reports.filter((r: any) => r.dieselPrice > 0);
    const validPetrol = group.reports.filter((r: any) => r.petrolPrice > 0);

    const avgDiesel =
      validDiesel.length > 0
        ? validDiesel.reduce((sum: number, r: any) => sum + r.dieselPrice, 0) / validDiesel.length
        : 0;
    const avgPetrol =
      validPetrol.length > 0
        ? validPetrol.reduce((sum: number, r: any) => sum + r.petrolPrice, 0) / validPetrol.length
        : 0;

    return {
      region: group.region,
      avgDieselPriceEtbPerLiter: Math.round(avgDiesel * 100) / 100,
      avgPetrolPriceEtbPerLiter: avgPetrol > 0 ? Math.round(avgPetrol * 100) / 100 : null,
      reportCount: group.reports.length,
      latestReportAt: group.latestReport,
    };
  });

  return result;
}
