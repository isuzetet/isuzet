import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { recordBehaviorSignal, computeAnomalyScore, getEntityBehaviorHistory, getCorridorBehaviorStats } from '../services/behavior.service';
import { prisma, generateId } from '@ruit/shared-db';
import { toEthiopianDateString } from '@ruit/shared-utils';
import { addJob, QUEUES } from '@ruit/shared-queue';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';

// Zod schemas for validation
const BehaviorSignalSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(["DRIVER", "FLEET_OWNER"]),
  signalType: z.enum([
    "ROUTE_DEVIATION",
    "SPEED_VIOLATION",
    "IDLE_TIME",
    "FUEL_CONSUMPTION",
    "PICKUP_DELAY",
    "COD_DISCREPANCY",
    "CANCELLATION",
    "LATE_DELIVERY",
  ]),
  value: z.number(),
  corridorId: z.string().optional(),
  tripId: z.string().optional(),
});

const RatingSchema = z.object({
  loadId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const HistoryQuerySchema = z.object({
  days: z.coerce.number().min(1).max(90).default(30),
});

/**
 * Behavior routes
 */
export async function behaviorRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/behavior/signals
  app.post(
    '/signals',
    {
      preHandler: [requireRole(['SYSTEM', 'OPS_ADMIN', 'SUPER_ADMIN'])]
    },
    async (request, reply) => {
      const body = BehaviorSignalSchema.parse(request.body);
      await recordBehaviorSignal({
        entityId: body.entityId,
        entityType: body.entityType,
        signalType: body.signalType,
        value: body.value,
        corridorId: body.corridorId,
        tripId: body.tripId,
        recordedAt: new Date(),
      });
      reply.send({ success: true, data: { recorded: true } });
    }
  );

  // GET /api/v1/behavior/drivers/:id/trust-profile
  // Change 1: Trust profile with trend calculation using Events
  app.get('/drivers/:id/trust-profile', {
    preHandler: requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN, ROLES.OPS_VIEWER])
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        trustScore: true,
        trustTier: true,
        kycTier: true,
      }
    });
    
    if (!driver) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
      });
    }
    
    // Get last 30 trust-related events for this driver
    const trustEvents = await prisma.event.findMany({
      where: {
        aggregateId: id,
        OR: [
          { eventType: EVENT_TYPES.TRUST_SCORE_UPDATED },
          { eventType: EVENT_TYPES.BACKHAUL_ACCEPTED },
          { eventType: EVENT_TYPES.OVERLOAD_DETECTED },
          { eventType: EVENT_TYPES.CHECKPOINT_LOGGED },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    
    // Calculate trend
    let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    let lastUpdatedAt: string | null = null;
    
    if (trustEvents.length > 0) {
      lastUpdatedAt = trustEvents[0].createdAt.toISOString();
      
      if (trustEvents.length >= 10) {
        const recent10 = trustEvents.slice(0, 10);
        const older = trustEvents.slice(10);
        
        // Count positive vs negative signals in recent vs older
        const recentPositive = recent10.filter(e => 
          e.eventType === EVENT_TYPES.BACKHAUL_ACCEPTED || 
          e.eventType === EVENT_TYPES.CHECKPOINT_LOGGED
        ).length;
        const recentNegative = recent10.filter(e => 
          e.eventType === EVENT_TYPES.OVERLOAD_DETECTED
        ).length;
        
        const olderPositive = older.filter(e => 
          e.eventType === EVENT_TYPES.BACKHAUL_ACCEPTED || 
          e.eventType === EVENT_TYPES.CHECKPOINT_LOGGED
        ).length;
        const olderNegative = older.filter(e => 
          e.eventType === EVENT_TYPES.OVERLOAD_DETECTED
        ).length;
        
        const recentScore = recentPositive - recentNegative;
        const olderScore = olderPositive - olderNegative;
        
        if (recentScore > olderScore) {
          trend = 'IMPROVING';
        } else if (recentScore < olderScore) {
          trend = 'DECLINING';
        } else {
          trend = 'STABLE';
        }
      }
    }
    
    return reply.send({
      success: true,
      data: {
        driverId: driver.id,
        trustScore: driver.trustScore ? driver.trustScore.toNumber() : 50,
        trustTier: driver.trustTier,
        kycTier: driver.kycTier,
        recentSignals: trustEvents.map(e => ({
          id: e.id,
          eventType: e.eventType,
          createdAt: e.createdAt.toISOString(),
          payload: e.payload
        })),
        complianceProfile: null,
        trend,
        lastUpdatedAt
      }
    });
  });

  // GET /api/v1/behavior/drivers/:id/compliance
  // Change 2: Compliance summary using Driver model and Trip/Incident data
  app.get('/drivers/:id/compliance', {
    preHandler: requireAuth()
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    
    // Role check: DRIVER can only view their own
    if (user?.role === ROLES.DRIVER && user?.entityId !== id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only view own compliance data' }
      });
    }
    
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        onTimeRate: true,
        deviationRate: true,
        cancellationRate: true,
        incidentCount90d: true,
        totalTripsCompleted: true,
      }
    });
    
    if (!driver) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
      });
    }
    
    const tripsCompleted = await prisma.trip.count({
      where: { driverId: id, status: 'DELIVERED' }
    });
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const incidentsLast90d = await prisma.incident.count({
      where: {
        trip: { driverId: id },
        createdAt: { gte: ninetyDaysAgo }
      }
    });
    
    return reply.send({
      success: true,
      data: {
        driverId: driver.id,
        onTimeRate: driver.onTimeRate ? driver.onTimeRate.toNumber() : 0,
        deviationRate: driver.deviationRate ? driver.deviationRate.toNumber() : 0,
        cancellationRate: driver.cancellationRate ? driver.cancellationRate.toNumber() : 0,
        tripsCompleted,
        incidentsLast90d,
        complianceScore: Math.round(
          (driver.onTimeRate ? driver.onTimeRate.toNumber() * 0.4 : 0) +
          ((100 - (driver.deviationRate ? driver.deviationRate.toNumber() : 0)) * 0.3) +
          ((100 - (driver.cancellationRate ? driver.cancellationRate.toNumber() : 0)) * 0.3)
        )
      }
    });
  });

  // POST /api/v1/behavior/drivers/:id/compliance/update
  // Change 3: Update compliance and recalculate score
  app.post('/drivers/:id/compliance/update', {
    preHandler: requireRole([ROLES.OPS_ADMIN])
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      hoursOfServiceViolations?: number;
      safetyTrainingCompleted?: boolean;
      licenseValid?: boolean;
      vehicleInspectionPassed?: boolean;
      notes?: string;
    };
    
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!driver) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
      });
    }
    
    // Calculate new compliance score
    let complianceScore = 0;
    if (body.licenseValid) complianceScore += 30;
    if (body.vehicleInspectionPassed) complianceScore += 25;
    if (body.safetyTrainingCompleted) complianceScore += 25;
    if (body.hoursOfServiceViolations) {
      complianceScore -= body.hoursOfServiceViolations * 5;
    }
    complianceScore = Math.max(0, Math.min(100, complianceScore));
    
    await prisma.driver.update({
      where: { id },
      data: { updatedAt: new Date() }
    });
    
    // Emit COMPLIANCE_UPDATE event
    await prisma.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'COMPLIANCE_UPDATE',
        aggregateId: id,
        aggregateType: 'DRIVER',
        actorId: request.user?.sub || 'SYSTEM',
        actorRole: request.user?.role || 'OPS_ADMIN',
        strategyVersionId: 'default',
        payload: {
          complianceScore,
          hoursOfServiceViolations: body.hoursOfServiceViolations || 0,
          safetyTrainingCompleted: body.safetyTrainingCompleted || false,
          licenseValid: body.licenseValid || false,
          vehicleInspectionPassed: body.vehicleInspectionPassed || false,
          notes: body.notes
        }
      }
    });
    
    return reply.send({
      success: true,
      data: {
        driverId: id,
        complianceScore,
        updatedAt: new Date().toISOString()
      }
    });
  });

  // GET /api/v1/behavior/drivers/:id/incentives
  // Change 4: Get driver incentives from DriverEarning
  app.get('/drivers/:id/incentives', {
    preHandler: requireAuth()
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    
    // Role check: DRIVER can only view their own
    if (user?.role === ROLES.DRIVER && user?.entityId !== id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only view own incentives' }
      });
    }
    
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!driver) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
      });
    }
    
    const incentives = await prisma.driverEarning.findMany({
      where: {
        driverId: id,
        earningType: {
          in: ['ON_TIME_BONUS', 'BACKHAUL_BONUS', 'PERFECT_WEEK', 'CHECKPOINT_BONUS']
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const totalEarnedEtb = incentives.reduce((sum, i) => sum + i.amountEtb, 0);
    
    return reply.send({
      success: true,
      data: {
        driverId: id,
        incentives: incentives.map(i => ({
          id: i.id,
          earningType: i.earningType,
          amountEtb: i.amountEtb,
          status: i.status,
          tripId: i.tripId,
          loadId: i.loadId,
          description: i.description,
          createdAt: i.createdAt.toISOString()
        })),
        totalEarnedEtb
      }
    });
  });

  // POST /api/v1/behavior/drivers/:id/shift
  // Change 5: Update driver shift times
  app.post('/drivers/:id/shift', {
    preHandler: requireAuth()
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    const body = request.body as {
      shiftDays: string[];
      shiftStartTime: string;
      shiftEndTime: string;
    };
    
    // Role check: DRIVER can only update own shift
    if (user?.role === ROLES.DRIVER && user?.entityId !== id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only update own shift' }
      });
    }
    
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!driver) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' }
      });
    }
    
    // Validate HH:MM format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.shiftStartTime) || !timeRegex.test(body.shiftEndTime)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Time must be in HH:MM format' }
      });
    }
    
    // Parse times and set for today
    const today = new Date();
    const [startHour, startMin] = body.shiftStartTime.split(':').map(Number);
    const [endHour, endMin] = body.shiftEndTime.split(':').map(Number);
    
    const shiftStartsAt = new Date(today);
    shiftStartsAt.setHours(startHour, startMin, 0, 0);
    
    const shiftEndsAt = new Date(today);
    shiftEndsAt.setHours(endHour, endMin, 0, 0);
    
    if (shiftEndsAt <= shiftStartsAt) {
      shiftEndsAt.setDate(shiftEndsAt.getDate() + 1);
    }
    
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        shiftStartsAt,
        shiftEndsAt,
        updatedAt: new Date()
      }
    });
    
    return reply.send({
      success: true,
      data: {
        driverId: updatedDriver.id,
        shiftStartsAt: updatedDriver.shiftStartsAt?.toISOString(),
        shiftEndsAt: updatedDriver.shiftEndsAt?.toISOString(),
        note: 'shiftDays not stored - no field in schema'
      }
    });
  });

  // POST /api/v1/behavior/rating/submit
  app.post('/rating/submit', {
    preHandler: requireAuth(),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const body = RatingSchema.parse(request.body);
    const userId = request.user?.sub;
    const userRole = request.user?.role;
    if (!userId || !userRole) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const load = await prisma.load.findUnique({ where: { id: body.loadId } });
    if (!load || load.status !== 'COMPLETED') {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_LOAD_STATUS', message: 'Load must be completed to submit a rating' } });
    }
    const isOrderer = load.ordererId === userId;
    const assignment = await prisma.assignment.findFirst({ where: { loadId: body.loadId, driverId: userId, status: 'COMPLETED' } });
    const isDriver = !!assignment;
    if (!isOrderer && !isDriver) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'User not associated with this load' } });
    }
    const existingRating = await prisma.event.findFirst({ where: { eventType: 'RATING_SUBMITTED', aggregateId: body.loadId, actorId: userId } });
    if (existingRating) {
      return reply.status(409).send({ success: false, error: { code: 'ALREADY_RATED', message: 'You have already rated this load' } });
    }
    await prisma.$transaction(async (tx) => {
      await tx.event.create({
        data: {
          id: generateId('evt'),
          eventType: 'RATING_SUBMITTED',
          aggregateId: body.loadId,
          aggregateType: 'LOAD',
          actorId: userId,
          actorRole: userRole,
          payload: { rating: body.rating, comment: body.comment },
          strategyVersionId: 'default',
        },
      });
      return reply.send({ success: true, data: { loadId: body.loadId, rating: body.rating } });
    });
  });

  // GET /api/v1/behavior/rating/load/:loadId
  app.get('/rating/load/:loadId', {
    preHandler: requireAuth(),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const { loadId } = request.params as { loadId: string };
    const userId = request.user?.sub;
    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Load not found' } });
    }
    const ratings = await prisma.event.findMany({ where: { eventType: 'RATING_SUBMITTED', aggregateId: loadId } });
    if (ratings.length < 2) {
      return reply.status(200).send({ success: true, data: { message: 'Ratings not yet available, waiting for counterparty' } });
    }
    const publicRatings = ratings.map(r => ({
      rating: (r.payload as any).rating,
      comment: (r.payload as any).comment,
      ratedBy: r.actorId === userId ? 'You' : 'Counterparty',
      createdAt: r.createdAt.toISOString()
    }));
    return reply.send({ success: true, data: publicRatings });
  });

  // GET /api/v1/behavior/history/:entityType/:entityId
  app.get(
    '/history/:entityType/:entityId',
    { preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const query = HistoryQuerySchema.parse(request.query);
      const traces = await getEntityBehaviorHistory(entityId, entityType, query.days);
      const total = traces.length;
      reply.send({
        success: true,
        data: traces.map((t: any) => ({
          id: t.id,
          signalType: t.inputVariables?.signalType,
          value: t.inputVariables?.value,
          createdAt: t.createdAt.toISOString(),
          ethiopianDate: toEthiopianDateString(t.createdAt),
        })),
        pagination: { total, page: 1, limit: total, pages: 1 },
      });
    }
  );

  // GET /api/v1/behavior/corridor/:corridorId/stats
  app.get(
    '/corridor/:corridorId/stats',
    { preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { corridorId } = request.params as { corridorId: string };
      const stats = await getCorridorBehaviorStats(corridorId);
      reply.send({
        success: true,
        data: {
          avgAnomalyScore: stats.avgAnomalyScore,
          totalSignals: stats.totalSignals,
          flaggedEntities: stats.flaggedEntities,
          topAnomalies: stats.topAnomalies.map((a) => ({ ...a, triggeredAt: a.triggeredAt.toISOString() })),
        },
      });
    }
  );
}
