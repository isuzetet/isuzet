import 'dotenv/config';
export interface MarketDayIntelligence {
    isMarketDay: boolean;
    isMarketDayTomorrow: boolean;
    nextMarketDay: Date | null;
    demandBoostPct: number;
    peakLoadingHour: number;
    marketName: string | null;
}
/**
 * Get market day intelligence for a given zone and date.
 * This function checks if today or tomorrow is a market day for the zone,
 * and returns the demand boost percentage from the configured strategy.
 *
 * Business Rule:
 * - Zone demand index spikes day before and morning of market day
 * - Market-day adjacent loads get automatic premium from StrategyConfig
 * - Driver notification: "Ziway market day is Thursday — 85% load probability"
 * - Backhaul engine uses this data for return load prediction
 *
 * @param zoneId - The zone ID to check
 * @param date - The reference date (defaults to now)
 * @returns MarketDayIntelligence object
 */
export declare function getMarketDayIntelligence(zoneId: string, date?: Date): Promise<MarketDayIntelligence>;
/**
 * Check if a load should receive market day pricing premium.
 * This should be called before creating a load to apply the premium.
 *
 * @param destinationZoneId - The destination zone ID
 * @param pickupDate - The scheduled pickup date
 * @returns boolean indicating if market day premium applies
 */
export declare function shouldApplyMarketDayPremium(destinationZoneId: string, pickupDate: Date): Promise<boolean>;
/**
 * Calculate market day price premium for a load.
 *
 * @param basePriceCents - The base price in ETB cents
 * @param destinationZoneId - The destination zone ID
 * @param pickupDate - The scheduled pickup date
 * @returns The price premium in cents (0 if no premium applies)
 */
export declare function calculateMarketDayPremium(basePriceCents: number, destinationZoneId: string, pickupDate: Date): Promise<number>;
/**
 * Format driver notification message for market day.
 *
 * @param zoneName - The zone name
 * @param marketName - The market name
 * @param intelligence - Market day intelligence
 * @returns Formatted notification message
 */
export declare function formatMarketDayNotification(zoneName: string, marketName: string | null, intelligence: MarketDayIntelligence): string;
//# sourceMappingURL=market-day.d.ts.map