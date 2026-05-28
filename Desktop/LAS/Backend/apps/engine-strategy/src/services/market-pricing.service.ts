// Market pricing service — dynamic supply/demand multiplier
// Called every time a quote is requested
import { prisma } from '@ruit/shared-db';

export async function calculateMarketMultiplier(
  corridorId: string,
  strategy: any // active strategy version
): Promise<{ multiplier: number; reason: string; marketCondition: 'high_demand' | 'low_demand' | 'standard_rate'; seasonalMultiplier: number }> {

  // Count unmatched loads on this corridor (demand)
  const unmatchedLoads = await prisma.load.count({
    where: { corridorId, status: 'OPEN' }
  });

  // Count available trucks on this corridor (supply)
  // Available = trucks with eligible drivers near corridor
  const availableDrivers = await prisma.driver.count({
    where: {
      availabilityStatus: 'AVAILABLE',
      preferredCorridorIds: { has: corridorId }
    }
  });

  const supply = Math.max(availableDrivers, 1);
  const demand = unmatchedLoads;
  const marketPressure = demand / supply;

  let multiplier = 1.0;
  let marketCondition: 'high_demand' | 'low_demand' | 'standard_rate' = 'standard_rate';
  let reason = 'standard_rate';

  if (marketPressure > Number(strategy.highDemandThreshold)) {
    const surcharge = Number(strategy.demandSurchargeRate) *
      (marketPressure / Number(strategy.highDemandThreshold));
    multiplier = Math.min(1 + surcharge, Number(strategy.maxDemandMultiplier));
    marketCondition = 'high_demand';
    reason = 'high_demand';
  } else if (marketPressure < Number(strategy.lowDemandThreshold)) {
    const discount = Number(strategy.supplyDiscountRate) *
      (Number(strategy.lowDemandThreshold) / marketPressure);
    multiplier = Math.max(1 - discount, Number(strategy.minDemandMultiplier));
    marketCondition = 'low_demand';
    reason = 'low_demand';
  }

  // Apply seasonal pricing if configured
  const currentEthiopianMonth = getEthiopianMonth();
  const seasonalRules = strategy.seasonalPricingRules as Record<string, number>;
  let seasonalMultiplier = 1.0;
  if (seasonalRules[String(currentEthiopianMonth)]) {
    seasonalMultiplier = seasonalRules[String(currentEthiopianMonth)];
    multiplier *= seasonalMultiplier;
    reason += '_seasonal';
  }

  return { multiplier, reason, marketCondition, seasonalMultiplier };
}

function getEthiopianMonth(): number {
  // Ethiopian calendar conversion
  // Ethiopian year starts ~September 11
  // This is a simplified conversion
  const now = new Date();
  const gregorianMonth = now.getMonth() + 1;
  // Ethiopian months approximately offset by ~8 months
  const ethiopianMonth = ((gregorianMonth + 3) % 12) + 1;
  return ethiopianMonth;
}