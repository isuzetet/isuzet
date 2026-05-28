import 'dotenv/config';
/**
 * Engine 10: Strategy Versioning
 * Configuration brain of the RUIT CBE platform
 * Port: 3010
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@ruit/shared-db';
import { ROLES } from '@ruit/shared-types';
import { verifyAccessToken, normalizePhone } from '@ruit/shared-auth';
import { cached, invalidateCache } from '@ruit/shared-utils';
import strategyRoutes from './routes/strategy.routes.js';
import strategyConfigRoutes from './routes/strategy-config.routes.js';

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

  // RBAC Middleware - requireAuth (any authenticated role)
  app.decorate('requireAuth', async (request: any, reply: any) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
      }
      const token = authHeader.slice(7);
      const payload = await verifyAccessToken(token);
      request.user = payload;
      return;
    } catch (error) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    // Map errors to standard format
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
    // Database errors
    if (error.code?.startsWith('P')) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database operation failed'
        }
      });
    }
    // Default error
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    });
  });

  // Health check endpoint
  app.get('/api/v1/strategy/health', async () => ({
    status: 'UP',
    engine: 'strategy',
    timestamp: new Date().toISOString()
  }));

  // Register strategy routes
  await app.register(strategyRoutes, { prefix: '/api/v1/strategy' });

  // Register strategy config routes (Phase 3)
  await app.register(strategyConfigRoutes, { prefix: '/api/v1/strategy' });

  // Start server
  const PORT = parseInt(process.env.PORT || '3010');
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Engine 10 (Strategy) running on port ${PORT}`);
}

void main();

export { app };
