/**
 * RUIT CBE - Engine 2: Pricing Service
 * Implements PRD Section 7.2 pricing formula + Final Edit 7 + Amendment 2 B2/B3
 */

import 'dotenv/config';
import { prisma as db } from '@ruit/shared-db';
import { cached } from '@ruit/shared-utils';
import { calculateMarketMultiplier } from './market-pricing.service.js';
import {
  applyCargoClassPricing,
  applyRainySeasonPremium,
  isTimeCritical,
  getConfig,
} from '@ruit/shared-db';

export interface QuoteBreakdown {
  systemQuoteEtb: number;
  fleetPayoutEtb: number;
  commissionEtb: number;
  negotiationBandMin: number;
  negotiationBandMax: number;
  breakdown: {
    base: number;
    fuel: number;
    risk: number;
    congestion: number;
    seasonal: number;
    backhaulDiscount: number;
    liquidityPremium: number;
    marketMultiplier: number;
    seasonalMultiplier: number;
    cargoClassMultiplier: number; // Phase 10
    timeCriticalPremium: number; // Phase 10
    rainySeasonPremium: number; // Phase 10
    cargoClassAdjustedPrice: number; // Phase 10
  };
  priceBreakdown: {
    perKm: number;
    weightFactor: number;
    distanceKm: number;
    marketCondition: string;
  };
  marginFloorEtb: number;
  // Phase 2 additions
  expectedCheckpointFeeEtb: number;
  fuelCostEstimateEtb: number;
  estimatedTransitMinutes: number | null;
  totalTripCostToFleetEtb: number;
}

interface PricingParams {
  corridorId: string;
  cargoType: string;
  weightKg: number;
  pickupDate: Date;
  ethiopianCalendarEvent: string | null;
  backhaulProbability: number;
  backhaulConfidence: number;
  liquidityStressLevel: number;
  ordererId: string;
  shockSeverity: number;
  strategyVersionId: string;
}

// Ethiopian calendar event multipliers (Amendment 2 B3)
const EVENT_MULTIPLIERS: Record<string, number> = {
  HARVEST_MEHER: 0.20,
  HARVEST_BELG: 0.12,
  TIMKAT: 0.08,
  FASIKA: 0.10,
  ENKUTATASH: 0.07,
  IRREECHA: 0.06,
  RAMADAN: 0.05,
  GENA: 0.06,
  MAWLID: 0.04,
  MARKET_DAY: 0.05,
  NATIONAL_HOLIDAY: 0.03,
  RAMADAN_START: 0.08,
  RAMADAN_END: 0.04
};

// Shock mode band caps (Final Edit 9, Amendment 2)
const BAND_MAX_MAP: Record<number, number> = {
  0: 1.15,
  1: 1.15,
  2: 1.10,
  3: 1.05,
  4: 1.00
};

/**
 * Compute commission for a quote
 */
