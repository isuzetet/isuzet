/**
 * ISUZET Pricing Engine V2
 * Implements two-mode pricing: CONSOLIDATED and CHARTER
 * All parameters sourced from active StrategyVersion
 */

import { prisma as db } from '@ruit/shared-db';

// ════════════════════════════════════════════════════════════════════════════
// LOCAL INTERFACES
// ════════════════════════════════════════════════════════════════════════════

interface PricingQuote {
  // Core identifiers
  loadId: string;
  strategyVersionId: string;

  // Pricing mode and weights
  pricingMode: 'CONSOLIDATED' | 'CHARTER';
  distanceKm: number;
  weightQuintals: number; // 0 for CHARTER mode
  cargoType: string;

  // Pricing factors
  cargoMultiplier: number; // From cargoClassMultipliers JSON
  baseRatePerKmPerQuintal: number; // For CONSOLIDATED only
  charterBasePrice: number; // For CHARTER only
  seasonalMultiplier: number; // From EthiopianCalendarEvent if active

  // Gross amount (pre-commission)
  grossAmountEtb: number;

  // Commission details
  commissionPct: number; // Applied commission rate
  commissionEtb: number;
  minCommissionApplied: boolean; // True if min commission floor was enforced
  maxCommissionApplied: boolean; // True if max commission ceiling was enforced

  // Net payout
  netAmountToDriverEtb: number; // grossAmountEtb - commissionEtb

