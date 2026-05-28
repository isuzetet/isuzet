import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { ordererReliabilityService } from '../services/orderer-reliability.service.js';

const RELIABILITY_ROLES = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN, ROLES.ORDERER, ROLES.FLEET_OWNER];

export default async function ordererReliabilityRoutes(fastify: FastifyInstance) {
  // GET /api/v1/dispatch/reliability/:ordererId
  // Get reliability score summary for an orderer
  fastify.get(
    '/reliability/:ordererId',
    { preHandler: (fastify as any).requireRole(RELIABILITY_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        ordererId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await ordererReliabilityService.getScoreSummary(params.ordererId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'RELIABILITY_RETRIEVAL_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/reliability/:ordererId/recalculate
  // Recalculate reliability score for an orderer
  fastify.post(
    '/reliability/:ordererId/recalculate',
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        ordererId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await ordererReliabilityService.recalculateScore(params.ordererId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'RELIABILITY_RECALCULATION_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/reliability/:ordererId/tier
  // Get reliability tier for an orderer
  fastify.get(
    '/reliability/:ordererId/tier',
    { preHandler: (fastify as any).requireRole(RELIABILITY_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        ordererId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const tier = await ordererReliabilityService.getReliabilityTier(params.ordererId);
        return reply.send({ success: true, ordererId: params.ordererId, tier });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'RELIABILITY_TIER_FAILED', message: error.message },
        });
      }
    }
  );
}