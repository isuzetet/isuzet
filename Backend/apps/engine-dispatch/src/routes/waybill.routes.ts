import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { waybillService } from '../services/waybill.service.js';

const WAYBILL_ROLES = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN, ROLES.DRIVER, ROLES.FLEET_OWNER];

export default async function waybillRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/waybill/generate/:tripId
  // Generate digital waybill for a trip
  fastify.post(
    '/waybill/generate/:tripId',
    { preHandler: (fastify as any).requireRole(WAYBILL_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        tripId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await waybillService.generateWaybill(params.tripId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'WAYBILL_GENERATION_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/waybill/:waybillNumber
  // Get waybill data for display
  fastify.get(
    '/waybill/:waybillNumber',
    { preHandler: (fastify as any).requireRole(WAYBILL_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        waybillNumber: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await waybillService.getWaybillForDisplay(params.waybillNumber);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'WAYBILL_RETRIEVAL_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/waybill/:waybillNumber/void
  // Void/cancel a waybill
  fastify.post(
    '/waybill/:waybillNumber/void',
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        waybillNumber: z.string()
      });

      const bodySchema = z.object({
        reason: z.string().min(1, 'Void reason is required')
      });

      try {
        const params = schema.parse(request.params);
        const body = bodySchema.parse(request.body);
        const result = await waybillService.voidWaybill(params.waybillNumber, body.reason);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'WAYBILL_VOID_FAILED', message: error.message },
        });
      }
    }
  );
}