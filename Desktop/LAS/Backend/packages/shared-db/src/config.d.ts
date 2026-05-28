import 'dotenv/config';
export interface WdmWeights {
    proximity: number;
    trust: number;
    onTimeRate: number;
    availability: number;
    routeFamiliarity: number;
    loadPreference: number;
    zoneMatch: number;
    corridorFamiliarity: number;
}
export interface ProximityTier {
    maxKm: number;
    score: number;
}
export interface CommissionTier {
    maxValueCents: number;
    pct: number;
}
export interface EscrowReleaseDelay {
    tier: number;
    days: number;
}
export interface CancellationBracket {
    maxKm: number;
    compensationCents: number;
}
export interface SeasonalCorridorMultiplier {
    corridorId: string;
    transitMultiplier: number;
    riskPremiumMultiplier: number;
}
export interface StrategyConfig {
    id: string;
    versionName: string;
    wdmWeights: WdmWeights;
    proximityTiers: ProximityTier[];
    bonusOnTimeCents: number;
    bonusCheckpointCents: number;
    bonusFuelReportCents: number;
    bonusBackhaulCents: number;
    bonusPerfectWeekCents: number;
    bonusRoadAlertCents: number;
    bonusReferralDriverCents: number;
    bonusReferralFleetCents: number;
    bonusMentorPerTripCents: number;
    commissionDefaultPct: number;
    commissionFloorCents: number;
    commissionCeilingCents: number;
    commissionTiers: CommissionTier[];
    acceptanceWindowStandardMin: number;
    acceptanceWindowFastTrackMin: number;
    directBookingAcceptanceWindowMin: number;
    routeContractPreferredOfferLeadHours: number;
    routeContractRenewalReminderDays: number;
    backhaulWindowIntercityMin: number;
    backhaulWindowIntracityMin: number;
    backhaulWindowHomeZoneMin: number;
    noShowGracePeriodMin: number;
    disputeWindowHours: number;
    escrowAutoReleaseHours: number;
    coldStartGuaranteeHours: number;
    agentCashSettlementWindowMin: number;
    overloadTolerancePct: number;
    shadowBrokerGpsKm: number;
    shadowBrokerConfidenceThreshold: number;
    deviationTriggerKm: number;
    deviationEscalationKm: number;
    idleAlertHours: number;
    consolidationMinFillPct: number;
    fuelSurgeDetectionPct: number;
    hoursServiceWarning: number;
    hoursServiceSoftBlock: number;
    hoursServiceHardBlock: number;
    escrowReleaseDelays: EscrowReleaseDelay[];
    cancellationCompensation: CancellationBracket[];
    creditMaxAmountCents: number;
    creditQualifyingTrips: number;
    creditPaymentDueDays: number;
    creditAgentDefaultHoldPayments: number;
    creditAgentSuspendThresholdPct: number;
    creditAgentBanThresholdPct: number;
    coldStartFirstLoadPremiumPct: number;
    coldStartSubsidisedLoadCount: number;
    coldStartMentorBoostScore: number;
    zeroHistoryRouteFamiliarityDefault: number;
    zeroHistoryOnTimeRateDefault: number;
    zeroHistoryStartingTrustScore: number;
    zeroHistoryFullWdmTripThreshold: number;
    rainySeasonStartMonth: number;
    rainySeasonEndMonth: number;
    rainySeasonCorridorMultipliers: SeasonalCorridorMultiplier[];
    multiStopPremiumPct: number;
    multiStopZoneBonusScore: number;
    consolidationAgentCommissionMinCentsPerQuintal: number;
    consolidationAgentCommissionMaxCentsPerQuintal: number;
    consolidationPartialLoadCompensationPct: number;
    consolidationNoShowFeePct: number;
    consolidationAgentDecisionWindowMin: number;
    homeZoneReturnBonus: number;
    openQueueZoneIds: string[];
    marketDayDemandBoostPct: number;
    marketDayPricePremiumPct: number;
    roadAlertBonusCents: number;
    roadAlertMinVerificationsForBonus: number;
    roadAlertExpiryHours: number;
    fuelReportCooldownHours: number;
    fuelReportValidationCount: number;
    fuelReportValidationWindowHours: number;
    informalBrokerCommissionEstimatePct: number;
    offPlatformTripVerifiedWeight: number;
    offPlatformTripUnverifiedWeight: number;
    maintenanceReminderDays: number;
    warehouseQueueExpiryHours: number;
    timeCriticalAcceptanceWindowMin: number;
    timeCriticalPricePremiumPct: number;
    timeCriticalDeliveryBonusCents: number;
    khatMaxDeliveryHours: number;
    freshFishMaxDeliveryHours: number;
    cutFlowersMaxDeliveryHours: number;
    livestockHeatRestrictStart: number;
    livestockHeatRestrictEnd: number;
    livestockHeatRestrictMonths: number[];
    livestockMaxTransitHours: {
        cattle: number;
        sheep: number;
        poultry: number;
    };
    coldChainTempRanges: Record<string, {
        min: number;
        max: number;
    }>;
    coldChainExcursionToleranceMin: number;
    cargoClassMultipliers: Record<string, number>;
    codCashCapCents: number;
    codOtpThresholdCents: number;
    brokerCommissionRatePct: number;
    brokerCommissionFloorCents: number;
    brokerCommissionCeilingCents: number;
    insurancePlatformRevenuePct: number;
    insuranceDefaultPremiumCents: number;
    insuranceMaxCoverageValueCents: number;
    insurancePremiumRatePct: number;
    insuranceRevenueSharePct: number;
    monthlyMicroCreditAbsorptionCapCents: number;
    noShowDriverWindowMin: number;
    noShowOrdererWindowMin: number;
    noShowDriverFeeCents: number;
    noShowOrdererFeeCents: number;
    noShowRecipientFeeCents: number;
    recipientAbsentGracePeriodMin: number;
    deliveryPhotoGpsRadiusM: number;
    autoReleaseEscrowHours: number;
    checkpointNormalDelayMin: number;
    checkpointEscalationThresholdMin: number;
    hosAdvisoryHours: number;
    hosBlockHours: number;
    cooperativeDispatcherOfferWindowMin: number;
    agentMaxClients: number;
    agentCashSettlementCycleDays: number;
    trustTier0MinScore: number;
    ussdSharedSecret: string;
    smsIncomingSharedSecret: string;
    shadowBrokerMinLoadsForDetection: number;
    shadowBrokerFlagCooldownDays: number;
    shadowBrokerSuspicionThreshold: number;
    microCreditGracePeriodDays: number;
    referralBonusCents: number;
    newDriverGuaranteeBonusCents: number;
    duplicateSimHoldHours: number;
    notificationMaxPerHour: number;
}
export declare const DEFAULT_CONFIG: Omit<StrategyConfig, 'id' | 'versionName'>;
export declare function invalidateConfigCache(): void;
export declare function getConfig(): Promise<StrategyConfig>;
//# sourceMappingURL=config.d.ts.map