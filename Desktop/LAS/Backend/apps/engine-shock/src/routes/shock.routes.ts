import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import {
  getActiveShockEvent,
  activateShockMode,
  deactivateShockMode,
  getShockHistory,
  updateAutoTriggerConfig,
} from '../services/shock.service.js';

const OPS_ADMIN_ROLES = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN];
const VIEWER_ROLES = [
  ROLES.OPS_ADMIN,
  ROLES.OPS_VIEWER,
  ROLES.SUPER_ADMIN,
  ROLES.FINANCE_OPS,
];

const ShockTypeSchema = z.enum([
  'FUEL_SHORTAGE',
  'ROAD_CLOSURE',
  'POLITICAL',
  'WEATHER',
  'PAYMENT_CRISIS',
  'MANUAL',
]);

const ActivateShockSchema = z.object({
  shockType: ShockTypeSchema,
  severity: z.number().int().min(1).max(4),
  affectedCorridors: z.array(z.string()),
  description: z.string().min(1),
});

const AutoTriggerConfigSchema = z.object({
  metric: z.string(),
  threshold: z.number(),
  severity: z.number().int().min(1).max(4),
});

export default async function shockRoutes(fastify: FastifyInstance) {
  // GET /api/v1/shock/status
  // Auth: ANY authenticated role
  fastify.get('/status', async (request, reply) => {
    const activeEvent = await getActiveShockEvent();
    if (!activeEvent) {
      return {
        success: true,
        data: {
          active: false,
          severity: 0,
        },
      };
    }
    return {
      success: true,
      data: {
        active: true,
        ...activeEvent,
      },
    };
  });

  // POST /api/v1/shock/activate
  // Auth: OPS_ADMIN, SUPER_ADMIN only
  fastify.post<{ Body: z.infer<typeof ActivateShockSchema> }>(
    '/activate',
    { preHandler: (fastify as any).requireRole(OPS_ADMIN_ROLES) },
    async (request, reply) => {
      const body = ActivateShockSchema.parse(request.body);

      const event = await activateShockMode({
        shockType: body.shockType,
        severity: body.severity,
        affectedCorridors: body.affectedCorridors,
        description: body.description,
        triggered_by: 'MANUAL',
        triggered_by_user_id: (request as any).user?.sub,
      });

      return {
        success: true,
        data: event,
      };
    }
  );

  // POST /api/v1/shock/deactivate/:id
  // Auth: OPS_ADMIN, SUPER_ADMIN only
  fastify.post<{ Params: { id: string } }>(
    '/deactivate/:id',
    { preHandler: (fastify as any).requireRole(OPS_ADMIN_ROLES) },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request as any).user?.sub || 'SYSTEM';

      await deactivateShockMode(id, userId);

      return { success: true };
    }
  );

  // GET /api/v1/shock/history
  // Auth: OPS_ADMIN, OPS_VIEWER, SUPER_ADMIN
  fastify.get('/history', { preHandler: (fastify as any).requireRole(VIEWER_ROLES) }, async (request, reply) => {
    const history = await getShockHistory(50);
    return {
      success: true,
      data: history,
    };
  });

  // POST /api/v1/shock/auto-triggers/config
  // Auth: SUPER_ADMIN only
  fastify.post<{ Body: z.infer<typeof AutoTriggerConfigSchema> }>(
    '/auto-triggers/config',
    { preHandler: (fastify as any).requireRole([ROLES.SUPER_ADMIN]) },
    async (request, reply) => {
      const body = AutoTriggerConfigSchema.parse(request.body);

      await updateAutoTriggerConfig(body.metric, body.threshold, body.severity);

      return {
        success: true,
        data: {
          updated_metric: body.metric,
          new_threshold: body.threshold,
        },
      };
    }
  );
}

