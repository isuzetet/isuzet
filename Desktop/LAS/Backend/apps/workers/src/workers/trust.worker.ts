import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';
import { invalidateCache } from '@ruit/shared-utils';
import { EVENT_TYPES } from '@ruit/shared-types';

interface TrustScoreUpdateJob {
  entityId: string;
  entityType: 'DRIVER' | 'FLEET_OWNER';
  triggerEvent: string;
  eventPayload: Record<string, unknown>;
}

// Driver weights per Final Edit 2
const DriverWeights = {
  onTime: 0.28,
  dispute: 0.18,
  deviation: 0.20,
  cancel: 0.14,
  incident: 0.10,
  anomaly: 0.05,
  codDisc: 0.05,
};

const FleetOwnerWeights = {
  onTime: 0.25,
  dispute: 0.20,
  deviation: 0.10,
  cancel: 0.20,
  payment: 0.20,
  incident: 0.05,
};

function calculateDecayWeightedScore(
  events: Array<{ occurredAt: Date; severityWeight: number }>,
  lambda: number,
  penaltyPerEvent: number
): number {
  const now = Date.now();
  const totalPenalty = events.reduce((sum, e) => {
    const daysSince = (now - e.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-lambda * daysSince);
    return sum + penaltyPerEvent * e.severityWeight * decayFactor;
  }, 0);
  return totalPenalty;
}

async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}) {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategy?.id ?? 'str_default',
      corridorId: null,
      payload: params.payload as any,
      metadata: { source: 'TRUST_WORKER', timestamp: new Date().toISOString() } as any,
    },
  });
}

