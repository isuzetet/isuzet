import { prisma } from '@ruit/shared-db';

export async function seedDefaultStrategy() {
  // Check if active strategy already exists
  const existing = await prisma.strategyVersion.findFirst({ where: { isActive: true } });
  if (existing) {
    console.log('Active strategy version already exists. Updating with correct values...');
    
    await prisma.strategyVersion.update({
      where: { id: existing.id },
      data: {
        // CORRECTED WDM weights (blueprint spec)
        wdmRouteFamiliarityWeight: 0.22,
        wdmOnTimeRateWeight: 0.18,
        wdmTrustScoreWeight: 0.16,
        wdmAvailabilityWeight: 0.15,
        wdmProximityWeight: 0.11,
        wdmLoadPreferenceWeight: 0.08,
        wdmZoneMatchWeight: 0.07,
        wdmCorridorFamiliarityWeight: 0.03,
        
        // CORRECTED pricing params
        floorPricePerKmPerQuintal: 0.50,   // 0.50 ETB (NOT 90)
        ceilingPricePerKmPerQuintal: 5.00,
        
        // Deviation thresholds
        urbanDeviationThresholdKm: 6.0,
        intercityDeviationThresholdKm: 3.0,
        
        // Payout SLA
        payoutSlaMinutes: 30,
        
        // Partial escrow
        partialEscrowReleasePct: 30,
        partialEscrowTriggerHours: 24,
        
        // Home zone bonuses
        homeZoneReturnUrgencyBonus: 0.20,
        homeZoneReturnScoreBonus: 0.05,
        
        // Demand multipliers
        maxDemandMultiplier: 1.50,
        minDemandMultiplier: 0.80,
        demandSurchargeRate: 0.15,
        supplyDiscountRate: 0.10,
        
        // Cargo class multipliers
        cargoClassMultipliers: {
          "GENERAL": 1.00,
          "GRAIN": 1.00,
          "COTTON": 1.00,
          "SESAME": 1.00,
          "COFFEE": 1.10,
          "CEMENT": 1.10,
          "BEVERAGES": 1.10,
          "FRESH_PRODUCE": 1.15,
          "HONEY": 1.15,
          "LIVESTOCK": 1.35,
          "KHAT": 1.40,
          "FRESH_FISH": 1.40,
          "HAZMAT": 1.40,
          "CUT_FLOWERS": 1.50,
        },
        
        // Acceptance windows
        acceptanceWindowMinutes: 20,
      }
    });
    
    console.log('Strategy version updated with correct blueprint values.');
    return;
  }

  // Create new default strategy
  await prisma.strategyVersion.create({
    data: {
      id: 'default-v1',
      versionName: 'Blueprint-V1',
      optimizationMode: 'BALANCED',
      scope: 'GLOBAL',
      isActive: true,
      activatedAt: new Date(),
      
      weightSet: {
        routeFamiliarity: 0.22,
        onTimeRate: 0.18,
        trustScore: 0.16,
        availability: 0.15,
        proximity: 0.11,
        loadPreference: 0.08,
        zoneMatch: 0.07,
        corridorFamiliarity: 0.03,
      },
      
      thresholdSet: {
        urbanDeviationKm: 6.0,
        intercityDeviationKm: 3.0,
        gpsSilencePenaltyGraceMinutes: 30,
        acceptanceWindowMinutes: 20,
        fastTrackWindowMinutes: 5,
        hosAdvisoryHours: 8,
        hosSoftBlockHours: 10,
        hosStrongAdvisoryHours: 12,
        hosHardBlockHours: 14,
      },
      
      pricingParams: {
        floorRatePerKmPerQuintal: 0.50,
        ceilingRatePerKmPerQuintal: 5.00,
        minCommissionEtb: 1500,
        maxCommissionEtb: 30000,
        commissionTiers: [
          { upTo: 5000, rate: 0.12 },
          { upTo: 30000, rate: 0.10 },
          { upTo: 100000, rate: 0.08 },
          { above: 100000, rate: 0.06 },
        ],
        timeCriticalPremium: 0.20,
        securityElevatedPremium: 0.10,
        securityRestrictedPremium: 0.25,
      },
      
      // All new fields
      wdmRouteFamiliarityWeight: 0.22,
      wdmOnTimeRateWeight: 0.18,
      wdmTrustScoreWeight: 0.16,
      wdmAvailabilityWeight: 0.15,
      wdmProximityWeight: 0.11,
      wdmLoadPreferenceWeight: 0.08,
      wdmZoneMatchWeight: 0.07,
      wdmCorridorFamiliarityWeight: 0.03,
      floorPricePerKmPerQuintal: 0.50,
      ceilingPricePerKmPerQuintal: 5.00,
      urbanDeviationThresholdKm: 6.0,
      intercityDeviationThresholdKm: 3.0,
      payoutSlaMinutes: 30,
      partialEscrowReleasePct: 30,
      partialEscrowTriggerHours: 24,
      homeZoneReturnUrgencyBonus: 0.20,
      homeZoneReturnScoreBonus: 0.05,
      maxDemandMultiplier: 1.50,
      minDemandMultiplier: 0.80,
      cargoClassMultipliers: {
        "GENERAL": 1.00, "GRAIN": 1.00, "COTTON": 1.00, "SESAME": 1.00,
        "COFFEE": 1.10, "CEMENT": 1.10, "BEVERAGES": 1.10, "FRESH_PRODUCE": 1.15,
        "HONEY": 1.15, "LIVESTOCK": 1.35, "KHAT": 1.40, "FRESH_FISH": 1.40,
        "HAZMAT": 1.40, "CUT_FLOWERS": 1.50,
      },
    }
  });

  console.log('Default strategy version created with blueprint-correct values.');
}
