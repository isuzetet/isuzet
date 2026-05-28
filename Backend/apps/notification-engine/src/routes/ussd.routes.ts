import 'dotenv/config';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { handleUssdCallback } from '../services/ussd.service.js';

const ussdRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /api/v1/ussd/callback - USSD callback endpoint (NO auth - Africa's Talking sends this)
  fastify.post('/api/v1/ussd/callback', {
    schema: {
      body: T.Object({
        sessionId: T.String(),
        phoneNumber: T.String(),
        text: T.Optional(T.String()),
        serviceCode: T.Optional(T.String()),
      }),
    },
  }, async (request, reply) => {
    try {
      const { sessionId, phoneNumber, text = '', serviceCode } = request.body as any;

      // Validate request is from Africa's Talking
      // In production: validate signature from request header
      // if config.ussdSharedSecret is set, validate against it

      const response = await handleUssdCallback({
        sessionId,
        phoneNumber,
        text,
        serviceCode,
      });

      // Africa's Talking expects plain text response, not JSON
      // Format: "CON <message>" or "END <message>"
      const formattedResponse = response.endSession
        ? `END ${response.response}`
        : `CON ${response.response}`;

      return reply
        .type('text/plain')
        .send(formattedResponse);
    } catch (error) {
      console.error('[USSD] Error handling callback:', error);
      return reply
        .type('text/plain')
        .send('END An error occurred. Please try again later.');
    }
  });

  // GET /api/v1/ussd/health - Health check for USSD endpoint
  fastify.get('/api/v1/ussd/health', async (request, reply) => {
    return {
      status: 'UP',
      engine: 'notification-ussd',
      timestamp: new Date().toISOString(),
    };
  });
};

export default ussdRoutes;