export async function computeCommission(
  amountEtb: number,
  ordererId: string,
  corridorId: string,
  cargoType: string
): Promise<number> {
  const cacheKey = `cache:commission:${ordererId}:${corridorId}:${cargoType}`;
  
  return await cached(
    cacheKey,
    1800, // 30 min TTL
    async () => {
      // Priority: orderer-specific > corridor-specific > cargo-type > global
      const configs = await db.commissionConfig.findMany({
        where: {
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      // Find matching config in priority order
      const config = configs.find((c: typeof configs[0]) => c.ordererId === ordererId) 
        || configs.find((c: typeof configs[0]) => c.corridorId === corridorId)
        || configs.find((c: typeof configs[0]) => c.cargoType === cargoType)
        || configs.find((c: typeof configs[0]) => !c.ordererId && !c.corridorId && !c.cargoType);

      if (!config) {
        return amountEtb * 0.10; // Default 10%
      }

      if (config.flatRatePct) {
        return amountEtb * (Number(config.flatRatePct) / 100);
      }

      if (config.fixedAmountEtb) {
        return Number(config.fixedAmountEtb);
      }

      // Tiered logic would go here
      return amountEtb * 0.10; // Fallback
    }
  );
}

/**
 * Compute quote for a load
 * Implements PRD Section 7.2 pricing formula
 */
export async function computeQuote(params: PricingParams): Promise<QuoteBreakdown> {
  // Step 1: Get rate card for corridor
  const rateCard = await cached(
    `cache:corridor:${params.corridorId}`,
    600,
    async () => {
      const result = await db.rateCardVersion.findFirst({
        where: {
          corridorId: params.corridorId,
          effectiveTo: null
        }
      });
      return result;
    }
  );

  if (!rateCard) {
    throw new Error('RATE_CARD_NOT_FOUND');
  }

  // Step 2: Get strategy pricing params
  const strategy = await cached(
    'cache:strategy:active:GLOBAL',
    300,
    async () => db.strategyVersion.findFirst({
      where: { isActive: true }
    })
  );

  const pricingParams = (strategy?.pricingParams as Record<string, unknown>) || {};

  // Step 3: Get corridor for distance
  const corridor = await db.corridor.findUnique({
    where: { id: params.corridorId },
    select: { distanceKm: true }
  });

  const distanceKm = corridor?.distanceKm || 100;

  // Step 3: Base rate
  const baseRatePerKm = Number(rateCard.baseRatePerKm);
  const base = baseRatePerKm * distanceKm;

  // Step 4: Fuel adjustment
  const fuelMultiplier = Number(rateCard.fuelIndexMultiplier);
  const fuel = base * fuelMultiplier;

  // Step 5: Risk premium
  const riskPct = Number(rateCard.riskPremiumPct);
  const risk = base * (riskPct / 100);

  // Step 6: Congestion factor (Amendment 2 B2)
  const eatHour = (params.pickupDate.getUTCHours() + 3) % 24;
  const dayOfWeek = params.pickupDate.getUTCDay();
  
  const timeAdj = (eatHour >= 6 && eatHour < 9) ? 0.08 
    : (eatHour >= 15 && eatHour < 18) ? 0.06
    : (eatHour >= 22 || eatHour < 5) ? -0.02
    : 0;
  
  const dayAdj = (dayOfWeek === 1 || dayOfWeek === 6) ? 0.04
    : dayOfWeek === 5 ? 0.03
    : 0;

  // Get full corridor data for Phase 2 calculations
  const corridorFull = await db.corridor.findUnique({
    where: { id: params.corridorId },
    select: {
      distanceKm: true,
      region: true,
      averageTransitMinutes: true,
      peakHourMultiplier: true,
      loadToTruckRatio: true,
      corridorType: true,
    }
  });

  // Get corridor snapshot for density
  const snapshot = await cached(
    `cache:snapshot:${params.corridorId}:latest`,
    21600,
    async () => {
      // Get latest corridor data
      const result = await db.corridor.findUnique({
        where: { id: params.corridorId },
        select: { loadToTruckRatio: true }
      });
      return result;
    }
  );

  // Phase 2: Calculate expected checkpoint fees
  const checkpointIntelligences = await db.checkpointIntelligence.findMany({
    where: { corridorId: params.corridorId },
  });
  const expectedCheckpointFeeEtb = checkpointIntelligences.reduce(
    (sum: number, ci: any) => sum + ci.averageFeeEtb,
    0
  );

  // Phase 2: Calculate fuel cost estimate
  const fuelPriceSnapshot = await db.fuelPriceSnapshot.findFirst({
    where: { region: corridorFull?.region || '' },
    orderBy: { recordedAt: 'desc' },
  });

  // Default consumption of 25 liters/100km if no truck specified
  const defaultConsumption = 25;
  let fuelCostEstimateEtb = 0;
  if (fuelPriceSnapshot?.dieselPriceEtbPerLiter) {
    const distanceKmNum = (corridorFull?.distanceKm as any) || distanceKm;
    const dieselPrice = fuelPriceSnapshot.dieselPriceEtbPerLiter.toNumber();
    fuelCostEstimateEtb = Math.round((distanceKmNum * defaultConsumption / 100) * dieselPrice * 100);
  }

  // Phase 2: Calculate estimated transit minutes with peak hour multiplier
  let estimatedTransitMinutes: number | null = null;
  if (corridorFull?.averageTransitMinutes) {
    estimatedTransitMinutes = corridorFull.averageTransitMinutes;
    const currentHour = (new Date().getUTCHours() + 3) % 24; // Ethiopian time (UTC+3)
    const isPeakHour = (currentHour >= 7 && currentHour < 9) || (currentHour >= 17 && currentHour < 19);
    if (isPeakHour && corridorFull.peakHourMultiplier) {
      estimatedTransitMinutes = Math.round(estimatedTransitMinutes! * corridorFull.peakHourMultiplier.toNumber());
    }
  }

  // Phase 2: Calculate total trip cost to fleet
  const totalTripCostToFleetEtb = fuelCostEstimateEtb + expectedCheckpointFeeEtb;

  const ltr = snapshot?.loadToTruckRatio ? Number(snapshot.loadToTruckRatio) : 1;
  const densityAdj = Math.max(0, (ltr - 1.5)) * 0.03;
  const congestionFactor = Math.min(0.15, Math.max(0, timeAdj + dayAdj + densityAdj));
  const congestion = base * congestionFactor;

  // Step 7: Seasonal multiplier (Amendment 2 B3)
  const seasonalMultiplierFromEvent = params.ethiopianCalendarEvent 
    ? (EVENT_MULTIPLIERS[params.ethiopianCalendarEvent] ?? 0)
    : 0;
  const seasonalAdjustment = base * seasonalMultiplierFromEvent;

  // Step 8: Backhaul discount (Final Edit 7 - smooth curve)
  const backhaulWeighted = params.backhaulProbability * params.backhaulConfidence;
  const backhaulDiscount = -(base * backhaulWeighted * 0.10); // Negative = reduces quote

  // Step 9: Liquidity premium (Final Edit 7 - smooth)
  const liquidityPremium = base * params.liquidityStressLevel * 0.05;

  // Step 10: Dynamic Market Pricing (Supply/Demand)
  const { multiplier: marketMultiplier, marketCondition, seasonalMultiplier } = await calculateMarketMultiplier(params.corridorId, strategy);

  // Phase 10: Apply cargo-class multiplier
  const config = await getConfig();
  const cargoClassMultiplier = config.cargoClassMultipliers[params.cargoType] || 1.0;
  const cargoClassAdjustedPrice = Math.round(base * cargoClassMultiplier);

  // Phase 10: Check for time-critical cargo premium
  const isTimeCriticalCargo = isTimeCritical(params.cargoType);
  const timeCriticalPremium = isTimeCriticalCargo
    ? Math.round(cargoClassAdjustedPrice * (config.timeCriticalPricePremiumPct / 100))
    : 0;

  // Phase 10: Apply rainy season premium
  const { adjustedPrice: rainyPrice, premiumMultiplier: rainyMultiplier } = await applyRainySeasonPremium(
    cargoClassAdjustedPrice,
    params.corridorId
  );
  const rainySeasonPremium = rainyPrice - cargoClassAdjustedPrice;

  // Step 11: Raw total with Phase 10 adjustments
  let rawTotal = cargoClassAdjustedPrice + fuel + risk + congestion + seasonalAdjustment + backhaulDiscount + liquidityPremium + timeCriticalPremium + rainySeasonPremium;
  
  // Apply Market Multiplier
  rawTotal *= marketMultiplier;

  // Apply Shock mode multiplier (already handled by marketMultiplier if integrated, but let's keep logic clear)
  const shockMultiplier = BAND_MAX_MAP[params.shockSeverity] ?? 1.0;
  // If market pricing is high demand and shock is active, they compose?
  // PRD says apply market multiplier after base WDM.
  
  const marginFloor = Number(rateCard.marginFloorEtb);
  const floorPrice = Number((strategy as any)?.floorPricePerKmPerQuintal || 0) * distanceKm * (params.weightKg / 100);
  const ceilingPrice = Number((strategy as any)?.ceilingPricePerKmPerQuintal || 10) * distanceKm * (params.weightKg / 100);

  const systemQuote = Math.max(Math.min(rawTotal, ceilingPrice), Math.max(marginFloor, floorPrice));

  // Step 12: Shock mode band cap (Final Edit 9)
  const bandMax = BAND_MAX_MAP[params.shockSeverity] ?? 1.15;
  const bandMin = (pricingParams.negotiationBandMin as number) ?? 0.92;

  const negotiationBandMin = systemQuote * bandMin;
  const negotiationBandMax = systemQuote * bandMax;

  // Step 13: Commission
  const commission = await computeCommission(
    systemQuote,
    params.ordererId,
    params.corridorId,
    params.cargoType
  );

  const fleetPayout = systemQuote - commission;

  return {
    systemQuoteEtb: systemQuote,
    fleetPayoutEtb: fleetPayout,
    commissionEtb: commission,
    negotiationBandMin,
    negotiationBandMax,
    breakdown: {
      base,
      fuel,
      risk,
      congestion,
      seasonal: seasonalAdjustment,
      backhaulDiscount,
      liquidityPremium,
      marketMultiplier,
      seasonalMultiplier,
      cargoClassMultiplier,
      timeCriticalPremium,
      rainySeasonPremium,
      cargoClassAdjustedPrice,
    },
    priceBreakdown: {
      perKm: baseRatePerKm,
      weightFactor: params.weightKg / 100,
      distanceKm,
      marketCondition
    },
    marginFloorEtb: Math.max(marginFloor, floorPrice),
    // Phase 2 additions
    expectedCheckpointFeeEtb,
    fuelCostEstimateEtb,
    estimatedTransitMinutes,
    totalTripCostToFleetEtb
  };
}
