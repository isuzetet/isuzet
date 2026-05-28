/**
 * RUIT CBE - Trust Scoring Engine
 * Complete implementation of decay-weighted trust model
 */
import { prisma } from '@ruit/shared-db';
import { Decimal } from '@prisma/client/runtime/library';
import { EVENT_TYPES, ROLES } from '@ruit/shared-types';
import { invalidateCache } from '@ruit/shared-utils';

interface DecayConfig {
  dispute_lambda: number;
  incident_lambda: number;
  deviation_lambda: number;
  cancel_lambda: number;
  dispute_penalty: number;
  incident_penalty: number;
  deviation_penalty: number;
  cancel_penalty: number;
}

export interface TrustTierConfig {
  tier2_min_trips: number;
  tier3_min_trips: number;
  tier4_min_trips: number;
  tier5_min_trips: number;
}

// Driver weights per Final Edit 2
export const DriverWeights = {
  onTime: 0.28,
  dispute: 0.18,
  deviation: 0.20,
  cancel: 0.14,
  incident: 0.10,
  anomaly: 0.05,
  codDisc: 0.05
};

// Fleet Owner weights
export const FleetOwnerWeights = {
  onTime: 0.25,
  dispute: 0.20,
  deviation: 0.10,
  cancel: 0.20,
  payment: 0.20,
  incident: 0.05
};

// Default decay config
const DEFAULT_DECAY_CONFIG: DecayConfig = {
  dispute_lambda: 0.023,
  incident_lambda: 0.008,
  deviation_lambda: 0.003,
  cancel_lambda: 0.023,
  dispute_penalty: 15,
  incident_penalty: 10,
  deviation_penalty: 5,
  cancel_penalty: 8
};

const DEFAULT_TIER_CONFIG: TrustTierConfig = {
  tier2_min_trips: 3,
  tier3_min_trips: 10,
  tier4_min_trips: 25,
  tier5_min_trips: 100
};

/**
 * Calculate decay weighted score
 */
export function calculateDecayWeightedScore(
  events: Array<{ occurred_at: Date; severity_weight: number }>,
  lambda: number,
  penaltyPerEvent: number
): number {
  const now = Date.now();
  const totalPenalty = events.reduce((sum: number, e) => {
    const daysSince = (now - e.occurred_at.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-lambda * daysSince);
    return sum + (penaltyPerEvent * e.severity_weight * decayFactor);
  }, 0);
  return totalPenalty;
}

/**
 * Compute tier from score (simple version without trip minimums)
 */
export function computeTierFromScore(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  if (score >= 40) return 1;
  return 0;
}

/**
 * Emit trust-related event
 */
async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { ulid } = await import('ulid');
  const strategyId = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  }).then((s: { id: string } | null) => s?.id ?? 'str_default');
  await prisma.event.create({
    data: {
      id: `evt_${ulid()}`,
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategyId,
      corridorId: null,
      payload: params.payload as any,
      metadata: { source: 'TRUST_ENGINE', timestamp: new Date().toISOString() } as any
    }
  });
}

/**
 * Get decay config from strategy
 */
async function getDecayConfigFromStrategy(): Promise<DecayConfig> {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { thresholdSet: true }
  });
  if (!strategy?.thresholdSet) {
    return DEFAULT_DECAY_CONFIG;
  }
  const ts = strategy.thresholdSet as any;
  return {
    dispute_lambda: ts?.trust_decay?.dispute_lambda ?? DEFAULT_DECAY_CONFIG.dispute_lambda,
    incident_lambda: ts?.trust_decay?.incident_lambda ?? DEFAULT_DECAY_CONFIG.incident_lambda,
    deviation_lambda: ts?.trust_decay?.deviation_lambda ?? DEFAULT_DECAY_CONFIG.deviation_lambda,
    cancel_lambda: ts?.trust_decay?.cancel_lambda ?? DEFAULT_DECAY_CONFIG.cancel_lambda,
    dispute_penalty: ts?.trust_decay?.dispute_penalty ?? DEFAULT_DECAY_CONFIG.dispute_penalty,
    incident_penalty: ts?.trust_decay?.incident_penalty ?? DEFAULT_DECAY_CONFIG.incident_penalty,
    deviation_penalty: ts?.trust_decay?.deviation_penalty ?? DEFAULT_DECAY_CONFIG.deviation_penalty,
    cancel_penalty: ts?.trust_decay?.cancel_penalty ?? DEFAULT_DECAY_CONFIG.cancel_penalty
  };
}

