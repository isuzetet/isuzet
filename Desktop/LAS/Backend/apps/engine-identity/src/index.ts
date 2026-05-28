import 'dotenv/config';
/**
 * Engine 1: Identity, KYC & Progressive Trust Engine
 * Port: 3001
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@ruit/shared-db';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';
import { verifyAccessToken, normalizePhone } from '@ruit/shared-auth';
import { cached, invalidateCache, toEthiopianDate } from '@ruit/shared-utils';
import authRoutes from './routes/auth.routes.js';
import identityRoutes from './routes/identity.routes.js';
import referralRoutes from './routes/referral.routes.js';
import telegramLinkRoutes from './routes/telegram-link.routes.js';

const app = Fastify({
  logger: {
    level: 'info',
  },
});

async function main() {
  // Register CORS
  await app.register(cors as any, {
    origin: true,
    credentials: true,
  });

  // RBAC Middleware
  app.decorate('requireRole', (allowedRoles: string[]) => {
    return async (request: any, reply: any) => {
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
        if (!allowedRoles.includes(payload.role)) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'Role not authorized for this operation'
            }
          });
        }
        request.user = payload;
        return;
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
  });

  // Optional auth middleware (extract user info but don't require)
  app.decorate('optionalAuth', async (request: any, reply: any) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = await verifyAccessToken(token);
        request.user = payload;
      }
    } catch {
      // Continue without auth
    }
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation
        }
      });
    }
    if (error.code?.startsWith('P')) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database operation failed'
        }
      });
    }
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    });
  });

  // Health check
  app.get('/api/v1/identity/health', async () => ({
    status: 'UP',
    engine: 'identity',
    timestamp: new Date().toISOString()
  }));

  // Register routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(identityRoutes, { prefix: '/api/v1/identity' });
  await app.register(referralRoutes, { prefix: '/api/v1' });
  await app.register(telegramLinkRoutes, { prefix: '/api/v1' });

  // Start server
  const PORT = parseInt(process.env.PORT || '3001');
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Engine 1 (Identity) running on port ${PORT}`);
}

void main();

export { app };
