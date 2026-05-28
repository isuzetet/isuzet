import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface CorridorSnapshotJob {
  corridorId: string;
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
      corridorId: params.aggregateId.startsWith('cor_') ? params.aggregateId : null,
      payload: params.payload as any,
      metadata: { source: 'CORRIDOR_SNAPSHOT_WORKER', timestamp: new Date().toISOString() } as any,
    },
  });
}

export function createCorridorSnapshotWorker(): Worker {
  return new Worker<CorridorSnapshotJob>(
    QUEUES.CORRIDOR_SNAPSHOT,
    async (job) => {
      const { corridorId } = job.data;

      // Get corridor
      const corridor = await prisma.corridor.findUnique({
        where: { id: corridorId },
      });

      if (!corridor) {
        throw new Error(`Corridor not found: ${corridorId}`);
      }

      // Count active loads on this corridor
      const activeLoads = await prisma.load.count({
        where: {
          corridorId,
          status: { in: ['PENDING', 'ASSIGNED', 'IN_TRANSIT'] },
        },
      });

      // Count active assignments
      const activeAssignments = await prisma.assignment.count({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      });

      // Count available trucks on this corridor
      const activeTrucks = await prisma.truck.count({
        where: {
          status: 'VERIFIED',
        },
      });

      // Calculate load-to-truck ratio
      const loadToTruckRatio = activeTrucks > 0 ? activeLoads / activeTrucks : 0;

      // Insert snapshot to TimescaleDB via raw SQL
      try {
        await prisma.$executeRaw`INSERT INTO corridor_snapshots (
          corridor_id, snapshot_at, active_trucks, active_loads, load_to_truck_ratio, margin_snapshot_count
        ) VALUES (
          ${corridorId}, NOW(), ${activeTrucks}, ${activeLoads}, ${loadToTruckRatio}, 0
        )`;
      } catch (err) {
        console.error('Failed to insert corridor snapshot:', err);
        // Non-critical - continue
      }

      // Update corridor health score based on density
      let healthScore = 50; // Default
      if (loadToTruckRatio < 0.05) {
        healthScore = 100; // Abundant capacity
      } else if (loadToTruckRatio < 0.15) {
        healthScore = 80; // Good balance
      } else if (loadToTruckRatio < 0.30) {
        healthScore = 60; // Tightening
      } else if (loadToTruckRatio < 0.50) {
        healthScore = 40; // Congestion
      } else {
        healthScore = 20; // Severe congestion
      }

      // Update corridor health
      await prisma.corridor.update({
        where: { id: corridorId },
        data: { healthScore },
      });

      // Emit CORRIDOR_HEALTH_UPDATED event
      await emitEvent({
        eventType: 'CORRIDOR_HEALTH_UPDATED',
        aggregateId: corridorId,
        aggregateType: 'CORRIDOR',
        actorId: 'SYSTEM',
        actorRole: 'SNAPSHOT_WORKER',
        payload: {
          corridor_id: corridorId,
          health_score: healthScore,
          active_loads: activeLoads,
          active_trucks: activeTrucks,
          active_assignments: activeAssignments,
          load_to_truck_ratio: loadToTruckRatio,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        corridorId,
        healthScore,
        activeLoads,
        activeTrucks,
        activeAssignments,
        loadToTruckRatio,
      };
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };
