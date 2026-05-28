import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { reportWarehouseWait, getWarehouseQueues } from '../services/warehouse-queue.service.js';

const ReportWarehouseWaitSchema = z.object({
  locationName: z.string(),
  lat: z.number(),
  lng: z.number(),
  zoneId: z.string(),
  currentWaitMin: z.number().int().nonnegative(),
});

export default async function warehouseQueueRoutes(fastify: FastifyInstance) {
  // POST /api/v1/warehouses/queue — DRIVER auth
  fastify.post<{ Body: z.infer<typeof ReportWarehouseWaitSchema> }>(
    '/queue',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request, reply) => {
      try {
        const body = ReportWarehouseWaitSchema.parse(request.body);
        const user = (request as any).user;

        const queueId = await reportWarehouseWait({
          driverId: user.sub,
          locationName: body.locationName,
          lat: body.lat,
          lng: body.lng,
          zoneId: body.zoneId,
          currentWaitMin: body.currentWaitMin,
        });

        return { success: true, data: { queueId } };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'REPORT_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/warehouses/queue — any auth
  fastify.get<{ Querystring: { zoneId?: string } }>(
    '/queue',
    { preHandler: (fastify as any).requireRole(Object.values(ROLES) as string[]) },
    async (request, reply) => {
      try {
        const { zoneId } = request.query;

        const queues = await getWarehouseQueues(zoneId);

        return { success: true, data: queues };
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
