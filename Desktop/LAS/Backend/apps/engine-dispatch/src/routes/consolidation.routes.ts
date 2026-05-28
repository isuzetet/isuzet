import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import {
  createConsolidatedLoad,
  joinConsolidatedLoad,
  getAvailableConsolidatedLoads,
  getConsolidatedLoad,
  cancelSubLoad,
  dispatchConsolidatedLoad,
  createCargoOffer,
  getOpenCargoOffersByCorridor,
  consolidateOffers,
  markConsolidatedLoadReady,
  handlePartialPickupFailure,
  releaseConsolidatedLoadEscrow,
} from '../services/consolidation.service.js';

const ORDERER_ROLES = [ROLES.ORDERER, ROLES.FIELD_AGENT];
const ORDERER_OPS_ROLES = [ROLES.ORDERER, ROLES.FIELD_AGENT, ROLES.OPS_ADMIN];
const DISPATCH_ROLES = [ROLES.FIELD_AGENT, ROLES.OPS_ADMIN];
const VIEW_ROLES = [
  ROLES.ORDERER,
  ROLES.FIELD_AGENT,
  ROLES.FLEET_OWNER,
  ROLES.FLEET_MANAGER,
  ROLES.OPS_ADMIN,
];

export default async function consolidationRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/consolidated-loads - Create consolidated load
  fastify.post(
    '/',
    { preHandler: (fastify as any).requireRole(ORDERER_OPS_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        corridorId: z.string(),
        consolidationType: z.string(),
        originCity: z.string(),
        destinationCity: z.string(),
        collectionDeadline: z.string(),
        minimumFillPct: z.number().default(70),
        shortfallPolicy: z.string().default('DISTRIBUTE'),
        distributionPointAddress: z.string().optional(),
        distributionPointLat: z.number().optional(),
        distributionPointLng: z.number().optional(),
      });

      try {
        const body = schema.parse(request.body);
        const user = request.user!;
        const result = await createConsolidatedLoad(body, user.sub);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CREATE_CONSOLIDATION_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/consolidated-loads/:id/join - Join consolidated load
  fastify.post(
    '/:id/join',
    { preHandler: (fastify as any).requireRole(ORDERER_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        weightKg: z.number(),
        cargoDescription: z.string(),
        cargoType: z.string(),
        escrowAmountEtb: z.number(),
        pickupAddress: z.string().optional(),
        deliveryAddress: z.string().optional(),
      });

      try {
        const body = schema.parse(request.body);
        const user = request.user!;
        const result = await joinConsolidatedLoad(id, body, user.sub);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'JOIN_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/consolidated-loads/:id/dispatch - Dispatch consolidated load
  fastify.post(
    '/:id/dispatch',
    { preHandler: (fastify as any).requireRole(DISPATCH_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      try {
        const result = await dispatchConsolidatedLoad(id, user.sub, user.role);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'DISPATCH_FAILED', message: error.message },
        });
      }
    }
  );

  // DELETE /api/v1/dispatch/consolidated-loads/:id/join/:subLoadId - Cancel sub-load
  fastify.delete(
    '/:id/join/:subLoadId',
    { preHandler: (fastify as any).requireRole(ORDERER_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id, subLoadId } = request.params as { id: string; subLoadId: string };
      const user = request.user!;

      try {
        const result = await cancelSubLoad(id, subLoadId, user.sub);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CANCEL_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/consolidated-loads/available
  fastify.get(
    '/available',
    { preHandler: (fastify as any).requireRole([...ORDERER_ROLES, ROLES.BROKER]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { corridorId, cargoType, maxDeadlineHours } = request.query as {
        corridorId?: string;
        cargoType?: string;
        maxDeadlineHours?: string;
      };

      try {
        const result = await getAvailableConsolidatedLoads(corridorId, cargoType, maxDeadlineHours);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_AVAILABLE_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/consolidated-loads/:id - Get consolidated load detail
  fastify.get(
    '/:id',
    { preHandler: (fastify as any).requireRole(VIEW_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const result = await getConsolidatedLoad(id);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_LOAD_FAILED', message: error.message },
        });
      }
    }
  );

  // === PHASE 5: LTL CONSOLIDATION + MULTI-PAYER ESCROW ===

  // POST /api/v1/dispatch/consolidated-loads/cargo-offers - Create a cargo offer for consolidation
  fastify.post(
    '/cargo-offers',
    { preHandler: (fastify as any).requireRole([ROLES.ORDERER, ROLES.FIELD_AGENT]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        corridorId: z.string(),
        cargoType: z.string(),
        weightKg: z.number().positive(),
        cargoDescription: z.string(),
        pickupAddress: z.string(),
        deliveryAddress: z.string(),
        escrowAmountEtb: z.number().positive(),
        pickupDeadlineHours: z.number().positive(),
      });

      try {
        const body = schema.parse(request.body);
        const user = request.user!;
        const result = await createCargoOffer(body, user.sub);
        return reply.status(201).send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CREATE_CARGO_OFFER_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/consolidated-loads/cargo-offers - Get open cargo offers for a corridor
  fastify.get(
    '/cargo-offers',
    { preHandler: (fastify as any).requireRole([ROLES.FIELD_AGENT, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { corridorId, limit } = request.query as {
        corridorId: string;
        limit?: string;
      };

      if (!corridorId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'corridorId is required' },
        });
      }

      try {
        const result = await getOpenCargoOffersByCorridor(
          corridorId,
          limit ? parseInt(limit) : undefined
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_CARGO_OFFERS_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/consolidated-loads/consolidations - Consolidate multiple cargo offers
  fastify.post(
    '/consolidations',
    { preHandler: (fastify as any).requireRole([ROLES.FIELD_AGENT, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        offerIds: z.array(z.string()).min(2),
      });

      try {
        const body = schema.parse(request.body);
        const user = request.user!;
        const result = await consolidateOffers(body.offerIds, user.sub);
        return reply.status(201).send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CONSOLIDATE_OFFERS_FAILED', message: error.message },
        });
      }
    }
  );

  // PATCH /api/v1/dispatch/consolidated-loads/:id/ready - Mark load ready for dispatch
  fastify.patch(
    '/:id/ready',
    { preHandler: (fastify as any).requireRole([ROLES.FIELD_AGENT, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      try {
        const result = await markConsolidatedLoadReady(id, user.sub, user.role);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'MARK_READY_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/consolidated-loads/:id/partial-failure - Handle partial pickup failure
  fastify.post(
    '/:id/partial-failure',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        failureReason: z.string(),
        affectedSubLoadIds: z.array(z.string()).min(1),
        compensationPct: z.number().optional(),
      });

      try {
        const body = schema.parse(request.body);
        const user = request.user!;
        const result = await handlePartialPickupFailure(
          { consolidatedLoadId: id, ...body },
          user.sub
        );
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'HANDLE_FAILURE_FAILED', message: error.message },
        });
      }
    }
  );

  // POST /api/v1/dispatch/consolidated-loads/:id/release-escrow - Release escrow for delivered load
  fastify.post(
    '/:id/release-escrow',
    { preHandler: (fastify as any).requireRole([ROLES.OPS_ADMIN, ROLES.FINANCE_OPS]) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      try {
        const result = await releaseConsolidatedLoadEscrow(id, user.sub, user.role);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'RELEASE_ESCROW_FAILED', message: error.message },
        });
      }
    }
  );
}
