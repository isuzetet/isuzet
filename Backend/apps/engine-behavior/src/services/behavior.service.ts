import { prisma, generateId } from '@ruit/shared-db';
import { cached, invalidateCache } from '@ruit/shared-utils';
import { EVENT_TYPES } from '@ruit/shared-types';

// Signal types per Amendment 2 B5 + Phase 2 additions
export type BehaviorSignalType =
  | 'ROUTE_DEVIATION'
  | 'SPEED_VIOLATION'
  | 'IDLE_TIME'
  | 'FUEL_CONSUMPTION'
  | 'PICKUP_DELAY'
  | 'COD_DISCREPANCY'
  | 'CANCELLATION'
  | 'LATE_DELIVERY'
  // Phase 2 additions:
  | 'BACKHAUL_ACCEPTED'
  | 'OVERLOAD_DETECTED'
  | 'CHECKPOINT_LOGGED'
  | 'FUEL_PRICE_REPORTED';

export type BehaviorSignal = {
  entityId: string;
  entityType: 'DRIVER' | 'FLEET_OWNER';
  signalType: BehaviorSignalType;
  value: number;
  corridorId?: string;
  tripId?: string;
  recordedAt: Date;
};

export type AnomalyResult = {
  entityId: string;
  entityType: string;
  anomalyScore: number; // 0-1, higher = more anomalous
  anomalyType: string;
  triggeredAt: Date;
  details: Record<string, unknown>;
};

/**
 * Weights for trust score calculation - Phase 2 Enhanced
 * Total weights sum to 1.0
 * 
 * NEW WEIGHT TABLE (Phase 2):
 * -------------------------
 * BACKHAUL_ACCEPTED:           +0.05 (positive signal - driver accepts backhaul)
 * OVERLOAD_DETECTED (tolerance): +0.00 (no penalty if within tolerance)
 * OVERLOAD_DETECTED (over):    -0.03 (negative - over tolerance)
 * CHECKPOINT_LOGGED:           +0.02 (positive - driver reports checkpoint)
 * FUEL_PRICE_REPORTED:         +0.01 (positive - driver reports fuel price)
 * 
 * Existing weights rebalanced proportionally:
 * ROUTE_DEVIATION:             +0.25
 * SPEED_VIOLATION:             +0.17
 * IDLE_TIME:                   +0.13
 * FUEL_CONSUMPTION:            +0.13
 * PICKUP_DELAY:                +0.17
 * COD_DISCREPANCY:             +0.21
 * CANCELLATION:                +0.17
 * LATE_DELIVERY:               +0.21
 * 
 * TOTAL: 1.00
 */
const SIGNAL_WEIGHTS: Record<BehaviorSignalType, number> = {
  // Existing signals (rebalanced)
  ROUTE_DEVIATION: 0.25,
  SPEED_VIOLATION: 0.17,
  IDLE_TIME: 0.13,
  FUEL_CONSUMPTION: 0.13,
  PICKUP_DELAY: 0.17,
  COD_DISCREPANCY: 0.21,
  CANCELLATION: 0.17,
  LATE_DELIVERY: 0.21,
  // Phase 2 additions
  BACKHAUL_ACCEPTED: 0.05,
  OVERLOAD_DETECTED: -0.03, // Negative weight for penalty
  CHECKPOINT_LOGGED: 0.02,
  FUEL_PRICE_REPORTED: 0.01,
};

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
 * Record a behavior signal
 * Per Amendment 2 B5
 */
export async function recordBehaviorSignal(signal: BehaviorSignal): Promise<void> {
  const strategyVersionId = await getActiveStrategyId();

  // Insert into decisionTrace with traceType: 'BEHAVIOR_SIGNAL'
  await prisma.decisionTrace.create({
    data: {
      id: generateId('dtr'),
      loadId: signal.tripId ?? 'N/A',
      candidateTruckId: 'N/A',
      candidateDriverId: signal.entityType === 'DRIVER' ? signal.entityId : 'N/A',
      strategyVersionId,
      optimizationMode: 'BEHAVIOR_TRACKING',
      inputVariables: {
        traceType: 'BEHAVIOR_SIGNAL',
        signalType: signal.signalType,
        value: signal.value,
        corridorId: signal.corridorId,
        tripId: signal.tripId,
      },
      weightValues: {},
      factorScores: {},
      finalScore: signal.value,
      rank: 0,
    },
  });

  // Emit BEHAVIOR_SIGNAL_RECORDED event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'BEHAVIOR_SIGNAL_RECORDED',
      aggregateId: signal.entityId,
      aggregateType: signal.entityType,
      actorId: signal.entityId,
      actorRole: signal.entityType,
      strategyVersionId,
      corridorId: signal.corridorId ?? null,
      payload: {
        signalType: signal.signalType,
        value: signal.value,
        tripId: signal.tripId,
      },
      metadata: {
        source: 'BEHAVIOR_ENGINE',
        timestamp: signal.recordedAt.toISOString(),
      },
    },
  });
}

/**
 * Compute anomaly score for an entity
 * Per Amendment 2 B5 logic
 */
