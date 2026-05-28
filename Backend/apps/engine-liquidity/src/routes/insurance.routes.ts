/**
 * RUIT CBE - Insurance Routes (Phase 11E)
 * Cargo insurance hooks - thin integration layer
 */

import 'dotenv/config';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { offerInsurance, acceptInsurance } from '../services/insurance.service';

export async function registerInsuranceRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/insurance/quote
   * Get insurance quote for a load
   * Public endpoint - any authenticated user can request a quote
   */
  app.get(
    '/quote',
    {
      preHandler: (app as any).requireAuth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string(),
        declaredValue: z.coerce.number().int().positive(),
      });

      const result = schema.safeParse(request.query);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
          },
        });
      }

      const { loadId, declaredValue } = result.data;

      const quote = await offerInsurance(loadId, declaredValue);
      return reply.send(quote);
    }
  );

  /**
   * POST /api/v1/insurance/accept
   * Accept insurance offer and create escrow entry for premium
   * Auth: ORDERER or any authenticated user
   */
  app.post(
    '/accept',
    {
      preHandler: (app as any).requireAuth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        loadId: z.string(),
        declaredValue: z.number().int().positive(),
      });

      const result = schema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
          },
        });
      }

      const { loadId, declaredValue } = result.data;

      const response = await acceptInsurance(loadId, declaredValue);
      return reply.send(response);
    }
  );
}
