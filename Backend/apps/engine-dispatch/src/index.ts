import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@ruit/shared-db';
import { toEthiopianDate } from '@ruit/shared-utils';
import { verifyAccessToken } from '@ruit/shared-auth';
import terminalRoutes from './routes/terminal.routes.js';
import backhaulRoutes from './routes/backhaul.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import zoneRoutes from './routes/zone.routes.js';
import fleetRoutes from './routes/fleet.routes.js';
import consolidationRoutes from './routes/consolidation.routes.js';
import tripStopRoutes from './routes/trip-stop.routes.js';
import routeContractRoutes from './routes/route-contract.routes.js';
import directBookingRoutes from './routes/direct-booking.routes.js';
import offPlatformRoutes from './routes/off-platform.routes.js';
import earningsComparisonRoutes from './routes/earnings-comparison.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import warehouseQueueRoutes from './routes/warehouse-queue.routes.js';
import livestockRoutes from './routes/livestock.routes.js';
import noShowRoutes from './routes/no-show.routes.js';
import stopEscrowRoutes from './routes/stop-escrow.routes.js';
import blockPreferenceRoutes from './routes/block-preference.routes.js';
import bulkLoadRoutes from './routes/bulk-load.routes.js';
import fuelEfficiencyRoutes from './routes/fuel-efficiency.routes.js';
import dispatchRoutes from './routes/dispatch.routes.js';
import waybillRoutes from './routes/waybill.routes.js';
import ordererReliabilityRoutes from './routes/orderer-reliability.routes.js';
import loadRoutes from './routes/load.routes.js';
import agentRoutes from './routes/agent.routes.js';

const app = Fastify({
  logger: {
    level: 'info',
  },
});

async function main() {
  // CORS
  await app.register(cors as any, {
    origin: true,
    credentials: true,
  });

  // requireAuth middleware
  app.decorate('requireAuth', async (request: any, reply: any) => {
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
  app.get('/api/v1/dispatch/health', async () => {
    const now = new Date();
    return {
      status: 'UP',
      engine: 'dispatch',
      timestamp: now.toISOString(),
      ethiopian_date: toEthiopianDate(now),
    };
  });

  // Register routes
  await app.register(terminalRoutes, { prefix: '/api/v1/dispatch/terminal' });
  await app.register(backhaulRoutes, { prefix: '/api/v1/dispatch/backhaul' });
  await app.register(availabilityRoutes, { prefix: '/api/v1/dispatch/availability' });
  await app.register(zoneRoutes, { prefix: '/api/v1/dispatch/zone' });
  await app.register(fleetRoutes, { prefix: '/api/v1/dispatch/fleet' });
  await app.register(consolidationRoutes, { prefix: '/api/v1/dispatch/consolidated-loads' });
  await app.register(tripStopRoutes, { prefix: '/api/v1/trips' });
  await app.register(routeContractRoutes, { prefix: '/api/v1/contracts/route' });
  await app.register(directBookingRoutes, { prefix: '/api/v1/bookings/direct' });
  await app.register(offPlatformRoutes, { prefix: '/api/v1/trips' });
  await app.register(earningsComparisonRoutes, { prefix: '/api/v1/drivers' });
  await app.register(maintenanceRoutes, { prefix: '/api/v1/fleet' });
  await app.register(warehouseQueueRoutes, { prefix: '/api/v1/warehouses' });
  await app.register(livestockRoutes, { prefix: '/api/v1' });
  await app.register(noShowRoutes, { prefix: '/api/v1' });
  await app.register(stopEscrowRoutes, { prefix: '/api/v1' });
  await app.register(blockPreferenceRoutes, { prefix: '/api/v1' });
  await app.register(bulkLoadRoutes, { prefix: '/api/v1' });
  await app.register(fuelEfficiencyRoutes, { prefix: '/api/v1/fuel' });
  await app.register(dispatchRoutes, { prefix: '/api/v1/dispatch' });
  await app.register(waybillRoutes, { prefix: '/api/v1/dispatch' });
  await app.register(ordererReliabilityRoutes, { prefix: '/api/v1/dispatch' });
  await app.register(loadRoutes, { prefix: '/api/v1/dispatch' });
  await app.register(agentRoutes, { prefix: '/api/v1/agent' });

  // Start server
  const PORT = parseInt(process.env.PORT || '3015');
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Engine Dispatch running on port ${PORT}`);
}

void main();

export { app };
