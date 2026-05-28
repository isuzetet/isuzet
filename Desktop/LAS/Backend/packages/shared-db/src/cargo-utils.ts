/**
 * Phase 10: Cargo-Specific Features — Utility Functions
 * Time-critical cargo, livestock, cold chain, cargo-class pricing, seasonal adjustments
 */

import 'dotenv/config';
import { getConfig } from './config';

// Cargo type constants (defined here to avoid circular deps with shared-types)
const CARGO_TYPES = {
  LIVESTOCK: 'LIVESTOCK',
  KHAT: 'KHAT',
  FRESH_FISH: 'FRESH_FISH',
  CUT_FLOWERS: 'CUT_FLOWERS',
  FROZEN_MEAT: 'FROZEN_MEAT',
  FRESH_PRODUCE: 'FRESH_PRODUCE',
  DAIRY: 'DAIRY',
};

const TIME_CRITICAL_CARGO_TYPES = ['KHAT', 'FRESH_FISH', 'CUT_FLOWERS'];
const COLD_CHAIN_CARGO_TYPES = ['FROZEN_MEAT', 'FRESH_PRODUCE', 'DAIRY', 'CUT_FLOWERS'];
const LIVESTOCK_SPECIES = {
  CATTLE: 'CATTLE',
  SHEEP: 'SHEEP',
  POULTRY: 'POULTRY',
};

/**
 * Check if cargo type is time-critical
 */
export function isTimeCritical(cargoType: string): boolean {
  return TIME_CRITICAL_CARGO_TYPES.includes(cargoType);
}

/**
 * Check if cargo type requires cold chain tracking
 */
export function requiresColdChain(cargoType: string): boolean {
  return COLD_CHAIN_CARGO_TYPES.includes(cargoType);
}

/**
 * Check if cargo type is livestock
 */
export function isLivestock(cargoType: string): boolean {
  return cargoType === CARGO_TYPES.LIVESTOCK;
}

/**
 * Get max delivery hours for time-critical cargo type
 */
export async function getMaxDeliveryHours(cargoType: string): Promise<number | null> {
  const config = await getConfig();
  
  switch (cargoType) {
    case CARGO_TYPES.KHAT:
      return config.khatMaxDeliveryHours;
    case CARGO_TYPES.FRESH_FISH:
      return config.freshFishMaxDeliveryHours;
    case CARGO_TYPES.CUT_FLOWERS:
      return config.cutFlowersMaxDeliveryHours;
    default:
      return null;
  }
}

/**
 * Get acceptance window in minutes for time-critical loads
 */
export async function getTimeCriticalAcceptanceWindow(): Promise<number> {
  const config = await getConfig();
  return config.timeCriticalAcceptanceWindowMin;
}

/**
 * Calculate delivery deadline based on pickup time and cargo type
 */
export async function calculateDeliveryDeadline(
  pickupTime: Date,
  cargoType: string
): Promise<Date | null> {
  const maxHours = await getMaxDeliveryHours(cargoType);
  if (!maxHours) return null;
  
  const deadline = new Date(pickupTime);
  deadline.setHours(deadline.getHours() + maxHours);
  return deadline;
}

/**
 * Check if current time is within livestock heat restriction period
 * (11am-3pm, May-September)
 */
export async function isLivestockHeatRestrictionActive(pickupDate?: Date): Promise<boolean> {
  const config = await getConfig();
  const dateToCheck = pickupDate || new Date();
  const currentMonth = dateToCheck.getMonth() + 1; // 1-12
  const currentHour = dateToCheck.getHours(); // 0-23
  
  const isInRestrictedMonths = config.livestockHeatRestrictMonths.includes(currentMonth);
  const isInRestrictedHours = currentHour >= config.livestockHeatRestrictStart && 
                              currentHour < config.livestockHeatRestrictEnd;
  
  return isInRestrictedMonths && isInRestrictedHours;
}

/**
 * Get max transit hours for livestock species
 */
export async function getLivestockMaxTransitHours(species: string): Promise<number | null> {
  const config = await getConfig();
  
  switch (species.toLowerCase()) {
    case LIVESTOCK_SPECIES.CATTLE:
      return config.livestockMaxTransitHours.cattle;
    case LIVESTOCK_SPECIES.SHEEP:
      return config.livestockMaxTransitHours.sheep;
    case LIVESTOCK_SPECIES.POULTRY:
      return config.livestockMaxTransitHours.poultry;
    default:
      return null;
  }
}

