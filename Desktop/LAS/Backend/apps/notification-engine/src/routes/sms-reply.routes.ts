import 'dotenv/config';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { processSmsReply } from '../services/sms-reply.service.js';

const smsReplyRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /api/v1/sms/incoming - SMS incoming webhook (NO auth - SMS provider sends this)
  fastify.post('/api/v1/sms/incoming', {
    schema: {
      body: T.Object({
        from: T.String(),
        to: T.String(),
        text: T.String(),
        date: T.String(),
      }),
    },
  }, async (request, reply) => {
    try {
      const { from, to, text, date } = request.body as any;

      // Validate request is from Africa's Talking (or other SMS provider)
      // In production: validate signature from request header

      const result = await processSmsReply({
        from,
        to,
        text,
        date,
      });

      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      console.error('[SMS_REPLY] Error handling incoming SMS:', error);
      return {
        success: false,
        message: 'Error processing SMS reply',
      };
    }
  });

  // GET /api/v1/sms/health - Health check for SMS endpoint
  fastify.get('/api/v1/sms/health', async (request, reply) => {
    return {
      status: 'UP',
      engine: 'notification-sms',
      timestamp: new Date().toISOString(),
    };
  });
};

export default smsReplyRoutes;
