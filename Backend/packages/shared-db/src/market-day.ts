import 'dotenv/config';
import { prisma, getConfig } from './index';

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
export async function getMarketDayIntelligence(
  zoneId: string,
  date: Date = new Date()
): Promise<MarketDayIntelligence> {
  try {
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const todayDayOfWeek = date.getDay();
    
    // Calculate tomorrow's day of week
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.getDay();
    
    // Get config for demand boost percentage
    const config = await getConfig();
    const defaultBoostPct = config.marketDayDemandBoostPct || 8;
    
    // Query market days for this zone
    const marketDays = await (prisma as any).marketDay.findMany({
      where: {
        zoneId: zoneId,
        isActive: true
      }
    });
    
    // Check if today is a market day
    const todayMarketDay = marketDays.find((md: any) => md.dayOfWeek === todayDayOfWeek);
    const isMarketDay = !!todayMarketDay;
    
    // Check if tomorrow is a market day
    const tomorrowMarketDay = marketDays.find((md: any) => md.dayOfWeek === tomorrowDayOfWeek);
    const isMarketDayTomorrow = !!tomorrowMarketDay;
    
    // Find next market day
    let nextMarketDay: Date | null = null;
    let daysUntilNext = 7;
    
    for (let i = 1; i <= 7; i++) {
      const checkDay = (todayDayOfWeek + i) % 7;
      const found = marketDays.find((md: any) => md.dayOfWeek === checkDay);
      if (found) {
        daysUntilNext = i;
        nextMarketDay = new Date(date);
        nextMarketDay.setDate(nextMarketDay.getDate() + i);
        break;
      }
    }
    
    // Use the market day's specific boost if available, otherwise use config default
    const demandBoostPct = todayMarketDay?.demandBoostPct || 
                          (isMarketDayTomorrow ? (tomorrowMarketDay?.demandBoostPct || defaultBoostPct) : 0);
    
    const peakLoadingHour = todayMarketDay?.peakLoadingHour || 
                           tomorrowMarketDay?.peakLoadingHour || 6;
    
    const marketName = todayMarketDay?.marketName || 
                      tomorrowMarketDay?.marketName || 
                      null;
    
    return {
      isMarketDay,
      isMarketDayTomorrow,
      nextMarketDay,
      demandBoostPct,
      peakLoadingHour,
      marketName
    };
    
  } catch (error) {
    // Return safe defaults if anything fails
    return {
      isMarketDay: false,
      isMarketDayTomorrow: false,
      nextMarketDay: null,
      demandBoostPct: 0,
      peakLoadingHour: 6,
      marketName: null
    };
  }
}

/**
 * Check if a load should receive market day pricing premium.
 * This should be called before creating a load to apply the premium.
 * 
 * @param destinationZoneId - The destination zone ID
 * @param pickupDate - The scheduled pickup date
 * @returns boolean indicating if market day premium applies
 */
export async function shouldApplyMarketDayPremium(
  destinationZoneId: string,
  pickupDate: Date
): Promise<boolean> {
  const intelligence = await getMarketDayIntelligence(destinationZoneId, pickupDate);
  
  // Apply premium if:
  // 1. Delivery/pickup is on market day, OR
  // 2. Pickup is day before market day (pre-market rush)
  return intelligence.isMarketDay || intelligence.isMarketDayTomorrow;
}

/**
 * Calculate market day price premium for a load.
 * 
 * @param basePriceCents - The base price in ETB cents
 * @param destinationZoneId - The destination zone ID
 * @param pickupDate - The scheduled pickup date
 * @returns The price premium in cents (0 if no premium applies)
 */
export async function calculateMarketDayPremium(
  basePriceCents: number,
  destinationZoneId: string,
  pickupDate: Date
): Promise<number> {
  const config = await getConfig();
  const intelligence = await getMarketDayIntelligence(destinationZoneId, pickupDate);
  
  // No premium if not near market day
  if (!intelligence.isMarketDay && !intelligence.isMarketDayTomorrow) {
    return 0;
  }
  
  // Use config premium percentage (default 7%)
  const premiumPct = config.marketDayPricePremiumPct || 7;
  
  // Calculate premium
  const premium = Math.round(basePriceCents * (premiumPct / 100));
  
  return premium;
}

/**
 * Format driver notification message for market day.
 * 
 * @param zoneName - The zone name
 * @param marketName - The market name
 * @param intelligence - Market day intelligence
 * @returns Formatted notification message
 */
export function formatMarketDayNotification(
  zoneName: string,
  marketName: string | null,
  intelligence: MarketDayIntelligence
): string {
  const marketDisplayName = marketName || zoneName;
  
  if (intelligence.isMarketDayTomorrow) {
    return `${marketDisplayName} market day is tomorrow — ${intelligence.demandBoostPct}% demand boost expected. High load probability for morning departures.`;
  }
  
  if (intelligence.isMarketDay) {
    return `Today is ${marketDisplayName} market day — ${intelligence.demandBoostPct}% demand boost active. Peak loading hour: ${intelligence.peakLoadingHour}:00.`;
  }
  
  if (intelligence.nextMarketDay) {
    const daysUntil = Math.ceil((intelligence.nextMarketDay.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `Next ${marketDisplayName} market day in ${daysUntil} days.`;
  }
  
  return `${zoneName} has no scheduled market days.`;
}
