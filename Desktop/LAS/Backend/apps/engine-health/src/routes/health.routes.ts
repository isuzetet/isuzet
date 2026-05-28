import { FastifyInstance } from 'fastify';
import { cached } from '@ruit/shared-utils';
import { getSystemStatus, checkAllEngines, checkInfrastructure } from '../services/monitor.service.js';

export default async function healthRoutes(app: FastifyInstance) {
  // GET /api/v1/health/status - System status
  app.get('/status', async (request, reply) => {
    // Check auth
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const cacheKey = 'cache:health:status';
    const data = await cached(cacheKey, 15000, async () => {
      return await getSystemStatus();
    });

    return {
      success: true,
      data,
    };
  });

  // GET /api/v1/health/engines - Engine health summary
  app.get('/engines', async (request, reply) => {
    // Check auth
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Check role
    const allowedRoles = ['OPS_ADMIN', 'OPS_VIEWER', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PRIVILEGES',
          message: 'Role not authorized for this operation'
        }
      });
    }

    const data = await checkAllEngines();
    return {
      success: true,
      data,
    };
  });

  // GET /api/v1/health/infrastructure - Infrastructure health
  app.get('/infrastructure', async (request, reply) => {
    // Check auth
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Check role
    const allowedRoles = ['OPS_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PRIVILEGES',
          message: 'Role not authorized for this operation'
        }
      });
    }

    const data = await checkInfrastructure();
    return {
      success: true,
      data,
    };
  });
}
