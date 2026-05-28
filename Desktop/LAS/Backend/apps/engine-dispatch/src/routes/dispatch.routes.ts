import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { dispatchService } from '../services/dispatch.service.js';

const DISPATCH_ROLES = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN];
const DRIVER_ROLES = [ROLES.DRIVER];

export default async function dispatchRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/load/:loadId
  // Dispatch a load to find and offer to a driver
  fastify.post(
    '/load/:loadId',
    { preHandler: (fastify as any).requireRole(DISPATCH_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await dispatchService.dispatchLoad(params.loadId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'DISPATCH_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/offer/:loadId/accept
  // Driver accepts an offer
  fastify.post(
    '/offer/:loadId/accept',
    { preHandler: (fastify as any).requireRole(DRIVER_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const user = request.user!;
        const result = await dispatchService.acceptOffer(params.loadId, user.sub);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'ACCEPT_OFFER_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/offer/:loadId/decline
  // Driver declines an offer
  fastify.post(
    '/offer/:loadId/decline',
    { preHandler: (fastify as any).requireRole(DRIVER_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const user = request.user!;
        const result = await dispatchService.declineOffer(params.loadId, user.sub);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'DECLINE_OFFER_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/expired-offers/process
  // Process expired offers (cron job endpoint)
  fastify.post(
    '/expired-offers/process',
    { preHandler: (fastify as any).requireRole(DISPATCH_ROLES) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await dispatchService.handleExpiredOffers();
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'PROCESS_EXPIRED_OFFERS_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/load/:loadId/escalate
  // Manually escalate a load for intervention
  fastify.post(
    '/load/:loadId/escalate',
    { preHandler: (fastify as any).requireRole(DISPATCH_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        await dispatchService.escalateUnmatchedLoad(params.loadId);
        return reply.send({ success: true, loadId: params.loadId });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'ESCALATE_LOAD_FAILED', message: error.message },
        });
      }
    }
  );
}