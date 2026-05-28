import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { checkBlockPreference, setBlockPreference, getBlockPreferenceList } from '../services/block-preference.service.js';

const SetBlockPreferenceSchema = z.object({
  toUserId: z.string(),
  type: z.enum(['PREFERRED', 'BLOCKED']),
  reason: z.string().optional(),
});

export default async function blockPreferenceRoutes(fastify: FastifyInstance) {
  // POST /api/v1/preferences/block
  // Set a block or preference for a user pair
  fastify.post(
    '/block',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const body = SetBlockPreferenceSchema.parse(request.body);
        const userId = request.user?.sub;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
          });
        }

        const result = await setBlockPreference({
          fromUserId: userId,
          toUserId: body.toUserId,
          type: body.type,
          reason: body.reason,
        });

        if (!result.success) {
          return reply.status(400).send(result);
        }

        return reply.send({ success: true, data: {} });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: error.message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: { code: 'SET_BLOCK_PREFERENCE_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/preferences?toUserId=
  // Check block/preference status between two users
  fastify.get(
    '/',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { toUserId } = request.query as { toUserId?: string };
        const userId = request.user?.sub;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
          });
        }

        if (!toUserId) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PARAMS', message: 'toUserId query parameter required' },
          });
        }

        const result = await checkBlockPreference(userId, toUserId);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'CHECK_BLOCK_PREFERENCE_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/preferences/list?direction=outgoing
  // Get all block/preference records for authenticated user
  fastify.get(
    '/list',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { direction } = request.query as { direction?: string };
        const userId = request.user?.sub;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
          });
        }

        const result = await getBlockPreferenceList(userId, (direction || 'outgoing') as any);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_BLOCK_PREFERENCE_LIST_FAILED', message: error.message },
        });
      }
    }
  );
}
