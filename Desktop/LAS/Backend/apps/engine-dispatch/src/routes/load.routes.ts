import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { prisma } from '@ruit/shared-db';
import { ulid } from 'ulid';
import { loadService } from '../services/load.service';

const LOAD_ROLES = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN, ROLES.ORDERER];

export default async function loadRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/loads
  // Orderer creates a single load
  fastify.post(
    '/loads',
    { preHandler: (fastify as any).requireRole([ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const bodySchema = z.object({
        corridorId: z.string(),
        originCity: z.string(),
        originAddress: z.string().optional(),
        destinationCity: z.string(),
        destinationAddress: z.string().optional(),
        cargoType: z.string(),
        cargoDescription: z.string().optional(),
        weightKg: z.number().int().positive(),
        specialInstructions: z.string().optional(),
        pickupDate: z.coerce.date(),
        deliveryDeadline: z.coerce.date(),
        paymentModel: z.enum(['ESCROW', 'COD', 'ROLLING_CREDIT']).default('ESCROW'),
        requiresReefer: z.boolean().default(false),
        isHazardous: z.boolean().default(false),
      });

      try {
        const body = bodySchema.parse(request.body);
        const user = request.user!;

        // Get active strategy version
        const activeStrategy = await prisma.strategyVersion.findFirst({
          where: { isActive: true },
        });
        if (!activeStrategy) {
          return reply.status(422).send({
            success: false,
            error: { code: 'NO_ACTIVE_STRATEGY', message: 'No active strategy version found' },
          });
        }

        const load = await prisma.load.create({
          data: {
            id: ulid(),
            ordererId: user.entity_id,
            corridorId: body.corridorId,
            originCity: body.originCity,
            originAddress: body.originAddress,
            destinationCity: body.destinationCity,
            destinationAddress: body.destinationAddress,
            cargoType: body.cargoType,
            cargoDescription: body.cargoDescription,
            weightKg: body.weightKg,
            specialInstructions: body.specialInstructions,
            pickupDate: body.pickupDate,
            deliveryDeadline: body.deliveryDeadline,
            paymentModel: body.paymentModel,
            requiresReefer: body.requiresReefer,
            isHazardous: body.isHazardous,
            strategyVersionId: activeStrategy.id,
            status: 'OPEN',
          },
        });

        // Trigger automated dispatch loop — non-blocking
        setImmediate(async () => {
          try {
            const port = process.env.ENGINE_DISPATCH_PORT ?? '3015';
            await fetch(`http://localhost:${port}/api/v1/dispatch/load/${load.id}`, {
              method: 'POST',
              headers: {
                'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
                'content-type': 'application/json',
              },
            });
          } catch (err) {
            console.error('[DISPATCH] Auto-dispatch failed for load:', load.id, err);
          }
        });

        return reply.status(201).send({ success: true, data: load });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: error.message },
          });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'LOAD_CREATION_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/load/:loadId/transition-to-matching
  // Transition load to MATCHING status and trigger dispatch
  fastify.post(
    '/load/:loadId/transition-to-matching',
    { preHandler: (fastify as any).requireRole(LOAD_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await loadService.transitionToMatching(params.loadId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'TRANSITION_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/load/:loadId/status
  // Get current load status
  fastify.get(
    '/load/:loadId/status',
    { preHandler: (fastify as any).requireRole(LOAD_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const result = await loadService.getLoadStatus(params.loadId);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'STATUS_RETRIEVAL_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/loads
  // OPS: list all loads with optional status filter
  fastify.get(
    '/loads',
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const querySchema = z.object({
        status: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).default(50),
        offset: z.coerce.number().min(0).default(0),
      });
      try {
        const query = querySchema.parse(request.query);
        const where: any = {};
        if (query.status) where.status = query.status;
        const [loads, total] = await Promise.all([
          prisma.load.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: query.limit,
            skip: query.offset,
            select: {
              id: true, status: true, originCity: true, destinationCity: true,
              cargoType: true, weightKg: true, systemQuoteEtb: true,
              finalRateEtb: true, createdAt: true, corridorId: true, paymentModel: true,
            },
          }),
          prisma.load.count({ where }),
        ]);
        return reply.send({ success: true, data: loads, total });
      } catch (error: any) {
        return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message: error.message } });
      }
    }
  );

  // POST /api/v1/dispatch/load/:loadId/status
  // Update load status
  fastify.post(
    '/load/:loadId/status',
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string()
      });

      const bodySchema = z.object({
        status: z.string()
      });

      try {
        const params = schema.parse(request.params);
        const body = bodySchema.parse(request.body);
        const result = await loadService.updateLoadStatus(params.loadId, body.status);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'STATUS_UPDATE_FAILED', message: error.message },
        });
      }
    }
  );
}