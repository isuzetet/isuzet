"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLivestockPayoutCents = exports.getColdChainExcursionTolerance = exports.getTimeCriticalDeliveryBonus = exports.buildRainySeasonWarning = exports.buildTimeCriticalAlert = exports.applyRainySeasonPremium = exports.applyCargoClassPricing = exports.getRainySeasonMultiplier = exports.isRainySeason = exports.getCargoClassMultiplier = exports.isTemperatureInRange = exports.getColdChainTempRange = exports.getLivestockMaxTransitHours = exports.isLivestockHeatRestrictionActive = exports.calculateDeliveryDeadline = exports.getTimeCriticalAcceptanceWindow = exports.getMaxDeliveryHours = exports.isLivestock = exports.requiresColdChain = exports.isTimeCritical = exports.formatMarketDayNotification = exports.calculateMarketDayPremium = exports.shouldApplyMarketDayPremium = exports.getMarketDayIntelligence = exports.getConfig = exports.invalidateConfigCache = exports.DEFAULT_CONFIG = exports.registerPaymentRails = exports.db = exports.prisma = void 0;
exports.generateId = generateId;
const client_1 = require("@prisma/client");
const ulid_1 = require("ulid");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ?? new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
exports.db = exports.prisma;
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
exports.default = exports.prisma;
function generateId(prefix) {
    return `${prefix}_${(0, ulid_1.ulid)()}`;
}
// Payment rails registration
var index_js_1 = require("./rails/index.js");
Object.defineProperty(exports, "registerPaymentRails", { enumerable: true, get: function () { return index_js_1.registerPaymentRails; } });
// Strategy configuration - all tuneable parameters come from here
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "invalidateConfigCache", { enumerable: true, get: function () { return config_js_1.invalidateConfigCache; } });
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return config_js_1.getConfig; } });
// Market day intelligence for zone demand prediction and pricing
var market_day_js_1 = require("./market-day.js");
Object.defineProperty(exports, "getMarketDayIntelligence", { enumerable: true, get: function () { return market_day_js_1.getMarketDayIntelligence; } });
Object.defineProperty(exports, "shouldApplyMarketDayPremium", { enumerable: true, get: function () { return market_day_js_1.shouldApplyMarketDayPremium; } });
Object.defineProperty(exports, "calculateMarketDayPremium", { enumerable: true, get: function () { return market_day_js_1.calculateMarketDayPremium; } });
Object.defineProperty(exports, "formatMarketDayNotification", { enumerable: true, get: function () { return market_day_js_1.formatMarketDayNotification; } });
// Phase 10: Cargo-specific utilities
var cargo_utils_js_1 = require("./cargo-utils.js");
Object.defineProperty(exports, "isTimeCritical", { enumerable: true, get: function () { return cargo_utils_js_1.isTimeCritical; } });
Object.defineProperty(exports, "requiresColdChain", { enumerable: true, get: function () { return cargo_utils_js_1.requiresColdChain; } });
Object.defineProperty(exports, "isLivestock", { enumerable: true, get: function () { return cargo_utils_js_1.isLivestock; } });
Object.defineProperty(exports, "getMaxDeliveryHours", { enumerable: true, get: function () { return cargo_utils_js_1.getMaxDeliveryHours; } });
Object.defineProperty(exports, "getTimeCriticalAcceptanceWindow", { enumerable: true, get: function () { return cargo_utils_js_1.getTimeCriticalAcceptanceWindow; } });
Object.defineProperty(exports, "calculateDeliveryDeadline", { enumerable: true, get: function () { return cargo_utils_js_1.calculateDeliveryDeadline; } });
Object.defineProperty(exports, "isLivestockHeatRestrictionActive", { enumerable: true, get: function () { return cargo_utils_js_1.isLivestockHeatRestrictionActive; } });
Object.defineProperty(exports, "getLivestockMaxTransitHours", { enumerable: true, get: function () { return cargo_utils_js_1.getLivestockMaxTransitHours; } });
Object.defineProperty(exports, "getColdChainTempRange", { enumerable: true, get: function () { return cargo_utils_js_1.getColdChainTempRange; } });
Object.defineProperty(exports, "isTemperatureInRange", { enumerable: true, get: function () { return cargo_utils_js_1.isTemperatureInRange; } });
Object.defineProperty(exports, "getCargoClassMultiplier", { enumerable: true, get: function () { return cargo_utils_js_1.getCargoClassMultiplier; } });
Object.defineProperty(exports, "isRainySeason", { enumerable: true, get: function () { return cargo_utils_js_1.isRainySeason; } });
Object.defineProperty(exports, "getRainySeasonMultiplier", { enumerable: true, get: function () { return cargo_utils_js_1.getRainySeasonMultiplier; } });
Object.defineProperty(exports, "applyCargoClassPricing", { enumerable: true, get: function () { return cargo_utils_js_1.applyCargoClassPricing; } });
Object.defineProperty(exports, "applyRainySeasonPremium", { enumerable: true, get: function () { return cargo_utils_js_1.applyRainySeasonPremium; } });
Object.defineProperty(exports, "buildTimeCriticalAlert", { enumerable: true, get: function () { return cargo_utils_js_1.buildTimeCriticalAlert; } });
Object.defineProperty(exports, "buildRainySeasonWarning", { enumerable: true, get: function () { return cargo_utils_js_1.buildRainySeasonWarning; } });
Object.defineProperty(exports, "getTimeCriticalDeliveryBonus", { enumerable: true, get: function () { return cargo_utils_js_1.getTimeCriticalDeliveryBonus; } });
Object.defineProperty(exports, "getColdChainExcursionTolerance", { enumerable: true, get: function () { return cargo_utils_js_1.getColdChainExcursionTolerance; } });
Object.defineProperty(exports, "calculateLivestockPayoutCents", { enumerable: true, get: function () { return cargo_utils_js_1.calculateLivestockPayoutCents; } });
//# sourceMappingURL=index.js.map