async function computeTrustScore(
  entityId: string,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<number> {
  const driver = entityType === 'DRIVER'
    ? await prisma.driver.findUnique({ where: { id: entityId } })
    : null;
  const fleetOwner = entityType === 'FLEET_OWNER'
    ? await prisma.fleetOwner.findUnique({ where: { id: entityId } })
    : null;

  if (!driver && !fleetOwner) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  // Get active strategy for decay params
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { thresholdSet: true },
  });

  const thresholdSet = (strategy?.thresholdSet as any) || {};
  const trustDecay = thresholdSet.trustDecay || 0.05;

  const since = new Date();
  since.setDate(since.getDate() - 90);

  // Get recent events
  const disputes = await prisma.event.findMany({
    where: {
      aggregateId: entityId,
      eventType: { contains: 'DISPUTE' },
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  const incidents = await prisma.event.findMany({
    where: {
      aggregateId: entityId,
      eventType: EVENT_TYPES.INCIDENT_OPENED,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  // Calculate penalties with decay
  const disputePenalty = calculateDecayWeightedScore(
    disputes.map((d: { createdAt: Date }) => ({ occurredAt: d.createdAt, severityWeight: 1 })),
    trustDecay,
    15
  );
  const incidentPenalty = calculateDecayWeightedScore(
    incidents.map((d: { createdAt: Date }) => ({ occurredAt: d.createdAt, severityWeight: 1 })),
    trustDecay * 0.5,
    10
  );

  const disputeScore = Math.max(0, 100 - disputePenalty);
  const incidentScore = Math.max(0, 100 - incidentPenalty);

  // Get entity stats from Prisma results - cast to access fields
  let onTimeScore = 50;
  let deviationScore = 100;
  let cancelScore = 100;

  if (driver) {
    onTimeScore = driver.onTimeRate ? Number(driver.onTimeRate) * 100 : 50;
    deviationScore = 100 - (driver.deviationRate ? Number(driver.deviationRate) * 100 : 0);
    cancelScore = 100 - (driver.cancellationRate ? Number(driver.cancellationRate) * 100 : 0);
  } else if (fleetOwner) {
    // Fleet owner uses payment reliability
    onTimeScore = fleetOwner.paymentReliabilityScore ? Number(fleetOwner.paymentReliabilityScore) : 50;
    deviationScore = 100;
    cancelScore = 100;
  }

  // Calculate final score
  let finalScore: number;
  if (entityType === 'DRIVER' && driver) {
    const anomalyScore = driver.anomalyFlagCount === 0
      ? 100
      : Math.max(0, 100 - driver.anomalyFlagCount * 20);

    finalScore = (
      DriverWeights.onTime * onTimeScore +
      DriverWeights.dispute * disputeScore +
      DriverWeights.deviation * deviationScore +
      DriverWeights.cancel * cancelScore +
      DriverWeights.incident * incidentScore +
      DriverWeights.anomaly * anomalyScore +
      DriverWeights.codDisc * 100 // Placeholder for COD score
    );
  } else if (fleetOwner) {
    const paymentScore = Number(fleetOwner.paymentReliabilityScore) || 50;
    finalScore = (
      FleetOwnerWeights.onTime * onTimeScore +
      FleetOwnerWeights.dispute * disputeScore +
      FleetOwnerWeights.deviation * deviationScore +
      FleetOwnerWeights.cancel * cancelScore +
      FleetOwnerWeights.payment * paymentScore +
      FleetOwnerWeights.incident * incidentScore
    );
  } else {
    finalScore = 50;
  }

  return Math.max(0, Math.min(100, finalScore));
}

async function checkTierAdvancement(
  entityId: string,
  entityType: 'DRIVER' | 'FLEET_OWNER',
  trustScore: number,
  tripCount: number,
  userKycTier: number
): Promise<number> {
  let newTier = 0;

  if (trustScore >= 90) newTier = 5;
  else if (trustScore >= 80) newTier = 4;
  else if (trustScore >= 70) newTier = 3;
  else if (trustScore >= 55) newTier = 2;
  else if (trustScore >= 40) newTier = 1;

  if (newTier >= 5 && tripCount < 100) newTier = 4;
  if (newTier >= 4 && tripCount < 25) newTier = 3;
  if (newTier >= 3 && (tripCount < 10 || userKycTier < 3)) newTier = 2;
  if (newTier >= 2 && (tripCount < 3 || userKycTier < 2)) newTier = 1;

  return newTier;
}

export function createTrustWorker(): Worker {
  return new Worker<TrustScoreUpdateJob>(
    QUEUES.TRUST_SCORE_UPDATE,
    async (job: Job<TrustScoreUpdateJob>) => {
      const { entityId, entityType, triggerEvent, eventPayload } = job.data;

      // Get entity data with user relation
      let entity: any = null;
      let userKycTier = 0;

      if (entityType === 'DRIVER') {
        const driver = await prisma.driver.findUnique({
          where: { id: entityId },
          include: { user: true },
        });
        if (driver) {
          entity = driver;
          userKycTier = driver.user?.kycTier || 0;
        }
      } else {
        const fleetOwner = await prisma.fleetOwner.findUnique({
          where: { id: entityId },
          include: { user: true },
        });
        if (fleetOwner) {
          entity = fleetOwner;
          userKycTier = fleetOwner.user?.kycTier || 0;
        }
      }

      if (!entity) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      // Compute new trust score
      const trustScore = await computeTrustScore(entityId, entityType);

      const tripCount = entity.totalTripsCompleted;

      // Determine trust tier
      const newTier = await checkTierAdvancement(
        entityId,
        entityType,
        trustScore,
        tripCount,
        userKycTier
      );

      const oldTier = entity.trustTier;

      // Update entity trust score and tier
      if (entityType === 'DRIVER') {
        await prisma.driver.update({
          where: { id: entityId },
          data: { trustScore, trustTier: newTier },
        });
      } else {
        await prisma.fleetOwner.update({
          where: { id: entityId },
          data: { trustScore, trustTier: newTier },
        });
      }

      // Emit TRUST_SCORE_UPDATED event
      await emitEvent({
        eventType: EVENT_TYPES.TRUST_SCORE_UPDATED,
        aggregateId: entityId,
        aggregateType: entityType,
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        payload: {
          trigger_event: triggerEvent,
          trigger_payload: eventPayload,
          old_score: Number(entity.trustScore),
          new_score: trustScore,
          old_tier: oldTier,
          new_tier: newTier,
        },
      });

      // If tier 5 reached, emit eligibility event
      if (newTier === 5 && oldTier !== 5) {
        await emitEvent({
          eventType: 'TIER5_ELIGIBILITY_REACHED',
          aggregateId: entityId,
          aggregateType: entityType,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          payload: {
            entity_id: entityId,
            trust_score: trustScore,
            trips_completed: tripCount,
            note: 'Manual approval required for Tier 5',
          },
        });
      }

      // Phase 13: Owner-Operator Cross-Restriction Logic
      // If driver trust score drops below trustTier0MinScore, restrict linked fleet owner
      if (entityType === 'DRIVER') {
        const config = await getConfig();
        const trustTier0MinScore = config.trustTier0MinScore || 40;
        
        // Get driver with user and fleet owner relations
        const driver = await prisma.driver.findUnique({
          where: { id: entityId },
          include: {
            user: {
              include: { fleetOwner: true },
            },
          },
        });

        if (driver?.user?.fleetOwner) {
          const fleetOwnerId = driver.user.fleetOwner.id;
          const shouldRestrict = trustScore < trustTier0MinScore;
          const wasRestricted = driver.user.fleetOwner.isRestricted;

          // Update fleet owner restriction status if changed
          if (shouldRestrict !== wasRestricted) {
            await prisma.fleetOwner.update({
              where: { id: fleetOwnerId },
              data: { isRestricted: shouldRestrict },
            });

            // Emit restriction state change event
            const eventType = shouldRestrict
              ? 'OWNER_OPERATOR_CROSS_RESTRICTED'
              : 'OWNER_OPERATOR_RESTRICTION_LIFTED';

            await emitEvent({
              eventType,
              aggregateId: fleetOwnerId,
              aggregateType: 'FLEET_OWNER',
              actorId: 'SYSTEM',
              actorRole: 'SYSTEM',
              payload: {
                fleet_owner_id: fleetOwnerId,
                driver_id: entityId,
                driver_trust_score: trustScore,
                driver_trust_tier: newTier,
                restriction_threshold: trustTier0MinScore,
                action: shouldRestrict ? 'RESTRICTED' : 'UNRESTRICTED',
              },
            });

            invalidateCache(`cache:fleetowner:${fleetOwnerId}`);
          }
        }
      }

      // Invalidate cache
      await invalidateCache(`cache:trust:${entityType}:${entityId}`);

      return { success: true, trustScore, tier: newTier };
    },
    { connection: redis, concurrency: 5 }
  );
}

export { redis };
