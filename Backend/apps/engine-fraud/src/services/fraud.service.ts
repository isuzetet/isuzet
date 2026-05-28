import { prisma, generateId } from '@ruit/shared-db';

// Default fraud rules from Amendment 2 B6
const DEFAULT_FRAUD_RULES = {
  maxCodDiscrepancyPct: 15,
  maxCancellationRate: 0.25,
  maxRouteDeviationKm: 50,
  minTripsBeforeInvestigation: 3,
  anomalyScoreThreshold: 0.7,
  duplicatePhoneWindow: 24,
};

export interface FraudEvaluationParams {
  entityId: string;
  entityType: 'DRIVER' | 'FLEET_OWNER' | 'ORDERER';
  triggerType: string;
  triggerData: Record<string, unknown>;
}

export interface FraudEvaluationResult {
  flagged: boolean;
  ruleTriggered?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RaiseFlagParams {
  entityId: string;
  entityType: string;
  ruleTriggered: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: Record<string, unknown>;
  autoBlock: boolean;
}

export interface ReviewFlagParams {
  flagId: string;
  reviewedBy: string;
  decision: 'CONFIRMED' | 'DISMISSED';
  notes: string;
}

/**
 * Get active strategy version ID
 */
async function getActiveStrategyId(): Promise<string> {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  return strategy?.id ?? 'sv_phase1_growth';
}

/**
 * Get fraud rules from strategy version
 */
async function getFraudRules(): Promise<typeof DEFAULT_FRAUD_RULES> {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { thresholdSet: true },
  });

  if (strategy && strategy.thresholdSet) {
    const thresholdSet = strategy.thresholdSet as any;
    if (thresholdSet.fraudRules) {
      return { ...DEFAULT_FRAUD_RULES, ...thresholdSet.fraudRules };
    }
  }

  return DEFAULT_FRAUD_RULES;
}

/**
 * Evaluate fraud rules
 * Per Amendment 2 B6
 */
