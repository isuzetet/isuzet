import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { toEthiopianDate } from '@ruit/shared-utils';
import { dataRoutes } from './routes/data.routes.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const PORT = parseInt(process.env.PORT || '3008', 10);

async function main() {
  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Health endpoint (before route prefix)
  app.get('/api/v1/data/health', async () => ({
    status: 'UP',
    engine: 'data',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ethiopianDate: toEthiopianDate(new Date()),
  }));

  // Register data routes with /api/v1/data prefix
  await app.register(dataRoutes, { prefix: '/api/v1/data' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    });
  });

  // Start server
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`Engine 8 (Data Aggregation) running on port ${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
