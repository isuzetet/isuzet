import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import {
  checkIn,
  checkOut,
  presencePing,
  getTerminalQueue,
  getTerminals,
} from '../services/terminal.service.js';

const DRIVER_FLEET_ROLES = [ROLES.DRIVER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER];
const OPS_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN, ROLES.OPS_VIEWER];

export default async function terminalRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/terminal/:terminalId/check-in
  fastify.post(
    '/:terminalId/check-in',
    { preHandler: (fastify as any).requireRole(DRIVER_FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { terminalId } = request.params as { terminalId: string };
      const schema = z.object({
        truckId: z.string(),
        driverId: z.string(),
        currentLat: z.number(),
        currentLng: z.number(),
      });

      try {
        const body = schema.parse(request.body);
        const result = await checkIn(terminalId, body);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CHECK_IN_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/terminal/:terminalId/check-out
  fastify.post(
    '/:terminalId/check-out',
    { preHandler: (fastify as any).requireRole(DRIVER_FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { terminalId } = request.params as { terminalId: string };
      const schema = z.object({
        truckId: z.string(),
      });

      try {
        const body = schema.parse(request.body);
        const result = await checkOut(terminalId, body.truckId);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CHECK_OUT_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/terminal/presence-ping
  fastify.post(
    '/presence-ping',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        terminalId: z.string(),
        truckId: z.string(),
        currentLat: z.number(),
        currentLng: z.number(),
      });

      try {
        const body = schema.parse(request.body);
        const result = await presencePing(body);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'PRESENCE_PING_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/terminal/:terminalId/queue
  fastify.get(
    '/:terminalId/queue',
    { preHandler: (fastify as any).requireRole(OPS_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { terminalId } = request.params as { terminalId: string };

      try {
        const result = await getTerminalQueue(terminalId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_QUEUE_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/terminals
  fastify.get(
    '/',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const result = await getTerminals();
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_TERMINALS_FAILED', message: error.message },
        });
      }
    }
  );
}
