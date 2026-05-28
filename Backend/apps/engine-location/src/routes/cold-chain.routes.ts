/**
 * Phase 10: Cold Chain Routes
 * Temperature logging and certificate generation endpoints
 */

import 'dotenv/config';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logTemperature, generateColdChainCertificate } from '../services/cold-chain.service.js';

export default async function coldChainRoutes(app: FastifyInstance) {
  // POST /api/v1/trips/:tripId/cold-chain - Log temperature reading (DRIVER, ADMIN)
  app.post('/trips/:tripId/cold-chain', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };
      const body = request.body as {
        temperatureCelsius: number;
        cargoType: string;
        checkpointId?: string;
      };

      if (!body.temperatureCelsius || !body.cargoType) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'temperatureCelsius and cargoType are required' },
        });
      }

      const result = await logTemperature({
        tripId,
        temperatureCelsius: body.temperatureCelsius,
        cargoType: body.cargoType,
        checkpointId: body.checkpointId,
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(201).send(result);
    } catch (error) {
      console.error('Error logging temperature:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to log temperature' },
      });
    }
  });

  // GET /api/v1/trips/:tripId/cold-chain/certificate - Get compliance certificate (DRIVER, ORDERER, ADMIN)
  app.get('/trips/:tripId/cold-chain/certificate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };

      const result = await generateColdChainCertificate(tripId);

      if (!result.success) {
        return reply.status(404).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error generating certificate:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate certificate' },
      });
    }
  });
}