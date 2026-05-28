import { prisma, generateId } from '@ruit/shared-db';
import { getCacheWithTtl, setCache, invalidateCache } from '@ruit/shared-utils';

export type CorridorSnapshot = {
  corridorId: string;
  snapshot_at: Date;
  active_trucks: number;
  active_loads: number;
  loadToTruckRatio: number | null;
  demandFillRate: number | null;
  paymentDelayRate: number | null;
  backhaulPct: number | null;
  avg_margin_etb: number | null;
};

export async function getDensityScore(corridorId: string): Promise<number> {
  // Raw SQL because corridor_snapshots is TimescaleDB
  const snaps = await prisma.$queryRaw<CorridorSnapshot[]>`
    SELECT * FROM corridor_snapshots
    WHERE corridorId = ${corridorId}
    ORDER BY snapshot_at DESC LIMIT 1
  `;
  const snap = snaps[0] ?? null;

  if (!snap) return 0.5;

  const ltrRaw = Number(snap.loadToTruckRatio ?? 1.0);
  const ltrScore =
    ltrRaw < 0.5
      ? (ltrRaw / 0.5) * 0.5
      : ltrRaw < 1.5
        ? 0.5 + (ltrRaw - 0.5) * 0.5
        : ltrRaw < 2.0
          ? 1.0
          : Math.max(0, 1.0 - (ltrRaw - 2.0) * 0.2);

  const fillScore = Number(snap.demandFillRate ?? 75) / 100;
  const payScore = 1 - Number(snap.paymentDelayRate ?? 10) / 100;
  const bkhlScore = Number(snap.backhaulPct ?? 20) / 100;

  const score =
    ltrScore * 0.35 + fillScore * 0.3 + payScore * 0.2 + bkhlScore * 0.15;
  const final = Math.min(1, Math.max(0, score));

  // Update corridors.densityIndex
  await prisma.corridor.update({
    where: { id: corridorId },
    data: { densityIndex: final },
  });

  return final;
}

export async function isStrategicCorridor(corridorId: string): Promise<boolean> {
  const c = await prisma.corridor.findUnique({
    where: { id: corridorId },
  });
  if (!c) return false;
  return (
    c.siuInvested > 0 ||
    (Number(c.densityIndex) < 0.35 && c.expansionEligible === true)
  );
}

export async function getCorridorMarginStats(corridorId: string): Promise<{
  avg: number;
  stddev: number;
  count: number;
}> {
  const result = await prisma.$queryRaw<
    Array<{
      avg_margin: number;
      stddev_margin: number;
      count: bigint;
    }>
  >`
    SELECT AVG(avg_margin_etb)::float as avg_margin,
           STDDEV(avg_margin_etb)::float as stddev_margin,
           COUNT(*)::bigint as count
    FROM corridor_snapshots
    WHERE corridorId = ${corridorId}
    AND snapshot_at > NOW() - INTERVAL '30 days'
  `;
  const row = result[0];
  return {
    avg: row?.avg_margin ?? 0,
    stddev: row?.stddev_margin ?? 0,
    count: Number(row?.count ?? 0),
  };
}

export async function takeCorridorSnapshot(corridorId: string): Promise<void> {
  const [activeLoads, activeTrucks] = await Promise.all([
    prisma.load.count({
      where: {
        corridorId: corridorId,
        status: { in: ['OPEN', 'MATCHED', 'IN_TRANSIT'] },
      },
    }),
    prisma.$queryRaw<number[]>`
      SELECT COUNT(*)::int from "Assignment"
      WHERE "loadId" IS NOT NULL
      AND status IN ('ACTIVE', 'ACCEPTED')
    `.then((res: any) => res[0] ?? 0),
  ]);

  const ratio = activeTrucks > 0 ? activeLoads / activeTrucks : 0;

  // Insert into TimescaleDB via raw SQL
  await prisma.$executeRaw`
    INSERT INTO corridor_snapshots (
      corridorId, snapshot_at, active_trucks, active_loads,
      loadToTruckRatio, margin_snapshot_count
    ) VALUES (
      ${corridorId}, NOW(), ${activeTrucks}, ${activeLoads},
      ${ratio}, 0
    )
  `;

  // Emit event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: 'CORRIDOR_HEALTH_UPDATED',
      aggregateId: corridorId,
      aggregateType: 'CORRIDOR',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      strategyVersionId: await getActiveStrategyId(),
      payload: {
        active_loads: activeLoads,
        active_trucks: activeTrucks,
        ratio,
      },
      metadata: {
        source: 'SCHEDULED_JOB',
        isManualOverride: false,
      },
    },
  });
}

// Helper — get active strategy id
async function getActiveStrategyId(): Promise<string> {
  const sv = await prisma.strategyVersion.findFirst({
    where: { isActive: true, scope: 'GLOBAL' },
  });
  return sv?.id ?? 'sv_phase1_growth';
}