/**
 * Get tier config from strategy
 */
async function getTierConfigFromStrategy(): Promise<TrustTierConfig> {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { thresholdSet: true }
  });
  if (!strategy?.thresholdSet) {
    return DEFAULT_TIER_CONFIG;
  }
  const ts = strategy.thresholdSet as any;
  return {
    tier2_min_trips: ts?.tier_trip_minimums?.tier2 ?? DEFAULT_TIER_CONFIG.tier2_min_trips,
    tier3_min_trips: ts?.tier_trip_minimums?.tier3 ?? DEFAULT_TIER_CONFIG.tier3_min_trips,
    tier4_min_trips: ts?.tier_trip_minimums?.tier4 ?? DEFAULT_TIER_CONFIG.tier4_min_trips,
    tier5_min_trips: ts?.tier_trip_minimums?.tier5 ?? DEFAULT_TIER_CONFIG.tier5_min_trips
  };
}

/**
 * Compute trust score
 */
export async function computeTrustScore(
  entityId: string,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<number> {
  const driver = entityType === 'DRIVER' ? await prisma.driver.findUnique({ where: { id: entityId } }) : null;
  const fleetOwner = entityType === 'FLEET_OWNER' ? await prisma.fleetOwner.findUnique({ where: { id: entityId } }) : null;

  if (!driver && !fleetOwner) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  const decayConfig = await getDecayConfigFromStrategy();
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const disputes = await prisma.event.findMany({
    where: {
      aggregateId: entityId,
      eventType: { contains: 'DISPUTE' },
      createdAt: { gte: since }
    },
    select: { createdAt: true }
  });

  const incidents = await prisma.event.findMany({
    where: {
      aggregateId: entityId,
      eventType: EVENT_TYPES.INCIDENT_OPENED,
      createdAt: { gte: since }
    },
    select: { createdAt: true }
  });

  const disputePenalty = calculateDecayWeightedScore(
    disputes.map((d: { createdAt: Date }) => ({ occurred_at: d.createdAt, severity_weight: 1 })),
    decayConfig.dispute_lambda,
    decayConfig.dispute_penalty
  );

  const incidentPenalty = calculateDecayWeightedScore(
    incidents.map((d: { createdAt: Date }) => ({ occurred_at: d.createdAt, severity_weight: 1 })),
    decayConfig.incident_lambda,
    decayConfig.incident_penalty
  );

  const disputeScore = Math.max(0, 100 - disputePenalty);
  const incidentScore = Math.max(0, 100 - incidentPenalty);

  let onTimeScore = 50;
  let deviationScore = 100;
  let cancelScore = 100;
  let anomalyScore = 100;
  let codDiscScore = 100;
  let paymentScore = 50;

  const entity = driver || fleetOwner;
  if (entity) {
    onTimeScore = Number((entity as any).onTimeRate) || 50;
    deviationScore = Math.max(0, 100 - (Number((entity as any).deviationRate) || 0) * 100);
    cancelScore = Math.max(0, 100 - (Number((entity as any).cancellationRate) || 0) * 100);
  }

  if (entityType === 'DRIVER' && driver) {
    anomalyScore = driver.anomalyFlagCount === 0 ? 100 : Math.max(0, 100 - driver.anomalyFlagCount * 20);
    const codDiscrepancies = await prisma.event.findMany({
      where: {
        aggregateId: entityId,
        eventType: 'COD_DISCREPANCY_CHECKPOINT',
        createdAt: { gte: since }
      },
      select: { createdAt: true }
    });
    const codPenalty = calculateDecayWeightedScore(
      codDiscrepancies.map((d: { createdAt: Date }) => ({ occurred_at: d.createdAt, severity_weight: 1 })),
      0.023,
      20
    );
    codDiscScore = Math.max(0, 100 - codPenalty);
  } else if (fleetOwner) {
    paymentScore = Number(fleetOwner.paymentReliabilityScore) || 50;
  }

  let finalScore: number;
  if (entityType === 'DRIVER') {
    const weights = DriverWeights;
    finalScore = weights.onTime * onTimeScore +
      weights.dispute * disputeScore +
      weights.deviation * deviationScore +
      weights.cancel * cancelScore +
      weights.incident * incidentScore +
      weights.anomaly * anomalyScore +
      weights.codDisc * codDiscScore;
  } else {
    const weights = FleetOwnerWeights;
    finalScore = weights.onTime * onTimeScore +
      weights.dispute * disputeScore +
      weights.deviation * deviationScore +
      weights.cancel * cancelScore +
      weights.payment * paymentScore +
      weights.incident * incidentScore;
  }

  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Compute tier with trip minimums
 */
export async function computeTierFromScoreWithConfig(
  score: number,
  tripsCompleted: number
): Promise<number> {
  const tierConfig = await getTierConfigFromStrategy();
  let baseTier = 0;
  if (score >= 90) baseTier = 5;
  else if (score >= 80) baseTier = 4;
  else if (score >= 70) baseTier = 3;
  else if (score >= 55) baseTier = 2;
  else if (score >= 40) baseTier = 1;

  if (tripsCompleted === 0) return Math.min(baseTier, 1);
  if (tripsCompleted < tierConfig.tier2_min_trips) return Math.min(baseTier, 1);
  if (tripsCompleted < tierConfig.tier3_min_trips) return Math.min(baseTier, 2);
  if (tripsCompleted < tierConfig.tier4_min_trips) return Math.min(baseTier, 3);
  if (tripsCompleted < tierConfig.tier5_min_trips) return Math.min(baseTier, 4);
  return baseTier;
}

/**
 * Promote trust tier with Tier 5 manual gate
 */
export async function promoteTrustTier(
  entityId: string,
  newScore: number,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<void> {
  const driver = entityType === 'DRIVER' ? await prisma.driver.findUnique({ where: { id: entityId } }) : null;
  const fleetOwner = entityType === 'FLEET_OWNER' ? await prisma.fleetOwner.findUnique({ where: { id: entityId } }) : null;
  const entity = driver || fleetOwner;
  if (!entity) return;

  const oldTier = entity.trustTier;
  const tripsCompleted = entity.totalTripsCompleted;
  const newTier = await computeTierFromScoreWithConfig(newScore, tripsCompleted);

  // Tier 5 manual gate
  if (newTier === 5) {
    await emitEvent({
      eventType: EVENT_TYPES.TIER5_ELIGIBILITY_REACHED,
      aggregateId: entityId,
      aggregateType: entityType,
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      payload: { entity_id: entityId, trustScore: newScore, current_tier: oldTier }
    });
    await fetch('http://localhost:3013/internal/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+251911111111',
        message: `Tier 5 eligibility: ${entityType} ${entityId} reached score ${newScore}`,
        template: null
      })
    }).catch(() => {});
    return;
  }

  if (newTier === oldTier) return;

  if (entityType === 'DRIVER') {
    await prisma.driver.update({ where: { id: entityId }, data: { trustTier: newTier } });
  } else {
    await prisma.fleetOwner.update({ where: { id: entityId }, data: { trustTier: newTier } });
  }

  await updateRegionAccess(entityId, newTier, entityType);
  await invalidateCache(`cache:trust:${entityType}:${entityId}`);
  await emitEvent({
    eventType: EVENT_TYPES.TRUST_SCORE_UPDATED,
    aggregateId: entityId,
    aggregateType: entityType,
    actorId: 'SYSTEM',
    actorRole: 'SYSTEM',
    payload: {
      old_score: Number(entity.trustScore),
      new_score: newScore,
      old_tier: oldTier,
      new_tier: newTier,
      reason: 'TRUST_BEHAVIORAL'
    }
  });
}

