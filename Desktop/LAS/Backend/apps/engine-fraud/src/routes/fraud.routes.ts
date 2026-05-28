import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole, requireAuth } from '@ruit/shared-auth';
import { prisma } from '@ruit/shared-db';
import { toEthiopianDateString } from '@ruit/shared-utils';
import { evaluateFraudRules, reviewFraudFlag, getEntityFraudHistory, getFraudStats } from '../services/fraud.service';

// Zod schemas for validation
const EvaluateFraudSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(['DRIVER', 'FLEET_OWNER', 'ORDERER']),
  triggerType: z.string(),
  triggerData: z.record(z.unknown()),
});

const ReviewFlagSchema = z.object({
  decision: z.enum(['CONFIRMED', 'DISMISSED']),
  notes: z.string(),
});

const ListFlagsQuerySchema = z.object({
  status: z.enum(['OPEN', 'CONFIRMED', 'DISMISSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  entityType: z.enum(['DRIVER', 'FLEET_OWNER', 'ORDERER']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Fraud routes
 */
export async function fraudRoutes(app: FastifyInstance): Promise<void> {
  // Global auth: all fraud routes require a valid token
  app.addHook('preHandler', requireAuth());

  // POST /api/v1/fraud/evaluate
  app.post(
    '/evaluate',
    { preHandler: [requireRole(['SYSTEM', 'OPS_ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const body = EvaluateFraudSchema.parse(request.body);

      const result = await evaluateFraudRules({
        entityId: body.entityId,
        entityType: body.entityType,
        triggerType: body.triggerType,
        triggerData: body.triggerData,
      });

      reply.send({
        success: true,
        data: result,
      });
    }
  );

  // GET /api/v1/fraud/flags
  app.get(
    '/flags',
    { preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN', 'FINANCE_OPS'])] },
    async (request, reply) => {
      const query = ListFlagsQuerySchema.parse(request.query);

      const where: any = {};
      if (query.status) where.status = query.status;
      if (query.severity) where.severity = query.severity;
      if (query.entityType) where.entityType = query.entityType;

      const skip = (query.page - 1) * query.limit;

      const [flags, total] = await Promise.all([
        prisma.fraudFlag.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        prisma.fraudFlag.count({ where }),
      ]);

      // Enhance with entity summary
      const enhancedFlags = await Promise.all(
        flags.map(async (flag: any) => {
          let entity = null;
          if (flag.entityType === 'DRIVER') {
            entity = await prisma.driver.findUnique({
              where: { id: flag.entityId },
              include: { user: { select: { fullName: true, phone: true } } },
            });
          } else if (flag.entityType === 'FLEET_OWNER') {
            entity = await prisma.fleetOwner.findUnique({
              where: { id: flag.entityId },
              include: { user: { select: { fullName: true, phone: true } } },
            });
          } else if (flag.entityType === 'ORDERER') {
            entity = await prisma.orderer.findUnique({
              where: { id: flag.entityId },
              include: { user: { select: { fullName: true, phone: true } } },
            });
          }

          return {
            ...flag,
            createdAt: flag.createdAt.toISOString(),
            ethiopianDate: toEthiopianDateString(flag.createdAt),
            entity: entity
              ? {
                  name: entity.user?.fullName,
                  phone: entity.user?.phone,
                }
              : null,
          };
        })
      );

      reply.send({
        success: true,
        data: enhancedFlags,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          pages: Math.ceil(total / query.limit),
        },
      });
    }
  );

  // GET /api/v1/fraud/flags/:entityId
  app.get(
    '/flags/:entityId',
    { preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { entityId } = request.params as { entityId: string };

      const flags = await getEntityFraudHistory(entityId);

      reply.send({
        success: true,
        data: flags.map((flag: any) => ({
          ...flag,
          createdAt: flag.createdAt.toISOString(),
          ethiopianDate: toEthiopianDateString(flag.createdAt),
        })),
      });
    }
  );

  // PUT /api/v1/fraud/flags/:flagId/review
  app.put(
    '/flags/:flagId/review',
    { preHandler: [requireRole(['OPS_ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const { flagId } = request.params as { flagId: string };
      const body = ReviewFlagSchema.parse(request.body);

      // Extract reviewer info from JWT
      const user = (request as any).user || {};
      const reviewedBy = user.userId || 'UNKNOWN';

      await reviewFraudFlag({
        flagId,
        reviewedBy,
        decision: body.decision,
        notes: body.notes,
      });

      reply.send({
        success: true,
        data: { reviewed: true },
      });
    }
  );

  // GET /api/v1/fraud/stats
  app.get(
    '/stats',
    { preHandler: [requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN', 'FINANCE_OPS'])] },
    async (request, reply) => {
      const stats = await getFraudStats();

      reply.send({
        success: true,
        data: stats,
      });
    }
  );
}
