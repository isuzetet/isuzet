"use strict";
/**
 * Phase 10: Cargo-Specific Features — Utility Functions
 * Time-critical cargo, livestock, cold chain, cargo-class pricing, seasonal adjustments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTimeCritical = isTimeCritical;
exports.requiresColdChain = requiresColdChain;
exports.isLivestock = isLivestock;
exports.getMaxDeliveryHours = getMaxDeliveryHours;
exports.getTimeCriticalAcceptanceWindow = getTimeCriticalAcceptanceWindow;
exports.calculateDeliveryDeadline = calculateDeliveryDeadline;
exports.isLivestockHeatRestrictionActive = isLivestockHeatRestrictionActive;
exports.getLivestockMaxTransitHours = getLivestockMaxTransitHours;
exports.getColdChainTempRange = getColdChainTempRange;
exports.isTemperatureInRange = isTemperatureInRange;
exports.getCargoClassMultiplier = getCargoClassMultiplier;
exports.isRainySeason = isRainySeason;
exports.getRainySeasonMultiplier = getRainySeasonMultiplier;
exports.applyCargoClassPricing = applyCargoClassPricing;
exports.applyRainySeasonPremium = applyRainySeasonPremium;
exports.buildTimeCriticalAlert = buildTimeCriticalAlert;
exports.buildRainySeasonWarning = buildRainySeasonWarning;
exports.getTimeCriticalDeliveryBonus = getTimeCriticalDeliveryBonus;
exports.getColdChainExcursionTolerance = getColdChainExcursionTolerance;
exports.calculateLivestockPayoutCents = calculateLivestockPayoutCents;
require("dotenv/config");
const config_1 = require("./config");
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
function isTimeCritical(cargoType) {
    return TIME_CRITICAL_CARGO_TYPES.includes(cargoType);
}
/**
 * Check if cargo type requires cold chain tracking
 */
function requiresColdChain(cargoType) {
    return COLD_CHAIN_CARGO_TYPES.includes(cargoType);
}
/**
 * Check if cargo type is livestock
 */
function isLivestock(cargoType) {
    return cargoType === CARGO_TYPES.LIVESTOCK;
}
/**
 * Get max delivery hours for time-critical cargo type
 */
async function getMaxDeliveryHours(cargoType) {
    const config = await (0, config_1.getConfig)();
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
async function getTimeCriticalAcceptanceWindow() {
    const config = await (0, config_1.getConfig)();
    return config.timeCriticalAcceptanceWindowMin;
}
/**
 * Calculate delivery deadline based on pickup time and cargo type
 */
async function calculateDeliveryDeadline(pickupTime, cargoType) {
    const maxHours = await getMaxDeliveryHours(cargoType);
    if (!maxHours)
        return null;
    const deadline = new Date(pickupTime);
    deadline.setHours(deadline.getHours() + maxHours);
    return deadline;
}
/**
 * Check if current time is within livestock heat restriction period
 * (11am-3pm, May-September)
 */
async function isLivestockHeatRestrictionActive(pickupDate) {
    const config = await (0, config_1.getConfig)();
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
async function getLivestockMaxTransitHours(species) {
    const config = await (0, config_1.getConfig)();
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
async function getColdChainTempRange(cargoType) {
    const config = await (0, config_1.getConfig)();
    const mapping = {
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
async function isTemperatureInRange(temperature, cargoType) {
    const range = await getColdChainTempRange(cargoType);
    if (!range)
        return true; // No range defined, assume valid
    return temperature >= range.min && temperature <= range.max;
}
/**
 * Get cargo class multiplier for pricing
 */
async function getCargoClassMultiplier(cargoType) {
    const config = await (0, config_1.getConfig)();
    return config.cargoClassMultipliers[cargoType] || 1.0;
}
/**
 * Check if current date is within rainy season
 */
function isRainySeason() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    // Assuming June-September (6-9)
    return currentMonth >= 6 && currentMonth <= 9;
}
/**
 * Get rainy season multiplier for corridor
 */
async function getRainySeasonMultiplier(corridorId) {
    const config = await (0, config_1.getConfig)();
    const multiplier = config.rainySeasonCorridorMultipliers.find(m => m.corridorId === corridorId);
    return multiplier?.riskPremiumMultiplier || 1.0;
}
/**
 * Calculate price with cargo class multiplier
 */
async function applyCargoClassPricing(basePrice, cargoType) {
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
async function applyRainySeasonPremium(price, corridorId) {
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
function buildTimeCriticalAlert() {
    return 'TIME-CRITICAL: Immediate matching required. 5-minute acceptance window.';
}
/**
 * Build rainy season warning message
 */
function buildRainySeasonWarning(corridorId) {
    return `Rainy season active — expect longer transit, road conditions elevated on corridor ${corridorId}`;
}
/**
 * Get time-critical delivery bonus amount
 */
async function getTimeCriticalDeliveryBonus() {
    const config = await (0, config_1.getConfig)();
    return config.timeCriticalDeliveryBonusCents;
}
/**
 * Get cold chain excursion tolerance in minutes
 */
async function getColdChainExcursionTolerance() {
    const config = await (0, config_1.getConfig)();
    return config.coldChainExcursionToleranceMin;
}
/**
 * Calculate livestock payout per head (in ETB cents)
 * Adjusts original payout based on actual livestock delivered alive
 * All values in cents (integers)
 */
function calculateLivestockPayoutCents(originalPayoutCents, headCount, deliveredAlive) {
    if (headCount === 0)
        return 0;
    const payoutPerHead = originalPayoutCents / headCount;
    return Math.round(payoutPerHead * deliveredAlive);
}
//# sourceMappingURL=cargo-utils.js.map