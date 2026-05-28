import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import {
  createRoadAlert,
  confirmRoadAlert,
  getActiveRoadAlerts,
} from '../services/road-alert.service.js';

const CreateRoadAlertSchema = z.object({
  corridorId: z.string().optional(),
  alertType: z.enum([
    'POLICE_ACTIVE',
    'WEIGHBRIDGE_STRICT',
    'ROAD_DAMAGE',
    'FLOODING',
    'FUEL_EMPTY',
    'ACCIDENT',
    'ROAD_CLOSED',
    'CHECKPOINT_CLOSED',
  ]),
  severity: z.number().min(1).max(5),
  lat: z.number(),
  lng: z.number(),
  description: z.string().optional(),
});

const ConfirmRoadAlertSchema = z.object({
  alertId: z.string(),
});

export default async function roadAlertRoutes(fastify: FastifyInstance) {
  // POST /api/v1/alerts/road — DRIVER auth
  fastify.post<{ Body: z.infer<typeof CreateRoadAlertSchema> }>(
    '/road',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request, reply) => {
      try {
        const body = CreateRoadAlertSchema.parse(request.body);
        const user = (request as any).user;

        const alertId = await createRoadAlert({
          reportedByUserId: user.sub,
          corridorId: body.corridorId,
          alertType: body.alertType as any,
          severity: (body.severity || 'MEDIUM') as string,
          lat: body.lat,
          lng: body.lng,
          description: body.description,
        });

        return { success: true, data: { alertId } };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        };
      }
    }
  );

  // POST /api/v1/alerts/road/:id/confirm — DRIVER auth
  fastify.post<{ Params: { id: string } }>(
    '/road/:id/confirm',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const user = (request as any).user;

        const result = await confirmRoadAlert({
          alertId: id,
          confirmingDriverId: user.sub,
        });

        return { success: true, data: result };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'CONFIRMATION_ERROR', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/alerts/road — any auth
  fastify.get<{ Querystring: { corridorId?: string } }>(
    '/road',
    { preHandler: (fastify as any).requireRole(
      Object.values(ROLES) as string[]
    ) },
    async (request, reply) => {
      try {
        const { corridorId } = request.query;

        const alerts = await getActiveRoadAlerts(corridorId);

        return { success: true, data: alerts };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_ERROR', message: error.message },
        };
      }
    }
  );
}