export async function evaluateFraudRules(
  params: FraudEvaluationParams
): Promise<FraudEvaluationResult> {
  const fraudRules = await getFraudRules();
  const strategyVersionId = await getActiveStrategyId();

  // Get entity's recent trip count (last 90 days) for DRIVER/FLEET_OWNER
  let tripCount = 0;
  const since = new Date();
  since.setDate(since.getDate() - 90);

  if (params.entityType === 'DRIVER') {
    const trips = await prisma.trip.count({
      where: {
        driverId: params.entityId,
        createdAt: { gte: since },
      },
    });
    tripCount = trips;
  } else if (params.entityType === 'FLEET_OWNER') {
    const trips = await prisma.trip.count({
      where: {
        fleetOwnerId: params.entityId,
        createdAt: { gte: since },
      },
    });
    tripCount = trips;
  }

  // If tripCount < minTripsBeforeInvestigation: return { flagged: false }
  if (tripCount < fraudRules.minTripsBeforeInvestigation && params.entityType !== 'ORDERER') {
    return { flagged: false };
  }

  // Evaluate rules based on triggerType
  switch (params.triggerType) {
    case 'COD_VERIFIED': {
      const discrepancyPct = params.triggerData.discrepancyPct as number;
      if (discrepancyPct > fraudRules.maxCodDiscrepancyPct) {
        const result = {
          flagged: true,
          ruleTriggered: 'COD_DISCREPANCY_EXCEEDED',
          severity: 'HIGH' as const,
        };
        await raiseFraudFlag({
          entityId: params.entityId,
          entityType: params.entityType,
          ruleTriggered: result.ruleTriggered,
          severity: result.severity,
          evidence: { discrepancyPct, threshold: fraudRules.maxCodDiscrepancyPct },
          autoBlock: false,
        });
        return result;
      }
      break;
    }

    case 'TRIP_COMPLETED': {
      // Get cancellation rate for entity (last 30 days)
      const since30d = new Date();
      since30d.setDate(since30d.getDate() - 30);

      let cancellationRate = 0;
      if (params.entityType === 'DRIVER') {
        const driver = await prisma.driver.findUnique({
          where: { id: params.entityId },
          select: { cancellationRate: true },
        });
        cancellationRate = driver?.cancellationRate ? Number(driver.cancellationRate) : 0;
      }

      if (cancellationRate > fraudRules.maxCancellationRate) {
        const result = {
          flagged: true,
          ruleTriggered: 'HIGH_CANCELLATION_RATE',
          severity: 'MEDIUM' as const,
        };
        await raiseFraudFlag({
          entityId: params.entityId,
          entityType: params.entityType,
          ruleTriggered: result.ruleTriggered,
          severity: result.severity,
          evidence: { cancellationRate, threshold: fraudRules.maxCancellationRate },
          autoBlock: false,
        });
        return result;
      }
      break;
    }

    case 'BEHAVIOR_ANOMALY': {
      const anomalyScore = params.triggerData.anomalyScore as number;
      if (anomalyScore > fraudRules.anomalyScoreThreshold) {
        const result = {
          flagged: true,
          ruleTriggered: 'ANOMALY_SCORE_EXCEEDED',
          severity: 'HIGH' as const,
        };
        await raiseFraudFlag({
          entityId: params.entityId,
          entityType: params.entityType,
          ruleTriggered: result.ruleTriggered,
          severity: result.severity,
          evidence: { anomalyScore, threshold: fraudRules.anomalyScoreThreshold },
          autoBlock: false,
        });
        return result;
      }
      break;
    }

    case 'REGISTRATION': {
      // Check for duplicate phone registrations
      const phone = params.triggerData.phone as string;
      const since24h = new Date();
      since24h.setHours(since24h.getHours() - fraudRules.duplicatePhoneWindow);

      const duplicates = await prisma.user.count({
        where: {
          phone,
          createdAt: { gte: since24h },
          id: { not: params.entityId },
        },
      });

      if (duplicates > 0) {
        const result = {
          flagged: true,
          ruleTriggered: 'DUPLICATE_REGISTRATION',
          severity: 'CRITICAL' as const,
        };
        await raiseFraudFlag({
          entityId: params.entityId,
          entityType: params.entityType,
          ruleTriggered: result.ruleTriggered,
          severity: result.severity,
          evidence: { phone, duplicateCount: duplicates, windowHours: fraudRules.duplicatePhoneWindow },
          autoBlock: true,
        });
        return result;
      }
      break;
    }

    default:
      // Unknown trigger type - no action
      break;
  }

  return { flagged: false };
}

/**
 * Raise a fraud flag
 */
export async function raiseFraudFlag(params: RaiseFlagParams): Promise<string> {
  const strategyVersionId = await getActiveStrategyId();
  const flagId = generateId('frd');

  // Update entity trust score to 0 if autoBlock or CRITICAL
  if (params.autoBlock || params.severity === 'CRITICAL') {
    if (params.entityType === 'DRIVER') {
      await prisma.driver.update({
        where: { id: params.entityId },
        data: { trustScore: 0, trustTier: 0 },
      });
    } else if (params.entityType === 'FLEET_OWNER') {
      await prisma.fleetOwner.update({
        where: { id: params.entityId },
        data: { trustScore: 0, trustTier: 0 },
      });
    } else if (params.entityType === 'ORDERER') {
      await prisma.orderer.update({
        where: { id: params.entityId },
        data: { creditScore: 0 },
      });
    }

    // Add 'FRAUD_BLOCKED' to entity's region access
    // This would require updating the region_access field
    // For now, we emit the event
  }

  // Create fraud flag record
  await prisma.fraudFlag.create({
    data: {
      id: flagId,
      entityId: params.entityId,
      entityType: params.entityType,
      ruleId: params.ruleTriggered,
      severity: params.severity,
      evidence: params.evidence,
      status: 'OPEN',
      reviewedBy: null,
    },
  });

  // Emit FRAUD_FLAG_RAISED event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'FRAUD_FLAG_RAISED',
      aggregateId: flagId,
      aggregateType: 'FRAUD_FLAG',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      strategyVersionId,
      payload: {
        entityId: params.entityId,
        entityType: params.entityType,
        ruleTriggered: params.ruleTriggered,
        severity: params.severity,
        autoBlock: params.autoBlock,
      },
      metadata: {
        source: 'FRAUD_ENGINE',
        timestamp: new Date().toISOString(),
      },
    },
  });

  return flagId;
}