/**
 * Update region access per Amendment 2 E1
 */
export async function updateRegionAccess(
  fleetOwnerId: string,
  newTier: number,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<void> {
  if (entityType === 'DRIVER') return;

  // Get recent assignments with load corridor info
  const assignments = await prisma.assignment.findMany({
    where: { fleetOwnerId },
    select: {
      loadId: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Resolve corridorIds for loads referenced by assignments
  const counts: Record<string, number> = {};
  const loadIds = assignments.map((a: any) => a.loadId).filter(Boolean);
  if (loadIds.length > 0) {
    const loads = await prisma.load.findMany({ where: { id: { in: loadIds } }, select: { id: true, corridorId: true } });
    const loadToCorridor: Record<string, string | null> = {};
    loads.forEach((l: any) => { loadToCorridor[l.id] = l.corridorId ?? null; });
    assignments.forEach((a: any) => {
      const corridorId = loadToCorridor[a.loadId];
      if (corridorId) {
        counts[corridorId] = (counts[corridorId] || 0) + 1;
      }
    });
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let homeCorridor = sorted[0]?.[0] || null;

  if (!homeCorridor) {
    const firstCorridor = await prisma.corridor.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });
    if (!firstCorridor) return;
    await prisma.fleetOwner.update({
      where: { id: fleetOwnerId },
      data: { regionAccess: [firstCorridor.id] }
    });
    return;
  }

  let access: string[] = [homeCorridor];
  if (newTier >= 1) {
    const adjacent = await getAdjacentCorridors(homeCorridor, 1);
    access = [...access, ...adjacent];
  }
  if (newTier >= 2) {
    const adjacent = await getAdjacentCorridors(homeCorridor, 3);
    access = [...new Set([...access, ...adjacent])];
  }
  if (newTier >= 3) {
    const all = await prisma.corridor.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });
    access = all.map((c: { id: string }) => c.id);
  }

  await prisma.fleetOwner.update({
    where: { id: fleetOwnerId },
    data: { regionAccess: access }
  });
}

/**
 * Get adjacent corridors
 */
async function getAdjacentCorridors(corridorId: string, limit: number): Promise<string[]> {
  const source = await prisma.corridor.findUnique({
    where: { id: corridorId },
    select: { region: true }
  });
  if (!source) return [];
  const nearby = await prisma.corridor.findMany({
    where: { region: source.region, id: { not: corridorId }, status: 'ACTIVE' },
    select: { id: true },
    take: limit
  });
  return nearby.map((c: { id: string }) => c.id);
}

/**
 * Update KYC tier - updates User model since kycTier is on User
 */
export async function updateKycTier(entityId: string, entityType: string): Promise<void> {
  const docs = await prisma.kycDocument.findMany({
    where: { entityId, entityType, status: 'APPROVED' }
  });
  const hasIdDoc = docs.some((d: { docType: string }) => ['NATIONAL_ID', 'KEBELE_ID', 'PASSPORT'].includes(d.docType));
  const hasBusinessDoc = docs.some((d: { docType: string }) => ['TRADE_LICENSE', 'TIN_CERT', 'BUSINESS_LICENSE'].includes(d.docType));
  const hasDriverDoc = docs.some((d: { docType: string }) => ['DRIVER_LICENSE', 'DRIVER_DIPLOMA'].includes(d.docType));

  let newKycTier = 1;
  if (hasIdDoc) newKycTier = 2;
  if (hasIdDoc && (hasBusinessDoc || hasDriverDoc)) newKycTier = 3;

  // Get userId based on entity type and update User model where kycTier lives
  let userId: string | null = null;
  if (entityType === 'FLEET_OWNER' || entityType === ROLES.FLEET_OWNER) {
    const entity = await prisma.fleetOwner.findUnique({ where: { id: entityId } });
    userId = entity?.userId ?? null;
  } else if (entityType === 'DRIVER' || entityType === ROLES.DRIVER) {
    const entity = await prisma.driver.findUnique({ where: { id: entityId } });
    userId = entity?.userId ?? null;
  } else if (entityType === 'ORDERER' || entityType === ROLES.ORDERER) {
    const entity = await prisma.orderer.findUnique({ where: { id: entityId } });
    userId = entity?.userId ?? null;
  }

  if (userId) {
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser && newKycTier > currentUser.kycTier) {
      await prisma.user.update({ where: { id: userId }, data: { kycTier: newKycTier } });
    }
  }

  await emitEvent({
    eventType: EVENT_TYPES.KYC_APPROVED,
    aggregateId: entityId,
    aggregateType: entityType,
    actorId: 'SYSTEM',
    actorRole: 'SYSTEM',
    payload: { new_kyc_tier: newKycTier }
  });
}

