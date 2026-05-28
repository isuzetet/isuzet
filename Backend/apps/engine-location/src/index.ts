import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { prisma } from '@ruit/shared-db';
import { verifyAccessToken } from '@ruit/shared-auth';
import { initTimescaleTables } from './services/timescale.service.js';
import { locationRoutes } from './routes/location.routes.js';
import { deviceRoutes } from './routes/device.routes.js';
import { trackingRoutes } from './routes/tracking.routes.js';
import fuelReportRoutes from './routes/fuel-report.routes.js';
import coldChainRoutes from './routes/cold-chain.routes.js';

const PORT = 3014;
const HOST = '0.0.0.0';

const app = Fastify({
  logger: {
    level: 'info',
  },
});

async function main() {
  // Initialize TimescaleDB tables
  await initTimescaleTables();

  // CORS
  await app.register(cors as any, {
    origin: true,
    credentials: true,
  });

  // Helmet security
  await app.register(helmet, {
    contentSecurityPolicy: false,
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
              message: 'Missing or invalid authorization header',
            },
          });
        }
        const token = authHeader.slice(7);
        const payload = await verifyAccessToken(token);
        if (!allowedRoles.includes(payload.role)) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_PRIVILEGES',
              message: 'Role not authorized for this operation',
            },
          });
        }
        request.user = payload;
        return;
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        });
      }
    };
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
          details: error.validation,
        },
      });
    }
    if (error.code?.startsWith('P')) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database operation failed',
        },
      });
    }
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    });
  });

  // Health check
  app.get('/api/v1/location/health', async () => {
    const now = new Date();
    return {
      success: true,
      data: {
        status: 'UP',
        engine: 'location',
        port: PORT,
        timestamp: now.toISOString(),
      }
    };
  });

  // Register routes
  await app.register(locationRoutes, { prefix: '/api/v1/location' });
  await app.register(deviceRoutes, { prefix: '/api/v1/location' });
  await app.register(trackingRoutes, { prefix: '/api/v1/location' });
  await app.register(fuelReportRoutes, { prefix: '/api/v1/fuel' });
  await app.register(coldChainRoutes, { prefix: '/api/v1' });

  // Start server
  await app.listen({ port: PORT, host: HOST });
  console.log(`Engine Location running on port ${PORT}`);
}

void main();
export { app };