/**
 * Review a fraud flag
 */
export async function reviewFraudFlag(params: ReviewFlagParams): Promise<void> {
  const strategyVersionId = await getActiveStrategyId();

  // Get the flag
  const flag = await prisma.fraudFlag.findUnique({
    where: { id: params.flagId },
  });

  if (!flag) {
    throw new Error('ENTITY_NOT_FOUND');
  }

  // Update flag status
  await prisma.fraudFlag.update({
    where: { id: params.flagId },
    data: {
      status: params.decision === 'CONFIRMED' ? 'CONFIRMED' : 'DISMISSED',
      reviewedBy: params.reviewedBy,
    },
  });

  // If DISMISSED: restore entity trust score
  if (params.decision === 'DISMISSED') {
    // Get recent event with original trust score, or restore to default
    // For simplicity, we restore to a base score of 50
    const restoredScore = 50;

    if (flag.entityType === 'DRIVER') {
      await prisma.driver.update({
        where: { id: flag.entityId },
        data: { trustScore: restoredScore },
      });
    } else if (flag.entityType === 'FLEET_OWNER') {
      await prisma.fleetOwner.update({
        where: { id: flag.entityId },
        data: { trustScore: restoredScore },
      });
    } else if (flag.entityType === 'ORDERER') {
      await prisma.orderer.update({
        where: { id: flag.entityId },
        data: { creditScore: restoredScore },
      });
    }
  }

  // Emit FRAUD_FLAG_REVIEWED event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'FRAUD_FLAG_REVIEWED',
      aggregateId: params.flagId,
      aggregateType: 'FRAUD_FLAG',
      actorId: params.reviewedBy,
      actorRole: 'OPS_ADMIN',
      strategyVersionId,
      payload: {
        flagId: params.flagId,
        decision: params.decision,
        notes: params.notes,
      },
      metadata: {
        source: 'FRAUD_ENGINE',
        timestamp: new Date().toISOString(),
      },
    },
  });
}

/**
 * Get entity fraud history
 */
export async function getEntityFraudHistory(entityId: string): Promise<any[]> {
  const flags = await prisma.fraudFlag.findMany({
    where: { entityId },
    orderBy: { createdAt: 'desc' },
  });

  return flags;
}

/**
 * Get fraud stats
 */
export async function getFraudStats(): Promise<{
  totalFlags30d: number;
  severityBreakdown: Record<string, number>;
  entityTypeBreakdown: Record<string, number>;
  ruleBreakdown: Record<string, number>;
  autoBlockedCount: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const flags = await prisma.fraudFlag.findMany({
    where: { createdAt: { gte: since } },
  });

  const severityBreakdown: Record<string, number> = {};
  const entityTypeBreakdown: Record<string, number> = {};
  const ruleBreakdown: Record<string, number> = {};
  let autoBlockedCount = 0;

  flags.forEach((flag) => {
    severityBreakdown[flag.severity] = (severityBreakdown[flag.severity] || 0) + 1;
    entityTypeBreakdown[flag.entityType] = (entityTypeBreakdown[flag.entityType] || 0) + 1;
    ruleBreakdown[flag.ruleId] = (ruleBreakdown[flag.ruleId] || 0) + 1;

    // Check if auto-blocked based on severity
    if (flag.severity === 'CRITICAL') {
      autoBlockedCount++;
    }
  });

  return {
    totalFlags30d: flags.length,
    severityBreakdown,
    entityTypeBreakdown,
    ruleBreakdown,
    autoBlockedCount,
  };
}
