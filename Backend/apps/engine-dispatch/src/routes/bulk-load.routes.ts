import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { createBulkLoads, getBulkLoadStatus } from '../services/bulk-load.service.js';

const CreateBulkLoadsSchema = z.object({
  loads: z.array(
    z.object({
      corridorId: z.string(),
      cargoType: z.string(),
      weightKg: z.number().positive(),
      pickupDate: z.coerce.date(),
      estimatedValueCents: z.number().positive(),
      specialInstructions: z.string().optional(),
    })
  ),
  fundingRailId: z.string(),
});

export default async function bulkLoadRoutes(fastify: FastifyInstance) {
  // POST /api/v1/loads/bulk
  // Create multiple loads with bulk escrow funding
  // Requires ORDERER role or ADMIN
  fastify.post(
    '/',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const userId = request.user?.sub;
        const userRole = request.user?.role;

        // Check authorization
        const allowedRoles = ['ORDERER', 'OPS_ADMIN', 'SUPER_ADMIN'];
        if (!userRole || !allowedRoles.includes(userRole)) {
          return reply.status(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only ORDERERs and ADMINs can create bulk loads' },
          });
        }

        const body = CreateBulkLoadsSchema.parse(request.body);

        // Get orderer ID for this user
        const orderer = await (globalThis as any).prisma.orderer.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!orderer && userRole !== 'OPS_ADMIN' && userRole !== 'SUPER_ADMIN') {
          return reply.status(400).send({
            success: false,
            error: { code: 'ORDERER_NOT_FOUND', message: 'User is not registered as orderer' },
          });
        }

        const ordererId = orderer?.id;
        if (!ordererId) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PARAMS', message: 'orderId not resolved' },
          });
        }

        const result = await createBulkLoads({
          ordererId,
          loads: body.loads,
          fundingRailId: body.fundingRailId,
        });

        if (!result.success) {
          return reply.status(400).send(result);
        }

        return reply.status(201).send(result);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: error.message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: { code: 'CREATE_BULK_LOADS_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/loads/bulk/:batchId
  // Get status of all loads in a batch
  fastify.get(
    '/:batchId',
    { preHandler: (fastify as any).requireAuth },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { batchId } = request.params as { batchId: string };

        const result = await getBulkLoadStatus(batchId);

        if (!result.success) {
          return reply.status(404).send(result);
        }

        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_BULK_LOAD_STATUS_FAILED', message: error.message },
        });
      }
    }
  );
}
