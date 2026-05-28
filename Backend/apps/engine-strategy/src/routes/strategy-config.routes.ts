/**
 * RUIT CBE — Strategy Config Routes (Phase 3)
 * OPS Admin endpoints for managing StrategyConfig records
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { prisma } from '@ruit/shared-db';
import { ROLES } from '@ruit/shared-types';
import { getConfig, invalidateConfigCache, DEFAULT_CONFIG, type StrategyConfig } from '@ruit/shared-db';

export default async function strategyConfigRoutes(app: FastifyInstance) {
  // GET /api/v1/strategy/config/active
  // Auth: any authenticated role
  // Returns: the currently active StrategyConfig (calls getConfig())
  app.get('/config/active', {
    preHandler: (app as any).requireAuth,
    schema: {
      response: {
        200: T.Object({
          success: T.Boolean(),
          data: T.Unknown()
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const config = await getConfig();
    return { success: true, data: config };
  });

  // GET /api/v1/strategy/config/history
  // Auth: OPS_ADMIN or SUPER_ADMIN role
  // Query params: limit (default 20), offset (default 0)
  // Returns: list of all StrategyConfig records ordered by activatedAt DESC
  app.get('/config/history', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
    schema: {
      querystring: T.Object({
        limit: T.Optional(T.Number({ default: 20, minimum: 1, maximum: 100 })),
        offset: T.Optional(T.Number({ default: 0, minimum: 0 }))
      }),
      response: {
        200: T.Object({
          success: T.Boolean(),
          data: T.Object({
            configs: T.Array(T.Unknown()),
            total: T.Number()
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = 20, offset = 0 } = request.query as { limit: number; offset: number };

    const [configs, total] = await Promise.all([
      prisma.strategyConfig.findMany({
        orderBy: { activatedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.strategyConfig.count()
    ]);

    return {
      success: true,
      data: {
        configs: configs.map((c: any) => ({
          id: c.id,
          versionName: c.versionName,
          configJson: c.configJson,
          isActive: c.isActive,
          activatedAt: c.activatedAt?.toISOString() || null,
          createdByUserId: c.createdByUserId,
          notes: c.notes,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString()
        })),
        total
      }
    };
  });

  // POST /api/v1/strategy/config
  // Auth: OPS_ADMIN role only
  // Body: { versionName, configJson, activateNow, notes }
  // Creates a new StrategyConfig record
  // If activateNow is true: set isActive = true on this record AND set isActive = false on all other records
  app.post('/config', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN]),
    schema: {
      body: T.Object({
        versionName: T.String({ minLength: 1, maxLength: 100 }),
        configJson: T.Record(T.String(), T.Unknown()),
        activateNow: T.Boolean(),
        notes: T.Optional(T.String())
      }),
      response: {
        200: T.Object({
          success: T.Boolean(),
          data: T.Object({
            id: T.String(),
            versionName: T.String(),
            isActive: T.Boolean()
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      versionName: string;
      configJson: Record<string, unknown>;
      activateNow: boolean;
      notes?: string;
    };

    const user = (request as any).user;
    const { ulid } = await import('ulid');

    let result: any;

    if (body.activateNow) {
      // Transaction: deactivate all others, create and activate this one
      result = await prisma.$transaction(async (tx: any) => {
        // Deactivate all active configs
        await tx.strategyConfig.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        });

        // Create and activate the new config
        const created = await tx.strategyConfig.create({
          data: {
            id: ulid(),
            versionName: body.versionName,
            configJson: body.configJson,
            isActive: true,
            activatedAt: new Date(),
            createdByUserId: user.sub,
            notes: body.notes
          }
        });

        return created;
      });

      // Invalidate cache after activation
      invalidateConfigCache();
    } else {
      // Just create the config, don't activate
      result = await prisma.strategyConfig.create({
        data: {
          id: ulid(),
          versionName: body.versionName,
          configJson: body.configJson as any,
          isActive: false,
          activatedAt: null,
          createdByUserId: user.sub,
          notes: body.notes
        }
      });
    }

    return {
      success: true,
      data: {
        id: result.id,
        versionName: result.versionName,
        isActive: result.isActive
      }
    };
  });

  // POST /api/v1/strategy/config/:id/activate
  // Auth: OPS_ADMIN or SUPER_ADMIN role
  // Activates the specified config version
  // Sets isActive = false on all others
  app.post('/config/:id/activate', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
    schema: {
      params: T.Object({
        id: T.String()
      }),
      response: {
        200: T.Object({
          success: T.Boolean(),
          data: T.Object({
            activated: T.Boolean(),
            versionName: T.String()
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    // Check if config exists
    const configToActivate = await prisma.strategyConfig.findUnique({
      where: { id }
    });

    if (!configToActivate) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: 'Strategy config not found'
        }
      });
    }

    // Transaction: deactivate all others, activate this one
    await prisma.$transaction(async (tx: any) => {
      // Deactivate all active configs
      await tx.strategyConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Activate the specified config
      await tx.strategyConfig.update({
        where: { id },
        data: {
          isActive: true,
          activatedAt: new Date()
        }
      });
    });

    // Invalidate cache after activation
    invalidateConfigCache();

    return {
      success: true,
      data: {
        activated: true,
        versionName: configToActivate.versionName
      }
    };
  });

  // GET /api/v1/strategy/config/defaults
  // Auth: OPS_ADMIN or SUPER_ADMIN role
  // Returns the DEFAULT_CONFIG object
  app.get('/config/defaults', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
    schema: {
      response: {
        200: T.Object({
          success: T.Boolean(),
          data: T.Unknown()
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      success: true,
      data: DEFAULT_CONFIG
    };
  });
}
