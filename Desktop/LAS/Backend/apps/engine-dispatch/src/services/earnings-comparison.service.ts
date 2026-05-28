import 'dotenv/config';
import { prisma, getConfig } from '@ruit/shared-db';

export interface EarningsComparison {
  platformEarnings: number;
  offPlatformVerifiedEarnings: number;
  estimatedBrokerCost: number;
  netOffPlatformEarnings: number;
  platformAdvantage: number;
  periodDays: number;
}

export async function getEarningsComparison(
  driverId: string,
  periodDays: number
): Promise<EarningsComparison> {
  const config = await getConfig();

  const cutoffTime = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Get platform earnings from completed loads/trips
  const trips = await prisma.trip.findMany({
    where: {
      driverId,
      status: 'DELIVERED',
      updatedAt: { gte: cutoffTime },
    },
    select: {
      load: {
        select: { finalRateEtb: true },
      },
    },
  });

  const platformEarnings = trips.reduce((sum: number, trip: any) => {
    const rate = Number(trip.load?.finalRateEtb) || 0;
    return sum + rate;
  }, 0);

  // Get verified off-platform earnings
  const offPlatformTrips = await prisma.offPlatformTrip.findMany({
    where: {
      driverId,
      verifiedByFleetOwner: true,
      completedAt: { gte: cutoffTime },
    },
    select: {
      earningsCents: true,
    },
  });

  const offPlatformVerifiedEarnings = offPlatformTrips.reduce((sum: number, trip: any) => {
    return sum + (trip.earningsCents || 0);
  }, 0);

  // Calculate broker cost estimate
  const brokerCommissionPct = config.informalBrokerCommissionEstimatePct || 18;
  const estimatedBrokerCost = Math.round(
    offPlatformVerifiedEarnings * (brokerCommissionPct / 100)
  );

  // Net off-platform
  const netOffPlatformEarnings = offPlatformVerifiedEarnings - estimatedBrokerCost;

  // Platform advantage
  const platformAdvantage = platformEarnings - netOffPlatformEarnings;

  return {
    platformEarnings,
    offPlatformVerifiedEarnings,
    estimatedBrokerCost,
    netOffPlatformEarnings,
    platformAdvantage,
    periodDays,
  };
}
