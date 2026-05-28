import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library.js").DefaultArgs>;
export default prisma;
export { prisma as db };
export declare function generateId(prefix: string): string;
export { registerPaymentRails } from './rails/index.js';
export { DEFAULT_CONFIG, invalidateConfigCache, getConfig, type StrategyConfig, type WdmWeights, type ProximityTier, type CommissionTier, type EscrowReleaseDelay, type CancellationBracket, type SeasonalCorridorMultiplier, } from './config.js';
export { getMarketDayIntelligence, shouldApplyMarketDayPremium, calculateMarketDayPremium, formatMarketDayNotification, type MarketDayIntelligence, } from './market-day.js';
export { isTimeCritical, requiresColdChain, isLivestock, getMaxDeliveryHours, getTimeCriticalAcceptanceWindow, calculateDeliveryDeadline, isLivestockHeatRestrictionActive, getLivestockMaxTransitHours, getColdChainTempRange, isTemperatureInRange, getCargoClassMultiplier, isRainySeason, getRainySeasonMultiplier, applyCargoClassPricing, applyRainySeasonPremium, buildTimeCriticalAlert, buildRainySeasonWarning, getTimeCriticalDeliveryBonus, getColdChainExcursionTolerance, calculateLivestockPayoutCents, } from './cargo-utils.js';
//# sourceMappingURL=index.d.ts.map