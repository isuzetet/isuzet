import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { getCorridorRates } from '../services/rate-benchmark.service.js';

const GetRatesSchema = z.object({
  corridorId: z.string(),
  cargoType: z.string().optional(),
});

export default async function rateBenchmarkRoutes(fastify: FastifyInstance) {
  // GET /api/v1/rates/benchmark — requireAuth, returns rates + caller's personal average
  fastify.get<{ Querystring: z.infer<typeof GetRatesSchema> }>(
    '/benchmark',
    { preHandler: (fastify as any).requireRole(Object.values(ROLES) as string[]) },
    async (request, reply) => {
      try {
        const query = GetRatesSchema.parse(request.query);
        const user = (request as any).user;

        const rates = await getCorridorRates({
          corridorId: query.corridorId,
          cargoType: query.cargoType,
          driverUserId: user.role === ROLES.DRIVER ? user.sub : undefined,
        });

        return { success: true, data: rates };
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

// Separate routes for public (no auth) endpoint
export async function rateBenchmarkPublicRoutes(fastify: FastifyInstance) {
  // GET /api/v1/rates/benchmark/public — NO auth middleware, returns rates only
  fastify.get<{ Querystring: z.infer<typeof GetRatesSchema> }>(
    '/benchmark/public',
    async (request, reply) => {
      try {
        const query = GetRatesSchema.parse(request.query);

        const rates = await getCorridorRates({
          corridorId: query.corridorId,
          cargoType: query.cargoType,
        });

        return { success: true, data: rates };
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