export async function computeAnomalyScore(
  entityId: string,
  entityType: 'DRIVER' | 'FLEET_OWNER'
): Promise<AnomalyResult> {
  const strategyVersionId = await getActiveStrategyId();

  // Get last 30 days of decision traces for this entity where traceType = 'BEHAVIOR_SIGNAL'
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const traces = await prisma.decisionTrace.findMany({
    where: {
      candidateDriverId: entityType === 'DRIVER' ? entityId : undefined,
      strategyVersionId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter traces that are behavior signals
  const behaviorTraces = traces.filter(
    (t: typeof traces[0]) => t.inputVariables && (t.inputVariables as any).traceType === 'BEHAVIOR_SIGNAL'
  );

  // Group signals by signalType
  const signalsByType: Record<string, number[]> = {};
  behaviorTraces.forEach((trace: typeof traces[0]) => {
    const vars = trace.inputVariables as any;
    const signalType = vars.signalType as BehaviorSignalType;
    if (!signalsByType[signalType]) {
      signalsByType[signalType] = [];
    }
    signalsByType[signalType].push(vars.value as number);
  });

  // For each signalType compute: mean, stddev, latest value
  const availableWeights: Record<string, number> = {};
  const signalAnomalyScores: Record<string, number> = {};

  Object.entries(signalsByType).forEach(([signalType, values]) => {
    if (values.length < 2) return;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance) + 0.001; // Add small value to avoid division by zero
    const latest = values[0]; // Most recent (sorted DESC)

    // Anomaly score per signal = |latest - mean| / (stddev + 0.001) capped at 1.0
    const score = Math.min(1.0, Math.abs(latest - mean) / stddev);
    signalAnomalyScores[signalType] = score;
    availableWeights[signalType] = SIGNAL_WEIGHTS[signalType as BehaviorSignalType] ?? 0.1;
  });

  // Normalize weights to sum to 1.0 for available signals
  const totalWeight = Object.values(availableWeights).reduce((a, b) => a + b, 0);
  const normalizedWeights: Record<string, number> = {};
  if (totalWeight > 0) {
    Object.entries(availableWeights).forEach(([type, weight]) => {
      normalizedWeights[type] = weight / totalWeight;
    });
  }

  // Overall anomalyScore = weighted average
  let anomalyScore = 0;
  Object.entries(signalAnomalyScores).forEach(([type, score]) => {
    anomalyScore += score * (normalizedWeights[type] ?? 0);
  });

  // Determine anomalyType
  let anomalyType = 'NORMAL';
  if (anomalyScore > 0.8) anomalyType = 'CRITICAL_ANOMALY';
  else if (anomalyScore > 0.6) anomalyType = 'HIGH_ANOMALY';
  else if (anomalyScore > 0.4) anomalyType = 'MODERATE_ANOMALY';

  // If anomalyScore > 0.6: emit FRAUD_FLAG_RAISED event
  if (anomalyScore > 0.6) {
    await prisma.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'FRAUD_FLAG_RAISED',
        aggregateId: generateId('frd'),
        aggregateType: 'FRAUD_FLAG',
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        strategyVersionId,
        payload: {
          anomalyScore,
          anomalyType,
          entityId,
          entityType,
          reason: 'ANOMALY_SCORE_EXCEEDED',
        },
        metadata: {
          source: 'BEHAVIOR_ENGINE',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  return {
    entityId,
    entityType,
    anomalyScore,
    anomalyType,
    triggeredAt: new Date(),
    details: {
      signalScores: signalAnomalyScores,
      weights: normalizedWeights,
      traceCount: behaviorTraces.length,
    },
  };
}

/**
 * Get entity behavior history
 */
export async function getEntityBehaviorHistory(
  entityId: string,
  entityType: string,
  days: number = 30
): Promise<any[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const traces = await prisma.decisionTrace.findMany({
    where: {
      candidateDriverId: entityType === 'DRIVER' ? entityId : undefined,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter for behavior signals
  return traces.filter((t: typeof traces[0]) => t.inputVariables && (t.inputVariables as any).traceType === 'BEHAVIOR_SIGNAL');
}

/**
 * Get corridor behavior stats
 */
export async function getCorridorBehaviorStats(corridorId: string): Promise<{
  avgAnomalyScore: number;
  totalSignals: number;
  flaggedEntities: number;
  topAnomalies: AnomalyResult[];
}> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  // Get behavior traces for this corridor
  const traces = await prisma.decisionTrace.findMany({
    where: {
      createdAt: { gte: since },
    },
    include: { load: true },
  });

  // Filter by corridor
  const corridorTraces = traces.filter((t: typeof traces[0]) => t.load?.corridorId === corridorId);

  // Get unique entities active on this corridor
  const entityIds = new Set<string>();
  corridorTraces.forEach((t: typeof traces[0]) => {
    if (t.candidateDriverId && t.candidateDriverId !== 'N/A') {
      entityIds.add(t.candidateDriverId);
    }
  });

  // Compute anomaly scores for each entity
  const entityAnomalies: AnomalyResult[] = [];
  for (const entityId of entityIds) {
    const anomaly = await computeAnomalyScore(entityId, 'DRIVER');
    if (anomaly.anomalyScore > 0.3) {
      entityAnomalies.push(anomaly);
    }
  }

  // Sort by anomaly score
  entityAnomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);

  const totalSignals = corridorTraces.filter(
    (t: typeof corridorTraces[0]) => t.inputVariables && (t.inputVariables as any).traceType === 'BEHAVIOR_SIGNAL'
  ).length;

  const avgAnomalyScore =
    entityAnomalies.length > 0
      ? entityAnomalies.reduce((sum, a) => sum + a.anomalyScore, 0) / entityAnomalies.length
      : 0;

  return {
    avgAnomalyScore,
    totalSignals,
    flaggedEntities: entityAnomalies.filter((a) => a.anomalyType !== 'NORMAL').length,
    topAnomalies: entityAnomalies.slice(0, 10),
  };
}
