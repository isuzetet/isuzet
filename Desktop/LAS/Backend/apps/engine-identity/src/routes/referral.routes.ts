import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import {
  generateReferralCode,
  applyReferralCode,
  getReferralHistory,
} from '../services/referral.service.js';

const ApplyReferralCodeSchema = z.object({
  referralCode: z.string(),
  userRole: z.string(),
});

export default async function referralRoutes(fastify: FastifyInstance) {
  // GET /api/v1/referral/code
  // Get or generate referral code for authenticated user
  fastify.get(
    '/code',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const userId = request.user?.sub;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
          });
        }

        const code = await generateReferralCode(userId);

        return reply.send({
          success: true,
          data: { referralCode: code, userId },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GENERATE_REFERRAL_CODE_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/referral/apply
  // Apply a referral code during registration
  fastify.post(
    '/apply',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const body = ApplyReferralCodeSchema.parse(request.body);
        const userId = request.user?.sub;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
          });
        }

        const result = await applyReferralCode({
          newUserId: userId,
          referralCode: body.referralCode,
          newUserRole: body.userRole,
        });

        return reply.send(result);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: error.message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: { code: 'APPLY_REFERRAL_CODE_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/referral/history?direction=referrer
  // Get referral history for authenticated user
  fastify.get(
    '/history',
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

        const history = await getReferralHistory(userId, (direction || 'referrer') as any);

        return reply.send({
          success: true,
          data: history,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_REFERRAL_HISTORY_FAILED', message: error.message },
        });
      }
    }
  );
}