/**
 * Get full trust breakdown for OPS
 */
export async function getFullTrustBreakdown(
  entityId: string,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<Record<string, unknown>> {
  const score = await computeTrustScore(entityId, entityType);
  const driver = entityType === 'DRIVER' ? await prisma.driver.findUnique({ where: { id: entityId } }) : null;
  const fleetOwner = entityType === 'FLEET_OWNER' ? await prisma.fleetOwner.findUnique({ where: { id: entityId } }) : null;
  const entity = driver || fleetOwner;

  if (!entity) {
    throw new Error('Entity not found');
  }

  // Get user to fetch kycTier
  const userId = entity.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const kycTier = user?.kycTier ?? 0;

  return {
    entity_id: entityId,
    entity_type: entityType,
    trustScore: score,
    trustTier: entity.trustTier,
    trips_completed: entity.totalTripsCompleted,
    kycTier: kycTier,
    createdAt: entity.createdAt.toISOString()
  };
}

/**
 * Get public trust info
 */
export async function getPublicTrustInfo(
  entityId: string,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<Record<string, unknown>> {
  const driver = entityType === 'DRIVER' ? await prisma.driver.findUnique({ where: { id: entityId } }) : null;
  const fleetOwner = entityType === 'FLEET_OWNER' ? await prisma.fleetOwner.findUnique({ where: { id: entityId } }) : null;
  const entity = driver || fleetOwner;

  if (!entity) {
    throw new Error('Entity not found');
  }

  return {
    trustScore: Number(entity.trustScore),
    trustTier: entity.trustTier,
    payoutSpeed: entityType === 'FLEET_OWNER' ? (fleetOwner?.payoutSpeed ?? 'T0') : 'T0'
  };
}

/**
 * Log a trust score change event
 */
export async function logTrustScoreEvent(
  driverId: string,
  previousScore: number,
  newScore: number,
  previousTier: number,
  newTier: number,
  reason: string,
  tripId?: string,
  incidentId?: string
): Promise<void> {
  const { ulid } = await import('ulid');

  await prisma.trustScoreEvent.create({
    data: {
      id: `tse_${ulid()}`,
      driverId,
      previousScore: new Decimal(previousScore.toFixed(2)),
      newScore: new Decimal(newScore.toFixed(2)),
      previousTier,
      newTier,
      reason,
      tripId: tripId || null,
      incidentId: incidentId || null,
      scoreDelta: new Decimal((newScore - previousScore).toFixed(2)),
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'TRUST_CALCULATION'
      } as any
    }
  });
}

/**
 * Check maximum tier allowed based on trip count
 */
export function getMaxTierForTripCount(totalTripsCompleted: number): number {
  if (totalTripsCompleted < 3) return 1;     // Can't go beyond Tier 1 without 3 trips
  if (totalTripsCompleted < 10) return 2;    // Tier 2 requires 3+ trips
  if (totalTripsCompleted < 25) return 3;    // Tier 3 requires 10+ trips
  if (totalTripsCompleted < 100) return 4;   // Tier 4 requires 25+ trips
  return 5;                                   // Tier 5 requires 100+ trips
}

/**
 * Create or update tier milestone record and trigger bonus
 */
export async function checkAndCreateTierMilestone(
  driverId: string,
  previousTier: number,
  newTier: number,
  totalTripsCompleted: number
): Promise<{ milestone: any | null; bonusAmountEtb: number }> {
  // Enforce maximum tier based on trip count
  const maxAllowedTier = getMaxTierForTripCount(totalTripsCompleted);
  const actualNewTier = Math.min(newTier, maxAllowedTier);

  if (actualNewTier <= previousTier) {
    return { milestone: null, bonusAmountEtb: 0 };
  }

  // Tier progressed - create milestone record
  const { ulid } = await import('ulid');
  const tierBonuses: Record<number, number> = {
    3: 500,    // Tier 3: 500 ETB bonus
    4: 1000,   // Tier 4: 1,000 ETB bonus
    5: 2000    // Tier 5: 2,000 ETB bonus + physical kit
  };

  const bonusAmount = tierBonuses[actualNewTier] || 0;
  const shouldSendKit = actualNewTier === 5;

  const milestone = await prisma.trustTierMilestone.create({
    data: {
      id: `ttm_${ulid()}`,
      driverId,
      tier: actualNewTier,
      bonusAmountEtb: bonusAmount,
      physicalKitSent: false, // OPS team will set to true after dispatch
      notificationSent: false,
      metadata: {
        previousTier,
        achievedAt: new Date().toISOString(),
        reason: 'TIER_PROGRESSION',
        shouldSendKit
      } as any
    }
  });

  // If bonus > 0, could trigger payout here
  // If shouldSendKit, could notify OPS here

  return { milestone, bonusAmountEtb: bonusAmount };
}

/**
 * Update trust score with automatic event logging and milestone detection
 */
export async function updateTrustScoreWithEvent(
  driverId: string,
  newScore: number,
  reason: string,
  tripId?: string,
  incidentId?: string
): Promise<{ scoreUpdated: boolean; milestoneCreated: boolean; bonus: number }> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      trustScore: true,
      trustTier: true,
      totalTripsCompleted: true
    }
  });

  if (!driver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  const previousScore = Number(driver.trustScore);
  const previousTier = driver.trustTier;

  // Calculate new tier based on new score
  // Assuming: Tier 0 (<40), Tier 1 (40-60), Tier 2 (60-75), Tier 3 (75-85), Tier 4 (85-95), Tier 5 (95+)
  const getTierFromScore = (score: number): number => {
    if (score < 40) return 0;
    if (score < 60) return 1;
    if (score < 75) return 2;
    if (score < 85) return 3;
    if (score < 95) return 4;
    return 5;
  };

  let calculatedTier = getTierFromScore(newScore);
  const maxTierForTrips = getMaxTierForTripCount(driver.totalTripsCompleted);
  const actualNewTier = Math.min(calculatedTier, maxTierForTrips);

  // Update driver with new score and tier
  await prisma.driver.update({
    where: { id: driverId },
    data: {
      trustScore: new Decimal(Math.min(newScore, 100).toFixed(2)),
      trustTier: actualNewTier
    }
  });

  // Log the event
  await logTrustScoreEvent(driverId, previousScore, newScore, previousTier, actualNewTier, reason, tripId, incidentId);

  // Check for tier milestone
  let milestoneCreated = false;
  let bonusAmount = 0;

  if (actualNewTier > previousTier) {
    const milestoneResult = await checkAndCreateTierMilestone(driverId, previousTier, actualNewTier, driver.totalTripsCompleted);
    milestoneCreated = milestoneResult.milestone !== null;
    bonusAmount = milestoneResult.bonusAmountEtb;
  }

  return {
    scoreUpdated: newScore !== previousScore,
    milestoneCreated,
    bonus: bonusAmount
  };
}

