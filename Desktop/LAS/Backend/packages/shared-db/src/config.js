"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.invalidateConfigCache = invalidateConfigCache;
exports.getConfig = getConfig;
require("dotenv/config");
const index_1 = require("./index");
exports.DEFAULT_CONFIG = {
    wdmWeights: {
        proximity: 0.11,
        trust: 0.16,
        onTimeRate: 0.18,
        availability: 0.15,
        routeFamiliarity: 0.22,
        loadPreference: 0.08,
        zoneMatch: 0.07,
        corridorFamiliarity: 0.03,
    },
    proximityTiers: [
        { maxKm: 2, score: 1.0 },
        { maxKm: 5, score: 0.8 },
        { maxKm: 10, score: 0.6 },
        { maxKm: 20, score: 0.4 },
        { maxKm: 50, score: 0.2 },
    ],
    bonusOnTimeCents: 100000,
    bonusCheckpointCents: 50000,
    bonusFuelReportCents: 50000,
    bonusBackhaulCents: 200000,
    bonusPerfectWeekCents: 500000,
    bonusRoadAlertCents: 20000,
    bonusReferralDriverCents: 50000,
    bonusReferralFleetCents: 150000,
    bonusMentorPerTripCents: 30000,
    commissionDefaultPct: 10,
    commissionFloorCents: 0,
    commissionCeilingCents: 3000000,
    commissionTiers: [
        { maxValueCents: 500000, pct: 12 },
        { maxValueCents: 3000000, pct: 10 },
        { maxValueCents: 10000000, pct: 8 },
        { maxValueCents: 999999999, pct: 6 },
    ],
    acceptanceWindowStandardMin: 20,
    acceptanceWindowFastTrackMin: 10,
    directBookingAcceptanceWindowMin: 20,
    routeContractPreferredOfferLeadHours: 48,
    routeContractRenewalReminderDays: 14,
    backhaulWindowIntercityMin: 45,
    backhaulWindowIntracityMin: 20,
    backhaulWindowHomeZoneMin: 60,
    noShowGracePeriodMin: 30,
    disputeWindowHours: 72,
    escrowAutoReleaseHours: 24,
    coldStartGuaranteeHours: 72,
    agentCashSettlementWindowMin: 120,
    overloadTolerancePct: 5,
    shadowBrokerGpsKm: 25,
    shadowBrokerConfidenceThreshold: 0.85,
    deviationTriggerKm: 3,
    deviationEscalationKm: 20,
    idleAlertHours: 4,
    consolidationMinFillPct: 60,
    fuelSurgeDetectionPct: 10,
    hoursServiceWarning: 8,
    hoursServiceSoftBlock: 10,
    hoursServiceHardBlock: 14,
    escrowReleaseDelays: [
        { tier: 0, days: 7 },
        { tier: 1, days: 7 },
        { tier: 2, days: 3 },
        { tier: 3, days: 3 },
        { tier: 4, days: 1 },
        { tier: 5, days: 0 },
    ],
    cancellationCompensation: [
        { maxKm: 20, compensationCents: 50000 },
        { maxKm: 50, compensationCents: 100000 },
        { maxKm: 100, compensationCents: 200000 },
        { maxKm: 999999, compensationCents: 500000 },
    ],
    creditMaxAmountCents: 2000000,
    creditQualifyingTrips: 5,
    creditPaymentDueDays: 7,
    creditAgentDefaultHoldPayments: 3,
    creditAgentSuspendThresholdPct: 20,
    creditAgentBanThresholdPct: 40,
    coldStartFirstLoadPremiumPct: 10,
    coldStartSubsidisedLoadCount: 3,
    coldStartMentorBoostScore: 0.05,
    zeroHistoryRouteFamiliarityDefault: 0.7,
    zeroHistoryOnTimeRateDefault: 0.75,
    zeroHistoryStartingTrustScore: 55,
    zeroHistoryFullWdmTripThreshold: 10,
    rainySeasonStartMonth: 6,
    rainySeasonEndMonth: 9,
    rainySeasonCorridorMultipliers: [],
    multiStopPremiumPct: 6,
    multiStopZoneBonusScore: 0.05,
    homeZoneReturnBonus: 0.05,
    openQueueZoneIds: [],
    consolidationAgentCommissionMinCentsPerQuintal: 4000, // ETB 40 per quintal
    consolidationAgentCommissionMaxCentsPerQuintal: 8000, // ETB 80 per quintal
    consolidationPartialLoadCompensationPct: 15, // 15% driver compensation
    consolidationNoShowFeePct: 10, // 10% no-show fee
    consolidationAgentDecisionWindowMin: 45, // 45-minute decision window
    marketDayDemandBoostPct: 8, // 8% demand boost on market days
    marketDayPricePremiumPct: 7, // 7% price premium for market day loads
    // Phase 9: Supply-Side GTM Features
    roadAlertBonusCents: 20000, // ETB 200 bonus
    roadAlertMinVerificationsForBonus: 2, // 2 confirmations needed
    roadAlertExpiryHours: 6, // Alerts expire after 6 hours
    fuelReportCooldownHours: 4, // One report per station per 4 hours
    fuelReportValidationCount: 2, // Need 2 validations
    fuelReportValidationWindowHours: 3, // 3-hour validation window
    informalBrokerCommissionEstimatePct: 8, // 8% informal broker commission
    offPlatformTripVerifiedWeight: 0.6, // 60% weight for verified off-platform trips
    offPlatformTripUnverifiedWeight: 0.0, // 0% weight for unverified
    maintenanceReminderDays: 7, // Remind 7 days before due
    warehouseQueueExpiryHours: 8, // Queue entries expire after 8 hours
    // Phase 10: Time-critical cargo
    timeCriticalAcceptanceWindowMin: 5,
    timeCriticalPricePremiumPct: 20,
    timeCriticalDeliveryBonusCents: 300000, // ETB 3,000
    khatMaxDeliveryHours: 6,
    freshFishMaxDeliveryHours: 8,
    cutFlowersMaxDeliveryHours: 6,
    // Phase 10: Livestock transport
    livestockHeatRestrictStart: 11, // 11am (hour in 24h format)
    livestockHeatRestrictEnd: 15, // 3pm (hour in 24h format)
    livestockHeatRestrictMonths: [5, 6, 7, 8, 9], // May - September
    livestockMaxTransitHours: {
        cattle: 12,
        sheep: 8,
        poultry: 6,
    },
    // Phase 10: Cold chain
    coldChainTempRanges: {
        frozen_meat: { min: -100, max: -18 },
        fresh_produce: { min: 2, max: 8 },
        dairy: { min: 2, max: 6 },
        cut_flowers: { min: 4, max: 8 },
    },
    coldChainExcursionToleranceMin: 30,
    // Phase 10: Cargo-class pricing multipliers
    cargoClassMultipliers: {
        BAGGED_GRAIN: 1.00,
        FRESH_PRODUCE: 1.15,
        LIVESTOCK: 1.35,
        KHAT: 1.40,
        FRESH_FISH: 1.40,
        CUT_FLOWERS: 1.50,
        CEMENT: 1.10,
        HAZMAT: 1.40,
        BEVERAGES: 1.10,
        COFFEE: 1.10,
        COTTON_SESAME: 1.00,
        HONEY: 1.15,
    },
    // Phase 11: Financial System Expansion
    codCashCapCents: 3000000, // ETB 30,000
    codOtpThresholdCents: 50000, // ETB 500
    brokerCommissionRatePct: 4,
    brokerCommissionFloorCents: 150000, // ETB 1,500
    brokerCommissionCeilingCents: 3000000, // ETB 30,000
    insurancePlatformRevenuePct: 12,
    insuranceDefaultPremiumCents: 30000, // ETB 300
    insuranceMaxCoverageValueCents: 5000000, // ETB 50,000
    insurancePremiumRatePct: 2,
    insuranceRevenueSharePct: 12,
    monthlyMicroCreditAbsorptionCapCents: 5000000, // ETB 50,000
    // Phase 12: Operational Protocols
    noShowDriverWindowMin: 30, // 30 min grace period before driver no-show flag
    noShowOrdererWindowMin: 60, // 60 min grace period for orderer
    noShowDriverFeeCents: 50000, // ETB 500 fee to driver
    noShowOrdererFeeCents: 100000, // ETB 1,000 fee to orderer
    noShowRecipientFeeCents: 30000, // ETB 300 fee for recipient absent
    recipientAbsentGracePeriodMin: 20, // 20 min grace before auto-release
    deliveryPhotoGpsRadiusM: 500, // 500m GPS validation radius
    autoReleaseEscrowHours: 24, // 24h auto-release (already in config, kept for consistency)
    checkpointNormalDelayMin: 30, // 30 min normal delay threshold
    checkpointEscalationThresholdMin: 120, // 120 min escalation threshold (2 hours)
    hosAdvisoryHours: 8, // 8h advisory notification
    hosBlockHours: 14, // 14h hard block
    // Phase 13: Cooperative + Community Agent Workflow
    cooperativeDispatcherOfferWindowMin: 15,
    agentMaxClients: 50,
    agentCashSettlementCycleDays: 7,
    trustTier0MinScore: 40,
    // Phase 14: USSD Interface
    ussdSharedSecret: '',
    smsIncomingSharedSecret: '',
    // Phase 15: Worker Recalibration
    shadowBrokerMinLoadsForDetection: 5,
    shadowBrokerFlagCooldownDays: 14,
    shadowBrokerSuspicionThreshold: 0.85,
    microCreditGracePeriodDays: 3,
    referralBonusCents: 50000, // ETB 500
    newDriverGuaranteeBonusCents: 20000, // ETB 200 per load for first 3 trips
    duplicateSimHoldHours: 48,
    notificationMaxPerHour: 10,
};
let cachedConfig = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;
function invalidateConfigCache() {
    cachedConfig = null;
    cacheExpiresAt = 0;
}
async function getConfig() {
    const now = Date.now();
    if (cachedConfig && now < cacheExpiresAt)
        return cachedConfig;
    try {
        // StrategyConfig model added in Phase 2 - using type assertion for now
        const record = await index_1.prisma.strategyConfig.findFirst({
            where: { isActive: true },
            orderBy: { activatedAt: 'desc' },
        });
        if (!record) {
            return {
                id: 'default',
                versionName: 'default',
                ...exports.DEFAULT_CONFIG,
            };
        }
        const merged = {
            id: record.id,
            versionName: record.versionName,
            ...exports.DEFAULT_CONFIG,
            ...record.configJson,
        };
        cachedConfig = merged;
        cacheExpiresAt = now + CACHE_TTL_MS;
        return merged;
    }
    catch {
        return {
            id: 'default',
            versionName: 'default',
            ...exports.DEFAULT_CONFIG,
        };
    }
}
//# sourceMappingURL=config.js.map