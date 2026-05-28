import 'dotenv/config';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { Redis } from 'ioredis';
import { prisma } from '@ruit/shared-db';
import { verifyAccessToken } from '@ruit/shared-auth';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const telegramLinkRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Middleware to verify auth
  const requireAuth = async (request: any, reply: any) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header'
          }
        });
      }
      const token = authHeader.slice(7);
      const payload = await verifyAccessToken(token);
      request.user = payload;
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    }
  };

  // Step 1: Generate a link code for the user to use in Telegram bot
  fastify.post('/telegram/link-code', { 
    preHandler: [requireAuth],
    schema: {
      response: {
        200: T.Object({
          data: T.Object({
            linkCode: T.String(),
            botUsername: T.String(),
            instruction: T.String(),
            expiresInMinutes: T.Number(),
          })
        })
      }
    }
  }, async (request: any, reply) => {
    const user = request.user;
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Store in Redis with 10-minute expiry
    await redis.set(`telegram_link:${code}`, user.sub, 'EX', 600);
    
    return reply.send({
      data: {
        linkCode: code,
        botUsername: process.env.TELEGRAM_BOT_USERNAME || 'ruit_bot',
        instruction: `Open @${process.env.TELEGRAM_BOT_USERNAME || 'ruit_bot'} on Telegram and send: /link ${code}`,
        expiresInMinutes: 10,
      }
    });
  });

  // Step 2: Bot calls this after user sends /link <code>
  fastify.post('/telegram/complete-link', {
    schema: {
      body: T.Object({
        linkCode: T.String(),
        telegramUserId: T.String(),
        telegramUsername: T.Optional(T.String()),
        telegramFirstName: T.Optional(T.String()),
        telegramLastName: T.Optional(T.String()),
      }),
      response: {
        200: T.Object({
          data: T.Object({
            success: T.Boolean(),
          })
        })
      }
    }
  }, async (request: any, reply) => {
    const { linkCode, telegramUserId, telegramUsername, telegramFirstName, telegramLastName } = request.body;
    
    const userId = await redis.get(`telegram_link:${linkCode}`);
    if (!userId) {
      return reply.status(400).send({ 
        error: 'INVALID_OR_EXPIRED_CODE',
        message: 'The link code is invalid or has expired'
      });
    }
    
    try {
      await prisma.telegramAccount.upsert({
        where: { userId },
        create: { 
          userId, 
          telegramUserId: String(telegramUserId), 
          telegramHandle: telegramUsername || null,
          telegramFirstName: telegramFirstName || null,
          telegramLastName: telegramLastName || null,
          isActive: true 
        },
        update: { 
          telegramUserId: String(telegramUserId), 
          telegramHandle: telegramUsername || null,
          telegramFirstName: telegramFirstName || null,
          telegramLastName: telegramLastName || null,
          isActive: true, 
          linkedAt: new Date() 
        }
      });
      
      await redis.del(`telegram_link:${linkCode}`);
      return reply.send({ data: { success: true } });
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      return reply.status(500).send({
        error: 'LINK_FAILED',
        message: 'An error occurred while linking your account'
      });
    }
  });

  // Step 3: Get Telegram link status
  fastify.get('/telegram/status', {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: T.Object({
          data: T.Object({
            linked: T.Boolean(),
            telegramUsername: T.Optional(T.String()),
          })
        })
      }
    }
  }, async (request: any, reply) => {
    const user = request.user;
    
    try {
      const account = await prisma.telegramAccount.findUnique({ 
        where: { userId: user.sub } 
      });
      
      return reply.send({ 
        data: { 
          linked: !!account?.isActive, 
          telegramUsername: account?.telegramHandle || undefined
        } 
      });
    } catch (error) {
      console.error('Error getting Telegram status:', error);
      return reply.status(500).send({
        error: 'STATUS_ERROR',
        message: 'An error occurred while getting Telegram status'
      });
    }
  });

  // Step 4: Unlink Telegram account
  fastify.post('/telegram/unlink', {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: T.Object({
          data: T.Object({
            success: T.Boolean(),
          })
        })
      }
    }
  }, async (request: any, reply) => {
    const user = request.user;
    
    try {
      await prisma.telegramAccount.delete({
        where: { userId: user.sub }
      });
      
      return reply.send({ data: { success: true } });
    } catch (error) {
      console.error('Error unlinking Telegram account:', error);
      return reply.status(500).send({
        error: 'UNLINK_FAILED',
        message: 'An error occurred while unlinking your account'
      });
    }
  });
};

export default telegramLinkRoutes;