/**
 * Get acceptable temperature range for cargo type (cold chain)
 */
export async function getColdChainTempRange(cargoType: string): Promise<{ min: number; max: number } | null> {
  const config = await getConfig();
  const mapping: Record<string, string> = {
    [CARGO_TYPES.FROZEN_MEAT]: 'frozen_meat',
    [CARGO_TYPES.FRESH_PRODUCE]: 'fresh_produce',
    [CARGO_TYPES.DAIRY]: 'dairy',
    [CARGO_TYPES.CUT_FLOWERS]: 'cut_flowers',
  };
  
  const key = mapping[cargoType];
  return key ? config.coldChainTempRanges[key] || null : null;
}

/**
 * Check if temperature is within acceptable range
 */
export async function isTemperatureInRange(
  temperature: number,
  cargoType: string
): Promise<boolean> {
  const range = await getColdChainTempRange(cargoType);
  if (!range) return true; // No range defined, assume valid
  
  return temperature >= range.min && temperature <= range.max;
}

/**
 * Get cargo class multiplier for pricing
 */
export async function getCargoClassMultiplier(cargoType: string): Promise<number> {
  const config = await getConfig();
  return config.cargoClassMultipliers[cargoType] || 1.0;
}

/**
 * Check if current date is within rainy season
 */
export function isRainySeason(): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  // Assuming June-September (6-9)
  return currentMonth >= 6 && currentMonth <= 9;
}

/**
 * Get rainy season multiplier for corridor
 */
export async function getRainySeasonMultiplier(corridorId: string): Promise<number> {
  const config = await getConfig();
  const multiplier = config.rainySeasonCorridorMultipliers.find(
    m => m.corridorId === corridorId
  );
  return multiplier?.riskPremiumMultiplier || 1.0;
}

/**
 * Calculate price with cargo class multiplier
 */
export async function applyCargoClassPricing(basePrice: number, cargoType: string): Promise<{
  basePrice: number;
  cargoClassMultiplier: number;
  adjustedPrice: number;
}> {
  const multiplier = await getCargoClassMultiplier(cargoType);
  const adjustedPrice = Math.round(basePrice * multiplier);
  
  return {
    basePrice,
    cargoClassMultiplier: multiplier,
    adjustedPrice,
  };
}

/**
 * Calculate price with rainy season premium
 */
export async function applyRainySeasonPremium(
  price: number,
  corridorId: string
): Promise<{
  rainySeason: boolean;
  premiumMultiplier: number;
  adjustedPrice: number;
}> {
  const isRainy = isRainySeason();
  const multiplier = await getRainySeasonMultiplier(corridorId);
  
  if (!isRainy || multiplier === 1.0) {
    return {
      rainySeason: false,
      premiumMultiplier: 1.0,
      adjustedPrice: price,
    };
  }
  
  const adjustedPrice = Math.round(price * multiplier);
  
  return {
    rainySeason: true,
    premiumMultiplier: multiplier,
    adjustedPrice,
  };
}

/**
 * Build time-critical cargo alert message
 */
export function buildTimeCriticalAlert(): string {
  return 'TIME-CRITICAL: Immediate matching required. 5-minute acceptance window.';
}

/**
 * Build rainy season warning message
 */
export function buildRainySeasonWarning(corridorId: string): string {
  return `Rainy season active — expect longer transit, road conditions elevated on corridor ${corridorId}`;
}

/**
 * Get time-critical delivery bonus amount
 */
export async function getTimeCriticalDeliveryBonus(): Promise<number> {
  const config = await getConfig();
  return config.timeCriticalDeliveryBonusCents;
}

/**
 * Get cold chain excursion tolerance in minutes
 */
export async function getColdChainExcursionTolerance(): Promise<number> {
  const config = await getConfig();
  return config.coldChainExcursionToleranceMin;
}

/**
 * Calculate livestock payout per head (in ETB cents)
 * Adjusts original payout based on actual livestock delivered alive
 * All values in cents (integers)
 */
export function calculateLivestockPayoutCents(
  originalPayoutCents: number,
  headCount: number,
  deliveredAlive: number
): number {
  if (headCount === 0) return 0;
  const payoutPerHead = originalPayoutCents / headCount;
  return Math.round(payoutPerHead * deliveredAlive);
}
