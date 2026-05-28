import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logCOD } from '../services/cod.service.js';

// Internal secret check for system calls
function checkInternalSecret(request: FastifyRequest): boolean {
  const internalSecret = request.headers['x-internal-secret'] as string | undefined;
  const expectedSecret = process.env.INTERNAL_SECRET;
  
  // Skip auth if INTERNAL_SECRET not set (dev mode)
  if (!expectedSecret) {
    return true;
  }
  
  return internalSecret === expectedSecret;
}

export default async function codRoutes(app: FastifyInstance) {
  // Internal endpoint for Engine 2 to log COD
  app.post('/cod/log', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check internal auth
    if (!checkInternalSecret(request)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' }
      });
    }

    const schema = z.object({
      loadId: z.string(),
      tripId: z.string(),
      ordererId: z.string(),
      fleetOwnerId: z.string(),
      expectedAmountEtb: z.number().positive(),
      codHandler: z.enum(['DRIVER', 'RUIT_AGENT', 'DIRECT']),
      collectedByUserId: z.string().optional()
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error }
      });
    }

    const { loadId, tripId, ordererId, fleetOwnerId, expectedAmountEtb, codHandler, collectedByUserId } = result.data;

    try {
      const { transactionId } = await logCOD({
        loadId,
        tripId,
        ordererId,
        fleetOwnerId,
        expectedAmountEtb,
        codHandler,
        collectedByUserId,
        actorId: 'system'
      });

      return reply.send({
        success: true,
        data: { transactionId }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'COD_LOG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to log COD'
        }
      });
    }
  });
}


