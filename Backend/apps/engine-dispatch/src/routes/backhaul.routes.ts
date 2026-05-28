import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import {
  suggestBackhaul,
  respondToSuggestion,
  getPendingSuggestions,
} from '../services/backhaul.service.js';

const SUGGEST_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN];
const RESPOND_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.DRIVER];
const FLEET_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER];

export default async function backhaulRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/backhaul/suggest
  fastify.post(
    '/suggest',
    { preHandler: (fastify as any).requireRole(SUGGEST_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        tripId: z.string(),
        projectedCompletionLat: z.number(),
        projectedCompletionLng: z.number(),
        projectedFreeAt: z.string(),
      });

      try {
        const body = schema.parse(request.body);
        const result = await suggestBackhaul(
          body.tripId,
          body.projectedCompletionLat,
          body.projectedCompletionLng,
          body.projectedFreeAt
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'SUGGEST_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/backhaul/:suggestionId/respond
  fastify.post(
    '/:suggestionId/respond',
    { preHandler: (fastify as any).requireRole(RESPOND_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { suggestionId } = request.params as { suggestionId: string };
      const schema = z.object({
        decision: z.enum(['ACCEPTED', 'REJECTED']),
        reason: z.string().optional(),
      });

      try {
        const body = schema.parse(request.body);
        const result = await respondToSuggestion(suggestionId, body.decision, body.reason);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'RESPOND_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/backhaul/pending
  fastify.get(
    '/pending',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const user = request.user!;

      try {
        const result = await getPendingSuggestions(user.sub);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_PENDING_FAILED', message: error.message },
        });
      }
    }
  );
}
