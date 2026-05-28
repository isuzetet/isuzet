import { prisma } from '@ruit/shared-db';
import { getRedisClient } from '@ruit/shared-utils';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    api?: 'up' | 'down';
  };
  version?: string;
  uptime?: number;
}

/**
 * Perform health check on all service dependencies
 * Call from GET /health or GET /api/v1/{engine}/health
 */
export async function performHealthCheck(engineName?: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const services = {
    database: 'down' as 'up' | 'down',
    cache: 'down' as 'up' | 'down',
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'up';
  } catch (error) {
    console.error(`[HEALTH] Database check failed:`, error);
  }

  // Check Redis connectivity
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    if (pong === 'PONG') {
      services.cache = 'up';
    }
  } catch (error) {
    console.error(`[HEALTH] Cache check failed:`, error);
  }

  // Determine overall status
  const down = Object.values(services).filter(s => s === 'down').length;
  const status: 'healthy' | 'degraded' | 'unhealthy' =
    down === 0 ? 'healthy' : down < Object.values(services).length ? 'degraded' : 'unhealthy';

  return {
    status,
    timestamp: new Date().toISOString(),
    services,
    version: process.env.APP_VERSION || 'unknown',
    uptime: process.uptime(),
  };
}

/**
 * FastifyPlugin to register health check endpoint
 */
export async function registerHealthCheckRoute(app: any) {
  app.get('/health', async (request: any, reply: any) => {
    const health = await performHealthCheck();
    
    // Return 503 if unhealthy/degraded, 200 if healthy
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return reply.code(statusCode).send(health);
  });

  // Also register versioned endpoint if engine has specific prefix
  app.get('/api/v1/:engineId/health', async (request: any, reply: any) => {
    const health = await performHealthCheck(request.params.engineId);
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return reply.code(statusCode).send(health);
  });
}
