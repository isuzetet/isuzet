/**
 * RUIT CBE — Engine 10 Strategy Routes
 * All strategy version endpoints per PRD Section 8.2
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { prisma } from '@ruit/shared-db';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';
import {
  getActiveStrategy,
  validateWeightSet,
  emitEvent,
  getActiveStrategyId
} from '../services/strategy.service.js';
import { calculateMarketMultiplier } from '../services/market-pricing.service.js';

// Helper to format response with dates
function formatStrategyResponse(version: any) {
  return {
    id: version.id,
    version_name: version.versionName,
    optimizationMode: version.optimizationMode,
    scope: version.scope,
    weightSet: version.weightSet as Record<string, unknown>,
    thresholdSet: version.thresholdSet as Record<string, unknown>,
    pricingParams: version.pricingParams as Record<string, unknown>,
    acceptance_window_minutes: version.acceptanceWindowMinutes,
    max_assignment_attempts: version.maxAssignmentAttempts,
    isActive: version.isActive,
    ab_test_group: version.abTestGroup,
    ab_traffic_pct: version.abTrafficPct,
    activated_at: version.activatedAt?.toISOString() || null,
    deprecated_at: version.deprecatedAt?.toISOString() || null,
    createdAt: version.createdAt.toISOString(),
    created_by: version.createdBy,
    // New fields
    highDemandThreshold: Number(version.highDemandThreshold),
    lowDemandThreshold: Number(version.lowDemandThreshold),
    demandSurchargeRate: Number(version.demandSurchargeRate),
    supplyDiscountRate: Number(version.supplyDiscountRate),
    maxDemandMultiplier: Number(version.maxDemandMultiplier),
    minDemandMultiplier: Number(version.minDemandMultiplier),
    floorPricePerKmPerQuintal: Number(version.floorPricePerKmPerQuintal),
    ceilingPricePerKmPerQuintal: Number(version.ceilingPricePerKmPerQuintal),
    cancellationCompensationRatePerKm: Number(version.cancellationCompensationRatePerKm),
    checkpointFeeReimbursementEnabled: version.checkpointFeeReimbursementEnabled,
    seasonalPricingRules: version.seasonalPricingRules as Record<string, number>,
  };
}

export default async function strategyRoutes(app: FastifyInstance) {
  // GET /api/v1/strategy/versions
  // Auth: OPS_ADMIN, OPS_VIEWER, SUPER_ADMIN
  app.get('/versions', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN]),
    schema: {
      querystring: T.Object({
        page: T.Optional(T.Number({ default: 1 })),
        limit: T.Optional(T.Number({ default: 20 }))
      })
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as { page: number; limit: number };
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      prisma.strategyVersion.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.strategyVersion.count()
    ]);

    const pages = Math.ceil(total / limit);

    return {
      success: true,
      data: versions.map(formatStrategyResponse),
      pagination: {
        total,
        page,
        limit,
        pages
      }
    };
  });

  // POST /api/v1/strategy/versions
  // Auth: SUPER_ADMIN only
  app.post('/versions', {
    preHandler: (app as any).requireRole([ROLES.SUPER_ADMIN]),
    schema: {
      body: T.Object({
        version_name: T.String({ minLength: 3, maxLength: 100 }),
        optimizationMode: T.Union([
          T.Literal('GROWTH'),
          T.Literal('DENSITY'),
          T.Literal('EFFICIENCY'),
          T.Literal('SHOCK')
        ]),
        scope: T.Optional(T.String({ default: 'GLOBAL' })),
        weightSet: T.Record(T.String(), T.Number()),
        thresholdSet: T.Record(T.String(), T.Unknown()),
        pricingParams: T.Record(T.String(), T.Unknown()),
        acceptance_window_minutes: T.Optional(T.Number({ default: 15 })),
        max_assignment_attempts: T.Optional(T.Number({ default: 5, maximum: 10 })),
        ab_test_group: T.Optional(T.Union([T.Literal('A'), T.Literal('B'), T.Null()])),
        ab_traffic_pct: T.Optional(T.Number({ default: 0, minimum: 0, maximum: 100 })),
        // New fields
        highDemandThreshold: T.Optional(T.Number({ default: 1.5 })),
        lowDemandThreshold: T.Optional(T.Number({ default: 0.5 })),
        demandSurchargeRate: T.Optional(T.Number({ default: 0.15 })),
        supplyDiscountRate: T.Optional(T.Number({ default: 0.10 })),
        maxDemandMultiplier: T.Optional(T.Number({ default: 1.5 })),
        minDemandMultiplier: T.Optional(T.Number({ default: 0.8 })),
        floorPricePerKmPerQuintal: T.Optional(T.Number({ default: 0.5 })),
        ceilingPricePerKmPerQuintal: T.Optional(T.Number({ default: 5.0 })),
        cancellationCompensationRatePerKm: T.Optional(T.Number({ default: 2.0 })),
        checkpointFeeReimbursementEnabled: T.Optional(T.Boolean({ default: true })),
        seasonalPricingRules: T.Optional(T.Any({ default: {} })),
      })
    }
  }, async (request, reply) => {
    const body = request.body as {
      version_name: string;
      optimizationMode: 'GROWTH' | 'DENSITY' | 'EFFICIENCY' | 'SHOCK';
      scope?: string;
      weightSet: Record<string, number>;
      thresholdSet: Record<string, unknown>;
      pricingParams: Record<string, unknown>;
      acceptance_window_minutes?: number;
      max_assignment_attempts?: number;
      ab_test_group?: 'A' | 'B' | null;
      ab_traffic_pct?: number;
      // New fields
      highDemandThreshold?: number;
      lowDemandThreshold?: number;
      demandSurchargeRate?: number;
      supplyDiscountRate?: number;
      maxDemandMultiplier?: number;
      minDemandMultiplier?: number;
      floorPricePerKmPerQuintal?: number;
      ceilingPricePerKmPerQuintal?: number;
      cancellationCompensationRatePerKm?: number;
      checkpointFeeReimbursementEnabled?: boolean;
      seasonalPricingRules?: Record<string, number>;
    };

    // Validate weightSet sums to 1.0
    if (!validateWeightSet(body.weightSet)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'weightSet values must sum to approximately 1.0 (within 0.001 tolerance)'
        }
      });
    }

    const user = (request as any).user;

    const version = await prisma.strategyVersion.create({
      data: {
        id: `str_${await import('ulid').then(m => m.ulid())}`,
        versionName: body.version_name,
        optimizationMode: body.optimizationMode,
        scope: body.scope || 'GLOBAL',
        weightSet: body.weightSet as any,
        thresholdSet: body.thresholdSet as any,
        pricingParams: body.pricingParams as any,
        acceptanceWindowMinutes: body.acceptance_window_minutes || 15,
        maxAssignmentAttempts: body.max_assignment_attempts || 5,
        abTestGroup: body.ab_test_group ?? null,
        abTrafficPct: body.ab_traffic_pct || 0,
        isActive: false,
        createdBy: user.sub,
        // New fields
        highDemandThreshold: body.highDemandThreshold,
        lowDemandThreshold: body.lowDemandThreshold,
        demandSurchargeRate: body.demandSurchargeRate,
        supplyDiscountRate: body.supplyDiscountRate,
        maxDemandMultiplier: body.maxDemandMultiplier,
        minDemandMultiplier: body.minDemandMultiplier,
        floorPricePerKmPerQuintal: body.floorPricePerKmPerQuintal,
        ceilingPricePerKmPerQuintal: body.ceilingPricePerKmPerQuintal,
        cancellationCompensationRatePerKm: body.cancellationCompensationRatePerKm,
        checkpointFeeReimbursementEnabled: body.checkpointFeeReimbursementEnabled,
        seasonalPricingRules: body.seasonalPricingRules as any,
      }
    });

    // Emit STRATEGY_VERSION_CHANGED event
    await emitEvent({
      eventType: EVENT_TYPES.STRATEGY_VERSION_CHANGED,
      aggregateId: version.id,
      aggregateType: 'STRATEGY_VERSION',
      actorId: user.sub,
      actorRole: user.role,
      payload: {
        action: 'CREATED',
        version_name: body.version_name,
        optimizationMode: body.optimizationMode,
        scope: body.scope
      }
    });

    return {
      success: true,
      data: {
        id: version.id,
        version_name: version.versionName,
        createdAt: version.createdAt.toISOString()
      }
    };
  });

  // PUT /api/v1/strategy/versions/:id/activate
  // Auth: SUPER_ADMIN only
  app.put('/versions/:id/activate', {
    preHandler: (app as any).requireRole([ROLES.SUPER_ADMIN]),
    schema: {
      params: T.Object({
        id: T.String()
      }),
      body: T.Object({
        scope: T.String()
      })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { scope } = request.body as { scope: string };
    const user = (request as any).user;

    // Check if version exists
    const versionToActivate = await prisma.strategyVersion.findUnique({
      where: { id }
    });

    if (!versionToActivate) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: 'Strategy version not found'
        }
      });
    }

    // Transaction: deactivate all active versions in same scope, activate this one
    const [activatedVersion, oldVersionId] = await prisma.$transaction(async (tx: any) => {
      // Find currently active version in this scope
      const currentlyActive = await tx.strategyVersion.findFirst({
        where: { isActive: true, scope }
      });

      // Deactivate all active versions in scope
      await tx.strategyVersion.updateMany({
        where: { isActive: true, scope },
        data: {
          isActive: false,
          deprecatedAt: new Date()
        }
      });

      // Activate this version
      const activated = await tx.strategyVersion.update({
        where: { id },
        data: {
          isActive: true,
          activatedAt: new Date(),
          scope
        }
      });

      return [activated, currentlyActive?.id || null];
    });

    // Invalidate Redis cache
    const { invalidateCache } = await import('@ruit/shared-utils');
    await invalidateCache(`cache:strategy:active:${scope}`);
    await invalidateCache('cache:strategy:active:GLOBAL');

    // Emit STRATEGY_VERSION_CHANGED event
    await emitEvent({
      eventType: EVENT_TYPES.STRATEGY_VERSION_CHANGED,
      aggregateId: activatedVersion.id,
      aggregateType: 'STRATEGY_VERSION',
      actorId: user.sub,
      actorRole: user.role,
      payload: {
        action: 'ACTIVATED',
        old_version_id: oldVersionId,
        new_version_id: activatedVersion.id,
        scope
      }
    });

    return {
      success: true,
      data: {
        id: activatedVersion.id,
        version_name: activatedVersion.versionName,
        activated_at: activatedVersion.activatedAt?.toISOString()
      }
    };
  });

  // GET /api/v1/strategy/versions/:id
  // Auth: OPS_ADMIN, OPS_VIEWER, SUPER_ADMIN
  app.get('/versions/:id', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN]),
    schema: {
      params: T.Object({
        id: T.String()
      })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const version = await prisma.strategyVersion.findUnique({
      where: { id }
    });

    if (!version) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: 'Strategy version not found'
        }
      });
    }

    return {
      success: true,
      data: formatStrategyResponse(version)
    };
  });

  // GET /api/v1/strategy/pricing-explanation/:corridorId
  app.get(
    '/pricing-explanation/:corridorId',
    { preHandler: (app as any).requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { corridorId } = request.params as { corridorId: string };

      const strategy = await prisma.strategyVersion.findFirst({ where: { isActive: true } });
      if (!strategy) {
        return reply.status(500).send({ success: false, error: { code: 'NO_ACTIVE_STRATEGY', message: 'No active strategy found' } });
      }

      const baseRatePerKmPerQuintal = Number(strategy.floorPricePerKmPerQuintal); // Using floor as base for explanation

      const { multiplier: currentMultiplier, reason, seasonalMultiplier } = await calculateMarketMultiplier(corridorId, strategy);

      const effectiveRate = baseRatePerKmPerQuintal * currentMultiplier;

      return reply.send({
        success: true,
        data: {
          baseRatePerKmPerQuintal: parseFloat(baseRatePerKmPerQuintal.toFixed(2)),
          currentMultiplier: parseFloat(currentMultiplier.toFixed(2)),
          reason,
          shockActive: false, // Assuming shock is handled within market multiplier or separate
          seasonalAdjustment: parseFloat(seasonalMultiplier.toFixed(2)),
          effectiveRate: parseFloat(effectiveRate.toFixed(2)),
        },
      });
    }
  );

}
