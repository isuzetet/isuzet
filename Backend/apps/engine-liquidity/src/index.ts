import 'dotenv/config';
/**
 * Engine 4: Liquidity, Escrow, Exposure & COD Engine
 * Port: 3004
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { verifyAccessToken } from '@ruit/shared-auth';
import { registerPaymentRails } from '@ruit/shared-db';
import liquidityRoutes from './routes/liquidity.routes.js';
import { registerInsuranceRoutes } from './routes/insurance.routes.js';
import { payoutSlaService } from './services/payout-sla.service.js';
// import codRoutes from './routes/cod.routes.js';

const app = Fastify({
  logger: { level: 'info' }
});

async function main() {
  // Register payment rails at startup
  registerPaymentRails();

  // Register CORS
  await app.register(cors as any, {
    origin: true,
    credentials: true
  });

  // RBAC Middleware
  app.decorate('requireRole', (allowedRoles: string[]) => {
    return async (request: any, reply: any) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
        }
        const token = authHeader.slice(7);
        const payload = await verifyAccessToken(token);
        if (!allowedRoles.includes(payload.role)) {
          return reply.status(403).send({ success: false, error: { code: 'INSUFFICIENT_PRIVILEGES', message: 'Role not authorized for this operation' } });
        }
        request.user = payload;
        return;
      } catch (error) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
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
  app.get('/api/v1/liquidity/health', async () => ({
    status: 'UP',
    engine: 'liquidity',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }));

  // Register routes
  await app.register(liquidityRoutes, { prefix: '/api/v1/liquidity' });
  await app.register(registerInsuranceRoutes, { prefix: '/api/v1/insurance' });
  // await app.register(codRoutes, { prefix: '/api/v1/finance' });

  // Start server
  const PORT = parseInt(process.env.PORT || '3004', 10);
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 Engine 4 (Liquidity) running on port ${PORT}`);
}

void main();

export { app, payoutSlaService };