  // Floor/ceiling enforcement
  floorEnforced: boolean; // True if floor price was applied
  ceilingEnforced: boolean; // True if ceiling price was applied
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER: SEASONAL MULTIPLIER MAPPING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Maps Ethiopian calendar event names to pricing multipliers.
 * These multipliers represent the price premium during seasonal events.
 */
const EVENT_MULTIPLIER_MAP: Record<string, number> = {
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

// ════════════════════════════════════════════════════════════════════════════
// COMMISSION CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Commission configuration is now sourced from active StrategyVersion:
 * - commissionTier1MaxEtb, commissionTier2MaxEtb, commissionTier3MaxEtb
 * - commissionTier1Pct, commissionTier2Pct, commissionTier3Pct, commissionTier4Pct
 * - commissionMinEtb, commissionMaxEtb
 */

// Charter fallback base prices per km (when not in matrix)
const CHARTER_FALLBACK_RATES: Record<string, number> = {
  '3TON': 25, // 25 ETB per km
  '5TON': 35, // 35 ETB per km
  '7TON': 45, // 45 ETB per km
  '10TON': 60, // 60 ETB per km
  '15TON': 80 // 80 ETB per km
};

// ════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calculate commission based on gross amount using tiered structure from StrategyVersion
 */
async function calculateCommissionAmount(grossAmountEtb: number): Promise<{
  commissionPct: number;
  commissionEtb: number;
  netAmountEtb: number;
  minApplied: boolean;
  maxApplied: boolean;
}> {
  // Load active StrategyVersion for commission configuration
  const strategyVersion = await db.strategyVersion.findFirst({
    where: { isActive: true }
  });

  if (!strategyVersion) {
    throw new Error('No active StrategyVersion found for commission calculation');
  }

  // Build commission tiers from StrategyVersion
  const tiers = [
    {
      maxAmount: Number(strategyVersion.commissionTier1MaxEtb),
      rate: Number(strategyVersion.commissionTier1Pct)
    },
    {
      maxAmount: Number(strategyVersion.commissionTier2MaxEtb),
      rate: Number(strategyVersion.commissionTier2Pct)
    },
    {
      maxAmount: Number(strategyVersion.commissionTier3MaxEtb),
      rate: Number(strategyVersion.commissionTier3Pct)
    },
    {
      maxAmount: Infinity,
      rate: Number(strategyVersion.commissionTier4Pct)
    }
  ];

  const commissionMinEtb = Number(strategyVersion.commissionMinEtb);
  const commissionMaxEtb = Number(strategyVersion.commissionMaxEtb);

  // Determine tier based on gross amount
  let commissionPct = tiers[tiers.length - 1].rate; // Default to lowest tier rate
  for (const tier of tiers) {
    if (grossAmountEtb <= tier.maxAmount) {
      commissionPct = tier.rate;
      break;
    }
  }

  // Calculate raw commission
  let commissionEtb = Math.round(grossAmountEtb * commissionPct);
  let minApplied = false;
  let maxApplied = false;

  // Apply floor (minimum commission)
  if (commissionEtb < commissionMinEtb) {
    commissionEtb = commissionMinEtb;
    minApplied = true;
  }

  // Apply ceiling (maximum commission)
  if (commissionEtb > commissionMaxEtb) {
    commissionEtb = commissionMaxEtb;
    maxApplied = true;
  }

  const netAmountEtb = grossAmountEtb - commissionEtb;

  return {
    commissionPct,
    commissionEtb,
    netAmountEtb,
    minApplied,
    maxApplied
  };
}

/**
 * Get active seasonal multiplier for a given event
 */
async function getSeasonalMultiplier(
  eventName: string | null | undefined
): Promise<number> {
  if (!eventName) return 1.0;

  // Check if event is active and map to multiplier
  const multiplier = EVENT_MULTIPLIER_MAP[eventName];
  if (!multiplier) return 1.0;

  // Verify event is currently active
  const now = new Date();
  const event = await db.ethiopianCalendarEvent.findFirst({
    where: {
      eventName: eventName,
      gregorianDate: {
        lte: now
      },
      isRecurring: true
    }
  });

  if (!event) return 1.0;

  return 1.0 + multiplier; // Multiplier is the premium (e.g., 0.20 means 1.20x)
}

/**
 * Calculate CONSOLIDATED pricing
 */
async function calculateConsolidatedPrice(params: {
  loadId: string;
  overrideDistanceKm?: number;
}): Promise<PricingQuote> {
  // Load the Load record with corridor
  const load = await db.load.findUnique({
    where: { id: params.loadId },
    include: {
      orderer: true
    }
  });

  if (!load) {
    throw new Error(`Load not found: ${params.loadId}`);
  }

  // Verify pricing mode
  if (load.pricingMode !== 'CONSOLIDATED') {
    throw new Error(
      `Load is not in CONSOLIDATED pricing mode. Current mode: ${load.pricingMode}`
    );
  }

  // Load the active StrategyVersion
  const strategyVersion = await db.strategyVersion.findFirst({
    where: { isActive: true }
  });

  if (!strategyVersion) {
    throw new Error('No active StrategyVersion found');
  }

  // Extract floor and ceiling prices from strategy
  const floorPricePerKmPerQuintal = Number(
    strategyVersion.floorPricePerKmPerQuintal
  );
  const ceilingPricePerKmPerQuintal = Number(
    strategyVersion.ceilingPricePerKmPerQuintal
  );

  // Parse cargo class multipliers from strategy JSON
  let cargoClassMultipliers: Record<string, number> = {};
  try {
    if (typeof strategyVersion.cargoClassMultipliers === 'string') {
      cargoClassMultipliers = JSON.parse(
        strategyVersion.cargoClassMultipliers
      );
    } else if (typeof strategyVersion.cargoClassMultipliers === 'object') {
      cargoClassMultipliers = strategyVersion.cargoClassMultipliers as Record<
        string,
        number
      >;
    }
  } catch (e) {
    console.warn('Failed to parse cargoClassMultipliers, using defaults', e);
    cargoClassMultipliers = {};
  }

  // Get distance
  let distanceKm = params.overrideDistanceKm;
  if (!distanceKm) {
    const corridor = await db.corridor.findUnique({
      where: { id: load.corridorId }
    });
    distanceKm = corridor?.distanceKm;
    if (!distanceKm) {
      throw new Error(
        'Cannot calculate price: corridor distance unknown and no override provided'
      );
    }
  }

  // Get weight in quintals (Load.weightKg is in kilograms, convert to quintals)
  const weightQuintals = load.weightKg / 100;
  if (!weightQuintals || weightQuintals <= 0) {
    throw new Error('Load weight is required for consolidated pricing');
  }

  // Get cargo multiplier (default 1.0 if not found)
  const cargoMultiplier = cargoClassMultipliers[load.cargoType] ?? 1.0;

  // Get seasonal multiplier
  const seasonalMultiplier = await getSeasonalMultiplier(
    load.ethiopianCalendarEvent
  );

  // Get base rate per km per quintal from rate card
  const rateCard = await db.rateCardVersion.findFirst({
    where: {
      corridorId: load.corridorId,
      effectiveTo: null
    }
  });

  let baseRatePerKmPerQuintal = floorPricePerKmPerQuintal;
  if (rateCard) {
    baseRatePerKmPerQuintal = Number(rateCard.baseRatePerKm);
  }

  // Apply floor and ceiling to base rate
  let floorEnforced = false;
  let ceilingEnforced = false;

  if (baseRatePerKmPerQuintal < floorPricePerKmPerQuintal) {
    baseRatePerKmPerQuintal = floorPricePerKmPerQuintal;
    floorEnforced = true;
  }

  if (baseRatePerKmPerQuintal > ceilingPricePerKmPerQuintal) {
    baseRatePerKmPerQuintal = ceilingPricePerKmPerQuintal;
    ceilingEnforced = true;
  }

  // Calculate gross amount
  const grossAmountEtb = Math.round(
    baseRatePerKmPerQuintal *
      distanceKm *
      weightQuintals *
      cargoMultiplier *
      seasonalMultiplier * 100
  ) / 100; // Round to 2 decimal places

  // Calculate commission
  const commissionResult = await calculateCommissionAmount(grossAmountEtb);

  return {
    loadId: load.id,
    strategyVersionId: strategyVersion.id,
    pricingMode: 'CONSOLIDATED',
    distanceKm,
    weightQuintals,
    cargoType: load.cargoType,
    cargoMultiplier,
    baseRatePerKmPerQuintal,
    charterBasePrice: 0,
    seasonalMultiplier,
    grossAmountEtb,
    commissionPct: commissionResult.commissionPct,
    commissionEtb: commissionResult.commissionEtb,
    minCommissionApplied: commissionResult.minApplied,
    maxCommissionApplied: commissionResult.maxApplied,
    netAmountToDriverEtb: commissionResult.netAmountEtb,
    floorEnforced,
    ceilingEnforced
  };
}

/**
 * Calculate CHARTER pricing
 */
async function calculateCharterPrice(params: {
  loadId: string;
  overrideDistanceKm?: number;
}): Promise<PricingQuote> {
  // Load the Load record with corridor
  const load = await db.load.findUnique({
    where: { id: params.loadId },
    include: {
      orderer: true
    }
  });

  if (!load) {
    throw new Error(`Load not found: ${params.loadId}`);
  }

  // Verify pricing mode
  if (load.pricingMode !== 'CHARTER') {
    throw new Error(
      `Load is not in CHARTER pricing mode. Current mode: ${load.pricingMode}`
    );
  }

  // Load the active StrategyVersion
  const strategyVersion = await db.strategyVersion.findFirst({
    where: { isActive: true }
  });

  if (!strategyVersion) {
    throw new Error('No active StrategyVersion found');
  }

  // Parse charter base price matrix from strategy JSON
  let charterBasePriceMatrix: Record<string, Record<string, number>> = {};
  try {
    if (typeof strategyVersion.charterBasePriceMatrix === 'string') {
      charterBasePriceMatrix = JSON.parse(
        strategyVersion.charterBasePriceMatrix
      );
    } else if (typeof strategyVersion.charterBasePriceMatrix === 'object') {
      charterBasePriceMatrix = strategyVersion.charterBasePriceMatrix as Record<
        string,
        Record<string, number>
      >;
    }
  } catch (e) {
    console.warn('Failed to parse charterBasePriceMatrix, using fallback', e);
    charterBasePriceMatrix = {};
  }

  // Parse cargo class multipliers
  let cargoClassMultipliers: Record<string, number> = {};
  try {
    if (typeof strategyVersion.cargoClassMultipliers === 'string') {
      cargoClassMultipliers = JSON.parse(
        strategyVersion.cargoClassMultipliers
      );
    } else if (typeof strategyVersion.cargoClassMultipliers === 'object') {
      cargoClassMultipliers = strategyVersion.cargoClassMultipliers as Record<
        string,
        number
      >;
    }
  } catch (e) {
    console.warn('Failed to parse cargoClassMultipliers, using defaults', e);
    cargoClassMultipliers = {};
  }

  // Get distance
  let distanceKm = params.overrideDistanceKm;
  if (!distanceKm) {
    const corridor = await db.corridor.findUnique({
      where: { id: load.corridorId }
    });
    distanceKm = corridor?.distanceKm;
    if (!distanceKm) {
      throw new Error(
        'Cannot calculate price: corridor distance unknown and no override provided'
      );
    }
  }

  // Get truck size
  const truckSize = load.charterTruckSize;
  if (!truckSize) {
    throw new Error('Charter load must have charterTruckSize specified');
  }

  // Look up charter base price from matrix
  let charterBasePrice = charterBasePriceMatrix[truckSize]?.[load.corridorId];

  // Fall back to distance-based estimate if not in matrix
  if (!charterBasePrice) {
    const fallbackRate = CHARTER_FALLBACK_RATES[truckSize] ?? 35;
    charterBasePrice = distanceKm * fallbackRate;
  }

  // Get cargo multiplier
  const cargoMultiplier = cargoClassMultipliers[load.cargoType] ?? 1.0;

  // Get seasonal multiplier
  const seasonalMultiplier = await getSeasonalMultiplier(
    load.ethiopianCalendarEvent
  );

  // Calculate gross amount
  const grossAmountEtb = Math.round(
    charterBasePrice * cargoMultiplier * seasonalMultiplier * 100
  ) / 100;

  // Calculate commission
  const commissionResult = await calculateCommissionAmount(grossAmountEtb);

  return {
    loadId: load.id,
    strategyVersionId: strategyVersion.id,
    pricingMode: 'CHARTER',
    distanceKm,
    weightQuintals: 0, // Charter has no per-quintal pricing
    cargoType: load.cargoType,
    cargoMultiplier,
    baseRatePerKmPerQuintal: 0, // Not used in charter mode
    charterBasePrice,
    seasonalMultiplier,
    grossAmountEtb,
    commissionPct: commissionResult.commissionPct,
    commissionEtb: commissionResult.commissionEtb,
    minCommissionApplied: commissionResult.minApplied,
    maxCommissionApplied: commissionResult.maxApplied,
    netAmountToDriverEtb: commissionResult.netAmountEtb,
    floorEnforced: false, // Charter mode does not use floor/ceiling
    ceilingEnforced: false
  };
}

/**
 * Get pricing quote for a load (dispatcher method)
 */
async function getPricingQuoteForLoad(loadId: string): Promise<PricingQuote> {
  const load = await db.load.findUnique({
    where: { id: loadId }
  });

  if (!load) {
    throw new Error(`Load not found: ${loadId}`);
  }

  const pricingMode = load.pricingMode ?? 'CONSOLIDATED';

  if (pricingMode === 'CONSOLIDATED') {
    return calculateConsolidatedPrice({ loadId });
  } else if (pricingMode === 'CHARTER') {
    return calculateCharterPrice({ loadId });
  } else {
    throw new Error(`Unknown pricing mode: ${pricingMode}`);
  }
}

/**
 * Standalone commission calculator
 */
async function calculateCommission(grossAmountEtb: number): Promise<{
  commissionPct: number;
  commissionEtb: number;
  netAmountEtb: number;
  minApplied: boolean;
  maxApplied: boolean;
}> {
  return await calculateCommissionAmount(grossAmountEtb);
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE OBJECT
// ════════════════════════════════════════════════════════════════════════════

export const pricingV2Service = {
  calculateConsolidatedPrice,
  calculateCharterPrice,
  calculateCommission,
  getPricingQuoteForLoad
};
