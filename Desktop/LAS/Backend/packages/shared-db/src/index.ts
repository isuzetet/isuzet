import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
export { prisma as db };

export function generateId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}

// Payment rails registration
export { registerPaymentRails } from './rails/index.js';

// Strategy configuration - all tuneable parameters come from here
export {
  DEFAULT_CONFIG,
  invalidateConfigCache,
  getConfig,
  type StrategyConfig,
  type WdmWeights,
  type ProximityTier,
  type CommissionTier,
  type EscrowReleaseDelay,
  type CancellationBracket,
  type SeasonalCorridorMultiplier,
} from './config.js';

// Market day intelligence for zone demand prediction and pricing
export {
  getMarketDayIntelligence,
  shouldApplyMarketDayPremium,
  calculateMarketDayPremium,
  formatMarketDayNotification,
  type MarketDayIntelligence,
} from './market-day.js';

// Phase 10: Cargo-specific utilities
export {
  isTimeCritical,
  requiresColdChain,
  isLivestock,
  getMaxDeliveryHours,
  getTimeCriticalAcceptanceWindow,
  calculateDeliveryDeadline,
  isLivestockHeatRestrictionActive,
  getLivestockMaxTransitHours,
  getColdChainTempRange,
  isTemperatureInRange,
  getCargoClassMultiplier,
  isRainySeason,
  getRainySeasonMultiplier,
  applyCargoClassPricing,
  applyRainySeasonPremium,
  buildTimeCriticalAlert,
  buildRainySeasonWarning,
  getTimeCriticalDeliveryBonus,
  getColdChainExcursionTolerance,
  calculateLivestockPayoutCents,
} from './cargo-utils.js';
