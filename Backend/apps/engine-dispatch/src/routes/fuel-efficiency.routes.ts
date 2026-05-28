import { FastifyInstance } from 'fastify';
import { prisma } from '@ruit/shared-db';
import { fuelEfficiencyService } from '../services/fuel-efficiency.service.js';

export default async function fuelEfficiencyRoutes(fastify: FastifyInstance) {
  // POST /api/v1/fuel/log — Log a fuel fill-up
  fastify.post(
    '/log',
    { preHandler: (fastify as any).requireAuth },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const log = await fuelEfficiencyService.logFuelFill(body);
        return reply.status(201).send({ success: true, data: log });
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'LOG_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/fuel/trucks/:truckId/summary — Get truck efficiency summary
  fastify.get(
    '/trucks/:truckId/summary',
    { preHandler: (fastify as any).requireAuth },
    async (request, reply) => {
      try {
        const { truckId } = request.params as any;
        const summary = await fuelEfficiencyService.getTruckEfficiencySummary(
          truckId
        );
        return reply.send({ success: true, data: summary });
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/fuel/fleet/:fleetOwnerId/summary — Get fleet efficiency summary
  fastify.get(
    '/fleet/:fleetOwnerId/summary',
    { preHandler: (fastify as any).requireAuth },
    async (request, reply) => {
      try {
        const { fleetOwnerId } = request.params as any;
        const { days } = request.query as any;

        const trucks = await (prisma as any).truck.findMany({
          where: { fleetOwnerId },
          select: { id: true, plateNumber: true },
        });

        const summaries = await Promise.all(
          trucks.map(async (t: any) => ({
            truckId: t.id,
            plateNumber: t.plateNumber,
            ...(await fuelEfficiencyService.getTruckEfficiencySummary(t.id)),
          }))
        );

        return reply.send({ success: true, data: summaries });
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );

  // PUT /api/v1/fuel/trucks/:truckId/profile — Set efficiency profile for a truck
  fastify.put(
    '/trucks/:truckId/profile',
    { preHandler: (fastify as any).requireAuth },
    async (request, reply) => {
      try {
        const { truckId } = request.params as any;
        const body = request.body as any;

        const profile = await (prisma as any).fuelEfficiencyProfile.upsert({
          where: { truckId },
          create: { truckId, baseLper100km: body.baseLper100km, ...body },
          update: { baseLper100km: body.baseLper100km, ...body },
        });

        return reply.send({ success: true, data: profile });
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message },
        };
      }
    }
  );
}
