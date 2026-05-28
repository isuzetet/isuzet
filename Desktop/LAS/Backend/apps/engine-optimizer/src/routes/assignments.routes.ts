import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function assignmentsRoutes(app: FastifyInstance) {
  // POST /api/v1/assignments/:id/respond - placeholder
  app.post('/:id/respond', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Assignment response coming soon' }
    });
  });

  // GET /api/v1/assignments/:id - placeholder
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Assignment fetch coming soon' }
    });
  });

  // GET /api/v1/assignments - placeholder
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Assignments list coming soon' }
    });
  });
}
