import 'dotenv/config';
import { prisma, getConfig } from '@ruit/shared-db';

export interface GetCorridorRatesInput {
  corridorId: string;
  cargoType?: string;
  driverUserId?: string;
}

export interface CorridorRates {
  corridorId: string;
  cargoType?: string;
  minRateEtbPerKg: number;
  maxRateEtbPerKg: number;
  medianRateEtbPerKg: number;
  avgRateEtbPerKg: number;
  sampleCount: number;
  driverPersonalAvg?: number;
}

export async function getCorridorRates(input: GetCorridorRatesInput): Promise<CorridorRates> {
  const config = await getConfig();
  // Default to 30 days lookback if not in config
  const lookbackDays = 30;

  const cutoffTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  // Query completed loads from the corridor within lookback period
  const loads = await prisma.load.findMany({
    where: {
      corridorId: input.corridorId,
      status: 'DELIVERED',
      updatedAt: { gte: cutoffTime },
      ...(input.cargoType && { cargoType: input.cargoType }),
    },
    select: {
      id: true,
      finalRateEtb: true,
      weightKg: true,
      cargoType: true,
      trips: {
        where: { status: 'DELIVERED' },
        select: { driverId: true },
      },
    },
  });

  if (loads.length === 0) {
    return {
      corridorId: input.corridorId,
      cargoType: input.cargoType,
      minRateEtbPerKg: 0,
      maxRateEtbPerKg: 0,
      medianRateEtbPerKg: 0,
      avgRateEtbPerKg: 0,
      sampleCount: 0,
    };
  }

  // Calculate rate per kg for each load
  const rates = loads
    .map((load: any) => {
      const rate = Number(load.finalRateEtb) || 0;
      const weight = load.weightKg || 1;
      return weight > 0 ? rate / weight : 0;
    })
    .filter((rate: number) => rate > 0)
    .sort((a: number, b: number) => a - b);

  if (rates.length === 0) {
    return {
      corridorId: input.corridorId,
      cargoType: input.cargoType,
      minRateEtbPerKg: 0,
      maxRateEtbPerKg: 0,
      medianRateEtbPerKg: 0,
      avgRateEtbPerKg: 0,
      sampleCount: 0,
    };
  }

  // Calculate statistics
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const median = rates[Math.floor(rates.length / 2)];
  const avg = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;

  const result: CorridorRates = {
    corridorId: input.corridorId,
    cargoType: input.cargoType,
    minRateEtbPerKg: Math.round(min * 100) / 100,
    maxRateEtbPerKg: Math.round(max * 100) / 100,
    medianRateEtbPerKg: Math.round(median * 100) / 100,
    avgRateEtbPerKg: Math.round(avg * 100) / 100,
    sampleCount: rates.length,
  };

  // If driverId is provided, get their personal average
  if (input.driverUserId) {
    const driverLoads = loads.filter((load: any) =>
      load.trips && load.trips.length > 0
        ? load.trips.some((t: any) => t.driverId === input.driverUserId)
        : false
    );

    if (driverLoads.length > 0) {
      const driverRates = driverLoads
        .map((load: any) => {
          const rate = Number(load.finalRateEtb) || 0;
          const weight = load.weightKg || 1;
          return weight > 0 ? rate / weight : 0;
        })
        .filter((rate: number) => rate > 0);

      if (driverRates.length > 0) {
        const driverAvg = driverRates.reduce((a: number, b: number) => a + b, 0) / driverRates.length;
        result.driverPersonalAvg = Math.round(driverAvg * 100) / 100;
      }
    }
  }

  return result;
}

