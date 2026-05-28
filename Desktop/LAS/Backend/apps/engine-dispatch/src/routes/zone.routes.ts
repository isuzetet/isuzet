import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { getZoneDemand, getZones } from '../services/zone.service.js';

export default async function zoneRoutes(fastify: FastifyInstance) {
  // GET /api/v1/dispatch/zone/:zoneId/demand
  fastify.get(
    '/:zoneId/demand',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { zoneId } = request.params as { zoneId: string };

      try {
        const result = await getZoneDemand(zoneId);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_ZONE_DEMAND_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/zone/zones
  fastify.get(
    '/zones',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const result = await getZones();
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_ZONES_FAILED', message: error.message },
        });
      }
    }
  );
}
