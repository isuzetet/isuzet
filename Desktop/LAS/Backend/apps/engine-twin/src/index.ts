import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3012;

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

// Health check endpoint
app.get('/api/v1/twin/health', async () => {
  return {
    status: 'UP',
    engine: 'twin',
    version: '1.0.0',
    mode: 'STUB',
    message: 'Digital Twin — Phase 2',
    timestamp: new Date().toISOString(),
  };
});

// Simulate endpoint (stub)
app.get('/api/v1/twin/simulate', async () => {
  return {
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Digital Twin simulation available in Phase 2',
    },
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Engine 13 (Digital Twin) running on port ${PORT} [STUB MODE]`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app };
