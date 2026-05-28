import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import { prisma } from '@ruit/shared-db';
import { ulid } from 'ulid';

const AGENT_ROLES = [ROLES.FIELD_AGENT, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN];

export default async function agentRoutes(fastify: FastifyInstance) {
  // POST /api/v1/agent/post-load
  // FIELD_AGENT posts a load on behalf of a client
  fastify.post(
    '/post-load',
    { preHandler: (fastify as any).requireRole(AGENT_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const bodySchema = z.object({
        clientPhone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Invalid phone number'),
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
        const agentUserId = user.sub;

        // Normalize phone number (remove + if present, ensure it's clean)
        const normalizedPhone = body.clientPhone.replace(/^\+/, '');

        // 1. Look up client by phone
        const clientUser = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
          select: { id: true, role: true },
        });

        if (!clientUser) {
          return reply.status(404).send({
            success: false,
            error: { code: 'CLIENT_NOT_FOUND', message: `Client with phone ${body.clientPhone} not found` },
          });
        }

        // 2. Verify ORDERER role or compatible role (ORDERER or SYSTEM_SERVICE)
        if (clientUser.role !== ROLES.ORDERER && clientUser.role !== ROLES.SYSTEM_SERVICE) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'INVALID_CLIENT_ROLE',
              message: `Client must have ORDERER role, has ${clientUser.role}`,
            },
          });
        }

        // 3. Verify AgentClient relationship exists
        const agentClient = await prisma.agentClient.findUnique({
          where: {
            agentUserId_clientUserId: {
              agentUserId,
              clientUserId: clientUser.id,
            },
          },
          select: { id: true },
        });

        if (!agentClient) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'AGENT_CLIENT_NOT_LINKED',
              message: `Agent is not linked to this client`,
            },
          });
        }

        // 4. Get active strategy version
        const activeStrategy = await prisma.strategyVersion.findFirst({
          where: { isActive: true },
          select: { id: true },
        });

        if (!activeStrategy) {
          return reply.status(422).send({
            success: false,
            error: { code: 'NO_ACTIVE_STRATEGY', message: 'No active strategy version found' },
          });
        }

        // 5. Create load with agentId and clientId as orderer
        const loadId = ulid();
        const load = await prisma.load.create({
          data: {
            id: loadId,
            ordererId: clientUser.id,
            agentId: agentUserId,
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
            source: 'AGENT_POSTING',
          },
          include: { agent: { select: { id: true, phone: true } } },
        });

        // 6. Record commission allocation in FinancialTransaction
        // Commission rate will be looked up from AgentClient settings or default rate
        // For now, assume standard rate — to be configured per agent
        const AGENT_COMMISSION_RATE = 0.05; // 5% default
        const estimatedCommissionEtb = load.systemQuoteEtb
          ? Math.round(Number(load.systemQuoteEtb) * AGENT_COMMISSION_RATE * 100) / 100
          : 0;

        if (estimatedCommissionEtb > 0) {
          await prisma.financialTransaction.create({
            data: {
              id: ulid(),
              loadId: loadId,
              ordererId: clientUser.id,
              agentUserId: agentUserId,
              txType: 'AGENT_COMMISSION',
              amountEtb: estimatedCommissionEtb.toString(),
              direction: 'IN',
              paymentModel: body.paymentModel,
              status: 'PENDING',
              externalRef: `agent:${agentUserId}`,
              createdAt: new Date(),
            },
          });
        }

        // 7. Trigger automated dispatch loop — non-blocking
        setImmediate(async () => {
          try {
            const port = process.env.ENGINE_DISPATCH_PORT ?? '3015';
            await fetch(`http://localhost:${port}/api/v1/dispatch/load/${loadId}`, {
              method: 'POST',
              headers: {
                'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
                'content-type': 'application/json',
              },
            });
          } catch (err) {
            console.error('[AGENT-DISPATCH] Auto-dispatch failed for load:', loadId, err);
          }
        });

        return reply.status(201).send({
          success: true,
          data: {
            ...load,
            agentCommissionEtb: estimatedCommissionEtb,
          },
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: error.message },
          });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'AGENT_LOAD_POSTING_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/agent/loads
  // Get all loads posted by this agent
  fastify.get(
    '/loads',
    { preHandler: (fastify as any).requireRole(AGENT_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const agentUserId = user.sub;

        const loads = await prisma.load.findMany({
          where: {
            agentId: agentUserId,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            orderer: {
              select: {
                id: true,
                user: {
                  select: {
                    phone: true,
                  },
                },
              },
            },
          },
        });

        return reply.send({
          success: true,
          data: loads,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'LOAD_LIST_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/agent/commissions
  // Get pending and settled commissions for this agent
  fastify.get(
    '/commissions',
    { preHandler: (fastify as any).requireRole(AGENT_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const agentUserId = user.sub;

        const transactions = await prisma.financialTransaction.findMany({
          where: {
            agentUserId: agentUserId,
            txType: 'AGENT_COMMISSION',
          },
          orderBy: { createdAt: 'desc' },
        });

        const pending = transactions
          .filter(t => t.status === 'PENDING')
          .reduce((sum, t) => sum + Number(t.amountEtb || 0), 0);

        const settled = transactions
          .filter(t => t.status === 'SETTLED')
          .reduce((sum, t) => sum + Number(t.amountEtb || 0), 0);

        return reply.send({
          success: true,
          data: {
            pendingCommissionEtb: pending,
            settledCommissionEtb: settled,
            transactions,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'COMMISSION_RETRIEVAL_FAILED', message: error.message },
        });
      }
    }
  );
}
