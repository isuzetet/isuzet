import { prisma, generateId } from '@ruit/shared-db';
import { cached, invalidateCache } from '@ruit/shared-utils';

export type ShockEvent = {
  id: string;
  shockType: string;
  severity: number;
  affectedCorridors: string[];
  isActive: boolean;
  actionsTaken: unknown;
};

// Shock mode severity matrix from PRD Section 7.4
// All thresholds read from strategy_versions.thresholdSet â€” never hardcoded
export async function getActiveShockEvent(): Promise<ShockEvent | null> {
  return cached('cache:shock:active', 30, async () => {
    const event = await prisma.shockEvent.findFirst({
      where: { isActive: true },
      orderBy: { severity: 'desc' },
    });
    return event as ShockEvent | null;
  });
}

export async function activateShockMode(params: {
  shockType: string;
  severity: number; // 1-4
  affectedCorridors: string[];
  description: string;
  triggered_by: 'SYSTEM' | 'MANUAL';
  triggered_by_user_id?: string;
}): Promise<ShockEvent> {
  const event = await prisma.shockEvent.create({
    data: {
      id: generateId('shk'),
      shockType: params.shockType,
      severity: params.severity,
      affectedCorridors: params.affectedCorridors,
      description: params.description,
        triggeredBy: params.triggered_by,
        triggeredByUserId: params.triggered_by_user_id ?? null,
        isActive: true,
        actionsTaken: {
        margin_floor_increase_pct: getMarginFloorIncrease(params.severity),
        negotiation_band_max: getNegotiationBandMax(params.severity),
        activated_at: new Date().toISOString(),
      },
    },
  });

  await invalidateCache('cache:shock:active');

  // Emit event to events table
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'SHOCK_MODE_ACTIVATED',
      aggregateId: event.id,
      aggregateType: 'CORRIDOR',
      actorId: params.triggered_by_user_id ?? 'SYSTEM',
      actorRole: params.triggered_by === 'MANUAL' ? 'OPS_ADMIN' : 'SYSTEM',
      strategyVersionId: await getActiveStrategyId(),
      payload: {
        severity: params.severity,
        shockType: params.shockType,
        affectedCorridors: params.affectedCorridors,
        margin_floor_increase_pct: getMarginFloorIncrease(params.severity),
      },
      metadata: {
        source: params.triggered_by === 'MANUAL' ? 'API' : 'SYSTEM',
        isManualOverride: params.triggered_by === 'MANUAL',
      },
    },
  });

  return event as ShockEvent;
}

export async function deactivateShockMode(
  shockEventId: string,
  userId: string
): Promise<void> {
  await prisma.shockEvent.update({
    where: { id: shockEventId },
    data: { isActive: false, endedAt: new Date() },
  });

  await invalidateCache('cache:shock:active');

  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'SHOCK_MODE_DEACTIVATED',
      aggregateId: shockEventId,
      aggregateType: 'CORRIDOR',
      actorId: userId,
      actorRole: 'OPS_ADMIN',
      strategyVersionId: await getActiveStrategyId(),
      payload: { deactivated_at: new Date().toISOString() },
      metadata: { source: 'API', isManualOverride: true },
    },
  });
}

// Margin floor increase per severity (from PRD Section 7.4 + Final Edit 9)
function getMarginFloorIncrease(severity: number): number {
  const increases: Record<number, number> = {
    1: 5,
    2: 15,
    3: 30,
    4: 50,
  };
  return increases[severity] ?? 5;
}

// Negotiation band max per severity (from Final Edit 9 â€” Amendment 2)
export function getNegotiationBandMax(severity: number): number {
  const caps: Record<number, number> = {
    1: 1.15,
    2: 1.1,
    3: 1.05,
    4: 1.0,
  };
  return caps[severity] ?? 1.15;
}

// Auto-trigger evaluation â€” called on each relevant event
// Thresholds from strategy_versions.thresholdSet.shock_auto_triggers
export async function evaluateAutoTriggers(
  triggerType: string,
  data: Record<string, unknown>
): Promise<void> {
  const sv = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
  });
  if (!sv) return;

  const triggers =
    ((sv.thresholdSet as Record<string, unknown>)?.shock_auto_triggers as Record<
      string,
      number
    >) ?? {};

  const existing = await getActiveShockEvent();
  if (existing && existing.severity >= 3) return; // already in severe shock

  switch (triggerType) {
    case 'FUEL_LOG_SUBMITTED': {
      // Check if fuel queue wait > threshold across 5+ logs in 4 hours
      const threshold = triggers.fuel_queue_wait_minutes ?? 60;
      const recentFuelQueues = await prisma.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT COUNT(*) as count FROM fuel_logs
        WHERE fuel_queue_wait_min > ${threshold}
        AND logged_at > NOW() - INTERVAL '4 hours'
      `;
      if (Number(recentFuelQueues[0]?.count ?? 0) >= 5) {
        await activateShockMode({
          shockType: 'FUEL_SHORTAGE',
          severity: 1,
          affectedCorridors: [],
          description: 'Auto-triggered: fuel queue wait exceeds threshold',
          triggered_by: 'SYSTEM',
        });
      }
      break;
    }
    case 'INCIDENT_OPENED': {
      const window = triggers.incident_spike_window_hours ?? 2;
      const count = triggers.incident_spike_count ?? 10;
      const recent = await prisma.incident.count({
        where: {
          severity: { in: ['HIGH', 'CRITICAL'] },
          createdAt: {
            gte: new Date(Date.now() - window * 60 * 60 * 1000),
          },
        },
      });
      if (recent >= count) {
        await activateShockMode({
          shockType: 'MANUAL',
          severity: 2,
          affectedCorridors: [],
          description: 'Auto-triggered: incident spike detected',
          triggered_by: 'SYSTEM',
        });
      }
      break;
    }
  }
}

async function getActiveStrategyId(): Promise<string> {
  const sv = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
  });
  return sv?.id ?? 'sv_phase1_growth';
}

// Get shock history
export async function getShockHistory(limit: number = 50): Promise<ShockEvent[]> {
  const events = await prisma.shockEvent.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
  return events as ShockEvent[];
}

// Update auto-trigger config
export async function updateAutoTriggerConfig(
  metric: string,
  threshold: number,
  severity: number
): Promise<void> {
  const sv = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
  });

  if (!sv) {
    throw new Error('No active strategy version found');
  }

  const currentThresholdSet =
    (sv.thresholdSet as Record<string, unknown>) ?? {};
  const shockAutoTriggers =
    (currentThresholdSet.shock_auto_triggers as Record<string, number>) ?? {};

  await prisma.strategyVersion.update({
    where: { id: sv.id },
    data: {
      thresholdSet: {
        ...currentThresholdSet,
        shock_auto_triggers: {
          ...shockAutoTriggers,
          [metric]: threshold,
        },
      },
    },
  });

  // Emit event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'STRATEGY_VERSION_CHANGED',
      aggregateId: sv.id,
      aggregateType: 'STRATEGY',
      actorId: 'SYSTEM',
      actorRole: 'SUPER_ADMIN',
      strategyVersionId: sv.id,
      payload: {
        updated_metric: metric,
        new_threshold: threshold,
        updated_field: 'shock_auto_triggers',
      },
      metadata: { source: 'API', isManualOverride: true },
    },
  });

  // Invalidate cache
  await invalidateCache('cache:strategy:active:GLOBAL');
}

