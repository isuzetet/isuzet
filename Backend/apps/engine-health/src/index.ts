import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { verifyAccessToken } from '@ruit/shared-auth';
import { toEthiopianDate } from '@ruit/shared-utils';
import healthRoutes from './routes/health.routes.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3011;

const app = Fastify({
  logger: {
    level: 'info',
  },
});

// Register CORS
app.register(cors, {
  origin: true,
  credentials: true,
});

// Auth middleware using verifyAccessToken
app.decorate('authenticate', async (request: any, reply: any) => {
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
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
});

// Register routes
app.register(healthRoutes, { prefix: '/api/v1/health' });

// Health check endpoint
app.get('/api/v1/health/health', async () => {
  return {
    status: 'UP',
    engine: 'health',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ethiopianDate: toEthiopianDate(new Date()),
  };
});

// Public ping endpoint
app.get('/api/v1/health/ping', async () => {
  return {
    pong: true,
    timestamp: new Date().toISOString(),
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Engine 11 (Health Monitor) running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app };
