import { FastifyInstance } from 'fastify';
import { ROLES } from '@ruit/shared-types';
import { getEarningsComparison } from '../services/earnings-comparison.service.js';

export default async function earningsComparisonRoutes(fastify: FastifyInstance) {
  // GET /api/v1/drivers/earnings-comparison — DRIVER auth
  fastify.get<{ Querystring: { periodDays?: string } }>(
    '/earnings-comparison',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request, reply) => {
      try {
        const user = (request as any).user;
        const { periodDays = '30' } = request.query;
        const days = parseInt(periodDays, 10);

        if (days < 1 || days > 365) {
          reply.status(400);
          return {
            success: false,
            error: { code: 'INVALID_PERIOD', message: 'Period must be 1-365 days' },
          };
        }

        const comparison = await getEarningsComparison(user.sub, days);

        return { success: true, data: comparison };
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
