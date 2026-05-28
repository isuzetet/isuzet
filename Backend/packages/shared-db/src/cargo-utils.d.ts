/**
 * Phase 10: Cargo-Specific Features — Utility Functions
 * Time-critical cargo, livestock, cold chain, cargo-class pricing, seasonal adjustments
 */
import 'dotenv/config';
/**
 * Check if cargo type is time-critical
 */
export declare function isTimeCritical(cargoType: string): boolean;
/**
 * Check if cargo type requires cold chain tracking
 */
export declare function requiresColdChain(cargoType: string): boolean;
/**
 * Check if cargo type is livestock
 */
export declare function isLivestock(cargoType: string): boolean;
/**
 * Get max delivery hours for time-critical cargo type
 */
export declare function getMaxDeliveryHours(cargoType: string): Promise<number | null>;
/**
 * Get acceptance window in minutes for time-critical loads
 */
export declare function getTimeCriticalAcceptanceWindow(): Promise<number>;
/**
 * Calculate delivery deadline based on pickup time and cargo type
 */
export declare function calculateDeliveryDeadline(pickupTime: Date, cargoType: string): Promise<Date | null>;
/**
 * Check if current time is within livestock heat restriction period
 * (11am-3pm, May-September)
 */
export declare function isLivestockHeatRestrictionActive(pickupDate?: Date): Promise<boolean>;
/**
 * Get max transit hours for livestock species
 */
export declare function getLivestockMaxTransitHours(species: string): Promise<number | null>;
/**
 * Get acceptable temperature range for cargo type (cold chain)
 */
export declare function getColdChainTempRange(cargoType: string): Promise<{
    min: number;
    max: number;
} | null>;
/**
 * Check if temperature is within acceptable range
 */
export declare function isTemperatureInRange(temperature: number, cargoType: string): Promise<boolean>;
/**
 * Get cargo class multiplier for pricing
 */
export declare function getCargoClassMultiplier(cargoType: string): Promise<number>;
/**
 * Check if current date is within rainy season
 */
export declare function isRainySeason(): boolean;
/**
 * Get rainy season multiplier for corridor
 */
export declare function getRainySeasonMultiplier(corridorId: string): Promise<number>;
/**
 * Calculate price with cargo class multiplier
 */
export declare function applyCargoClassPricing(basePrice: number, cargoType: string): Promise<{
    basePrice: number;
    cargoClassMultiplier: number;
    adjustedPrice: number;
}>;
/**
 * Calculate price with rainy season premium
 */
export declare function applyRainySeasonPremium(price: number, corridorId: string): Promise<{
    rainySeason: boolean;
    premiumMultiplier: number;
    adjustedPrice: number;
}>;
/**
 * Build time-critical cargo alert message
 */
export declare function buildTimeCriticalAlert(): string;
/**
 * Build rainy season warning message
 */
export declare function buildRainySeasonWarning(corridorId: string): string;
/**
 * Get time-critical delivery bonus amount
 */
export declare function getTimeCriticalDeliveryBonus(): Promise<number>;
/**
 * Get cold chain excursion tolerance in minutes
 */
export declare function getColdChainExcursionTolerance(): Promise<number>;
/**
 * Calculate livestock payout per head (in ETB cents)
 * Adjusts original payout based on actual livestock delivered alive
 * All values in cents (integers)
 */
export declare function calculateLivestockPayoutCents(originalPayoutCents: number, headCount: number, deliveredAlive: number): number;
//# sourceMappingURL=cargo-utils.d.ts.map