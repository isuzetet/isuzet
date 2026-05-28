import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import {
  createMaintenanceLog,
  getMaintenanceLogs,
  getOverdueMaintenance,
} from '../services/maintenance.service.js';

const CreateMaintenanceLogSchema = z.object({
  truckId: z.string(),
  serviceType: z.enum([
    'OIL_CHANGE',
    'TYRE_ROTATION',
    'BRAKE_SERVICE',
    'BRAKE_CHECK',
    'FULL_SERVICE',
    'ENGINE_SERVICE',
    'ENGINE_REPAIR',
    'BODY_REPAIR',
    'REPAIR',
    'OTHER',
  ]),
  description: z.string().optional(),
  costCents: z.number().int().nonnegative().optional(),
  servicedAt: z.string().datetime(),
  nextServiceDue: z.string().datetime().optional(),
  nextServiceKm: z.number().int().positive().optional(),
  mechanic: z.string().optional(),
  notes: z.string().optional(),
});

export default async function maintenanceRoutes(fastify: FastifyInstance) {
  // POST /api/v1/fleet/trucks/:truckId/maintenance — FLEET_OWNER auth
  fastify.post<{ Params: { truckId: string }; Body: z.infer<typeof CreateMaintenanceLogSchema> }>(
    '/trucks/:truckId/maintenance',
    { preHandler: (fastify as any).requireRole([ROLES.FLEET_OWNER]) },
    async (request, reply) => {
      try {
        const { truckId } = request.params;
        const body = CreateMaintenanceLogSchema.parse(request.body);
        const user = (request as any).user;

        const logId = await createMaintenanceLog({
          fleetOwnerId: user.entity_id,
          truckId,
          serviceType: body.serviceType as any,
          description: body.description,
          costCents: body.costCents,
          servicedAt: new Date(body.servicedAt),
          nextServiceDue: body.nextServiceDue ? new Date(body.nextServiceDue) : undefined,
          nextServiceKm: body.nextServiceKm,
          mechanic: body.mechanic,
          notes: body.notes,
        });

        return { success: true, data: { logId } };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'CREATION_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/fleet/trucks/:truckId/maintenance — FLEET_OWNER auth
  fastify.get<{ Params: { truckId: string } }>(
    '/trucks/:truckId/maintenance',
    { preHandler: (fastify as any).requireRole([ROLES.FLEET_OWNER]) },
    async (request, reply) => {
      try {
        const { truckId } = request.params;

        const logs = await getMaintenanceLogs(truckId);

        return { success: true, data: logs };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/fleet/maintenance/overdue — FLEET_OWNER auth
  fastify.get<{}>(
    '/maintenance/overdue',
    { preHandler: (fastify as any).requireRole([ROLES.FLEET_OWNER]) },
    async (request, reply) => {
      try {
        const user = (request as any).user;

        const overdue = await getOverdueMaintenance(user.entity_id);

        return { success: true, data: overdue };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );
}
