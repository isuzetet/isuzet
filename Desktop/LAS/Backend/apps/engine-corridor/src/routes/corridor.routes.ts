import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma, generateId } from "@ruit/shared-db";
import { cached as cacheGet, invalidateCache, toEthiopianDate } from "@ruit/shared-utils";
import { ROLES, EVENT_TYPES } from "@ruit/shared-types";
import { AccessTokenPayload, requireRole } from "@ruit/shared-auth";
import { Decimal } from "@prisma/client/runtime/library";
import { getDensityScore, isStrategicCorridor, takeCorridorSnapshot, } from "../services/density.service.js";
import { calculateEta, getCorridorPerformanceStats } from "../services/eta.service.js";

const OPS_ROLES = [
  ROLES.OPS_ADMIN,
  ROLES.OPS_VIEWER,
  ROLES.SUPER_ADMIN,
  ROLES.FINANCE_OPS,
];

const ROLES_ANY = Object.values(ROLES);

export default async function corridorRoutes(fastify: FastifyInstance) {
  // GET /api/v1/corridor/eta/:corridorId
  fastify.get(
    '/eta/:corridorId',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        corridorId: z.string(),
        currentLat: z.coerce.number(),
        currentLng: z.coerce.number(),
        destinationLat: z.coerce.number(),
        destinationLng: z.coerce.number(),
      });
      const query = schema.parse(request.query);

      try {
        const eta = await calculateEta({
          corridorId: query.corridorId,
          currentLat: query.currentLat,
          currentLng: query.currentLng,
          destinationLat: query.destinationLat,
          destinationLng: query.destinationLng,
        });
        return reply.send({ success: true, data: eta });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: { code: "ETA_CALCULATION_FAILED", message: (error as Error).message },
        });
      }
    }
  );

  // GET /api/v1/corridor/corridors/:id/stats
  fastify.get(
    '/corridors/:id/stats',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: corridorId } = request.params as { id: string };
      try {
        const stats = await getCorridorPerformanceStats(corridorId);
        return reply.send({ success: true, data: stats });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: { code: "CORRIDOR_STATS_FAILED", message: (error as Error).message },
        });
      }
    }
  );

  // GET /api/v1/corridor/corridors
  // Auth: ANY authenticated role
  // CHANGE 1: Enrich corridor list with new fields and currentActiveTrucks
  fastify.get("/corridors", { preHandler: (fastify as any).requireRole(ROLES_ANY) }, async (request, reply) => {
    // Check cache
    const cacheKey = "cache:corridor:list";
    const corridors = await cacheGet(cacheKey, 600, async () => {
      const corridors = await prisma.corridor.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          originZone: { select: { id: true, name: true } },
          destinationZone: { select: { id: true, name: true } },
        },
      });
      return corridors;
    });

    // Batch compute currentActiveTrucks for all corridors
    const zoneIds = corridors
      .filter((c: any) => c.originZoneId || c.destinationZoneId)
      .flatMap((c: any) => [c.originZoneId, c.destinationZoneId].filter(Boolean));
    
    let driverCountMap = new Map<string, number>();
    if (zoneIds.length > 0) {
      const uniqueZoneIds = [...new Set(zoneIds)];
      const driverCounts = await prisma.driver.groupBy({
        by: ['currentZoneId'],
        where: { currentZoneId: { in: uniqueZoneIds } },
        _count: { id: true },
      });
      driverCountMap = new Map(driverCounts.map((d: any) => [d.currentZoneId!, d._count.id]));
    }

    const enrichedCorridors = corridors.map((c: any) => ({
      ...c,
      corridorType: c.corridorType,
      averageTransitMinutes: c.averageTransitMinutes,
      peakHourMultiplier: c.peakHourMultiplier != null ? Number(c.peakHourMultiplier) : undefined,
      roadConditionScore: c.roadConditionScore,
      isNightTimeRestricted: c.isNightTimeRestricted,
      expectedCheckpointFeeEtb: c.expectedCheckpointFeeEtb,
      currentActiveTrucks: (driverCountMap.get(c.originZoneId) || 0) + (driverCountMap.get(c.destinationZoneId) || 0),
    }));

    return {
      success: true,
      data: enrichedCorridors,
      pagination: {
        page: 1,
        pageSize: enrichedCorridors.length,
        totalPages: 1,
        totalItems: enrichedCorridors.length,
      },
    };
  });

  // GET /api/v1/corridor/corridors/:id
  // Auth: ANY authenticated role
  fastify.get<{ Params: { id: string } }>(
    "/corridors/:id",
    { preHandler: (fastify as any).requireRole(ROLES_ANY) },
    async (request, reply) => {
      const { id } = request.params;
      // Check cache
      const cacheKey = `cache:corridor:${id}`;
      const data = await cacheGet(cacheKey, 600, async () => {
        const corridor = await prisma.corridor.findUnique({
          where: { id },
        });
        return corridor;
      });
      if (!data) {
        return reply.status(404).send({
          success: false,
          error: { code: "ENTITY_NOT_FOUND", message: "Corridor not found" },
        });
      }
      return { success: true, data: data };
    }
  );

  // GET /api/v1/corridor/corridors/:id/density
  // Auth: ANY authenticated role
  fastify.get<{ Params: { id: string } }>(
    "/corridors/:id/density",
    { preHandler: (fastify as any).requireRole(ROLES_ANY) },
    async (request, reply) => {
      const { id } = request.params;
      // Verify corridor exists
      const corridor = await prisma.corridor.findUnique({ where: { id } });
      if (!corridor) {
        return reply.status(404).send({
          success: false,
          error: { code: "ENTITY_NOT_FOUND", message: "Corridor not found" },
        });
      }
      const [densityScore, strategic, healthScore] = await Promise.all([
        getDensityScore(id),
        isStrategicCorridor(id),
        Promise.resolve(Number(corridor.healthScore || 0)),
      ]);
      return {
        success: true,
        data: {
          corridorId: id,
          density_score: densityScore,
          is_strategic: strategic,
          healthScore: healthScore,
        },
      };
    }
  );

  // POST /api/v1/corridor/corridors/:id/snapshot
  // Auth: OPS_ADMIN, SUPER_ADMIN
  fastify.post<{ Params: { id: string } }>(
    "/corridors/:id/snapshot",
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request, reply) => {
      const { id } = request.params;
      // Verify corridor exists
      const corridor = await prisma.corridor.findUnique({ where: { id } });
      if (!corridor) {
        return reply.status(404).send({
          success: false,
          error: { code: "ENTITY_NOT_FOUND", message: "Corridor not found" },
        });
      }
      await takeCorridorSnapshot(id);
      return { success: true, data: { snapshot_taken: true } };
    }
  );

  // PUT /api/v1/corridor/corridors/:id/freeze
  // Auth: OPS_ADMIN, SUPER_ADMIN
  fastify.put<{ Params: { id: string }; Body: { reason: string } }>(
    "/corridors/:id/freeze",
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request, reply) => {
      const { id } = request.params;
      const { reason } = request.body || ({} as any);

      // Update corridor status
      const corridor = await prisma.corridor.update({
        where: { id },
        data: { status: "FROZEN" },
      });

      // Emit event
      await prisma.event.create({
        data: {
          id: generateId("evt"),
          eventType: "CORRIDOR_FROZEN",
          aggregateId: id,
          aggregateType: "CORRIDOR",
          actorId: (request as any).user?.sub || "SYSTEM",
          actorRole: (request as any).user?.role || "OPS_ADMIN",
          strategyVersionId: await getActiveStrategyId(),
          payload: { reason, frozen_at: new Date().toISOString() },
          metadata: { source: "API", isManualOverride: true },
        },
      });

      // Invalidate cache
      await invalidateCache(`cache:corridor:${id}`);
      return { success: true };
    }
  );

  // PUT /api/v1/corridor/corridors/:id/health-override
  // Auth: OPS_ADMIN, SUPER_ADMIN
  fastify.put<{ Params: { id: string }; Body: { healthScore: number } }>(
    "/corridors/:id/health-override",
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request, reply) => {
      const { id } = request.params;
      const { healthScore } = request.body || ({} as any);

      if (healthScore === undefined || healthScore < 0 || healthScore > 100) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "healthScore must be between 0 and 100",
          },
        });
      }

      // Update corridor health score
      const corridor = await prisma.corridor.update({
        where: { id },
        data: { healthScore: healthScore },
      });

      // Emit event
      await prisma.event.create({
        data: {
          id: generateId("evt"),
          eventType: "MANUAL_OVERRIDE_ISSUED",
          aggregateId: id,
          aggregateType: "CORRIDOR",
          actorId: (request as any).user?.sub || "SYSTEM",
          actorRole: (request as any).user?.role || "OPS_ADMIN",
          strategyVersionId: await getActiveStrategyId(),
          payload: { healthScore, override_type: "HEALTH_SCORE" },
          metadata: { source: "API", isManualOverride: true },
        },
      });

      // Invalidate cache
      await invalidateCache(`cache:corridor:${id}`);
      return { success: true, data: { healthScore } };
    }
  );

  // CHANGE 2: GET /api/v1/corridor/zones
  // Auth: ANY authenticated user
  fastify.get("/zones", { preHandler: (fastify as any).requireRole(ROLES_ANY) }, async (request, reply) => {
    const zones = await prisma.zone.findMany();
    const zoneIds = zones.map((z: any) => z.id);

    // Batch count queries
    const [truckCounts, loadCounts, latestSnapshots] = await Promise.all([
      prisma.driver.groupBy({
        by: ['currentZoneId'],
        where: { currentZoneId: { in: zoneIds } },
        _count: { id: true },
      }),
      prisma.load.groupBy({
        by: ['pickupZoneId'],
        where: {
          pickupZoneId: { in: zoneIds },
          status: { in: ['OPEN', 'READY_TO_MATCH', 'QUOTING'] },
        },
        _count: { id: true },
      }),
      prisma.zoneDemandSnapshot.findMany({
        where: { zoneId: { in: zoneIds } },
        orderBy: { snapshotAt: 'desc' },
        distinct: ['zoneId'],
      }),
    ]);

    const truckMap = new Map(truckCounts.map((t: any) => [t.currentZoneId, t._count.id]));
    const loadMap = new Map(loadCounts.map((l: any) => [l.pickupZoneId, l._count.id]));
    const snapshotMap = new Map(latestSnapshots.map((s: any) => [s.zoneId, s]));

    const result = zones.map((z: any) => ({
      ...z,
      centerLat: z.centerLat != null ? Number(z.centerLat) : undefined,
      centerLng: z.centerLng != null ? Number(z.centerLng) : undefined,
      truckDemandIndex: z.truckDemandIndex != null ? Number(z.truckDemandIndex) : undefined,
      availableTrucks: truckMap.get(z.id) || 0,
      openLoads: loadMap.get(z.id) || 0,
      latestSnapshot: snapshotMap.get(z.id) || null,
    })).sort((a: any, b: any) => b.truckDemandIndex - a.truckDemandIndex);

    return { success: true, data: result };
  });

  // CHANGE 3: GET /api/v1/corridor/zones/:id
  // Auth: ANY authenticated user
  fastify.get<{ Params: { id: string } }>("/zones/:id", { preHandler: (fastify as any).requireRole(ROLES_ANY) }, async (request, reply) => {
    const { id } = request.params;

    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        terminals: {
          where: { isActive: true },
          select: { id: true, name: true, nameAmharic: true, lat: true, lng: true, currentQueueCount: true },
        },
      },
    });

    if (!zone) {
      return reply.status(404).send({
        success: false,
        error: { code: "ENTITY_NOT_FOUND", message: "Zone not found" },
      });
    }

    const [truckCount, openLoadCount, latestSnapshot] = await Promise.all([
      prisma.driver.count({ where: { currentZoneId: id } }),
      prisma.load.count({
        where: {
          pickupZoneId: id,
          status: { in: ['OPEN', 'READY_TO_MATCH', 'QUOTING'] },
        },
      }),
      prisma.zoneDemandSnapshot.findFirst({
        where: { zoneId: id },
        orderBy: { snapshotAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      data: {
        ...zone,
        centerLat: zone.centerLat != null ? Number(zone.centerLat) : undefined,
        centerLng: zone.centerLng != null ? Number(zone.centerLng) : undefined,
        truckDemandIndex: zone.truckDemandIndex != null ? Number(zone.truckDemandIndex) : undefined,
        availableTrucks: truckCount,
        openLoads: openLoadCount,
        latestSnapshot,
      },
    };
  });

  // CHANGE 4: POST /api/v1/corridor/zones/:id/demand-override
  // Auth: OPS_ADMIN only
  fastify.post<{ Params: { id: string }; Body: { truckDemandIndex: number; reason: string } }>(
    "/zones/:id/demand-override",
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request, reply) => {
      const { id } = request.params;
      const { truckDemandIndex, reason } = request.body;

      const zone = await prisma.zone.findUnique({ where: { id } });
      if (!zone) {
        return reply.status(404).send({
          success: false,
          error: { code: "ENTITY_NOT_FOUND", message: "Zone not found" },
        });
      }

      const updatedZone = await prisma.zone.update({
        where: { id },
        data: { truckDemandIndex: new Decimal(truckDemandIndex) },
      });

      // Emit event
      await prisma.event.create({
        data: {
          id: generateId('evt'),
          eventType: EVENT_TYPES.ZONE_DEMAND_OVERRIDE,
          aggregateId: id,
          aggregateType: 'Zone',
          actorId: (request as any).user?.sub || 'SYSTEM',
          actorRole: (request as any).user?.role || 'OPS_ADMIN',
          strategyVersionId: await getActiveStrategyId(),
          payload: { truckDemandIndex, reason },
          metadata: { source: 'API', isManualOverride: true },
        },
      });

      return {
        success: true,
        data: {
          ...updatedZone,
          centerLat: updatedZone.centerLat != null ? Number(updatedZone.centerLat) : undefined,
          centerLng: updatedZone.centerLng != null ? Number(updatedZone.centerLng) : undefined,
          truckDemandIndex: updatedZone.truckDemandIndex != null ? Number(updatedZone.truckDemandIndex) : undefined,
        },
      };
    }
  );

  // CHANGE 5: GET /api/v1/corridor/checkpoint-map
  // Auth: ANY authenticated user
  fastify.get("/checkpoint-map", { preHandler: (fastify as any).requireRole(ROLES_ANY) }, async (request, reply) => {
    const checkpoints = await prisma.checkpointIntelligence.findMany();

    return {
      success: true,
      data: checkpoints.map((cp: any) => ({
        id: cp.id,
        lat: Number(cp.lat),
        lng: Number(cp.lng),
        checkpointType: cp.checkpointType,
        locationName: cp.locationName,
        averageFeeEtb: cp.averageFeeEtb,
        corridorId: cp.corridorId,
        isOfficialToll: cp.isOfficialToll,
        reportCount: cp.reportCount,
        lastReportedAt: cp.lastReportedAt,
      })),
    };
  });

  // CHANGE 6: GET /api/v1/corridor/terminals
  // Auth: ANY authenticated user
  fastify.get("/terminals", { preHandler: (fastify as any).requireRole(ROLES_ANY) }, async (request, reply) => {
    const terminals = await prisma.terminal.findMany({
      where: { isActive: true },
      include: { zone: { select: { name: true } } },
    });

    return {
      success: true,
      data: terminals.map((t: any) => ({
        id: t.id,
        name: t.name,
        nameAmharic: t.nameAmharic,
        currentQueueCount: t.currentQueueCount,
        averageWaitTimeMinutes: t.averageWaitTimeMinutes,
        zoneName: t.zone?.name,
        lat: Number(t.lat),
        lng: Number(t.lng),
        isActive: t.isActive,
      })),
    };
  });

  // CHANGE 7: GET /api/v1/corridor/terminals/:id
  // Auth: ANY authenticated user
  fastify.get<{ Params: { id: string } }>("/terminals/:id", { preHandler: (fastify as any).requireRole(ROLES_ANY) }, async (request, reply) => {
    const { id } = request.params;

    const terminal = await prisma.terminal.findUnique({
      where: { id },
      include: {
        zone: true,
        queueEntries: {
          where: { isActive: true },
          orderBy: { queuePosition: 'asc' },
          select: {
            truckId: true,
            driverId: true,
            queuePosition: true,
            checkedInAt: true,
          },
        },
      },
    });

    if (!terminal) {
      return reply.status(404).send({
        success: false,
        error: { code: "ENTITY_NOT_FOUND", message: "Terminal not found" },
      });
    }

    const now = new Date();
    const enrichedQueue = terminal.queueEntries.map((entry: any) => ({
      ...entry,
      waitingMinutes: Math.floor((now.getTime() - new Date(entry.checkedInAt).getTime()) / 60000),
    }));

    return {
      success: true,
      data: {
        ...terminal,
        lat: Number(terminal.lat),
        lng: Number(terminal.lng),
        zone: terminal.zone ? {
          ...terminal.zone,
          centerLat: terminal.zone.centerLat != null ? Number(terminal.zone.centerLat) : undefined,
          centerLng: terminal.zone.centerLng != null ? Number(terminal.zone.centerLng) : undefined,
        } : null,
        queueEntries: enrichedQueue,
      },
    };
  });
}

// Helper - get active strategy id
async function getActiveStrategyId(): Promise<string> {
  const sv = await prisma.strategyVersion.findFirst({
    where: { isActive: true, scope: "GLOBAL" },
  });
  return sv?.id ?? "sv_phase1_growth";
}
