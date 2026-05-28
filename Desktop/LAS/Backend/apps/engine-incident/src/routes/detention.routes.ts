import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { reportCheckpointDetention, resolveDetention } from '../services/detention.service.js';

const ReportDetentionSchema = z.object({
  checkpointName: z.string(),
  lat: z.number(),
  lng: z.number(),
  reason: z.string(),
});

const ResolveDetentionSchema = z.object({
  resolvedByUserId: z.string(),
});

export default async function detentionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/detention/report
   * Report checkpoint detention
   * Auth: DRIVER
   */
  fastify.post('/api/v1/trips/:tripId/detention/report', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can report detention',
          },
        });
      }

      const { tripId } = request.params as { tripId: string };
      const data = ReportDetentionSchema.parse(request.body);

      const driverId = user.driverId;
      if (!driverId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DRIVER',
            message: 'User is not registered as a driver',
          },
        });
      }

      const result = await reportCheckpointDetention(driverId, tripId, data);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Report detention error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'REPORT_FAILED',
          message: error.message || 'Failed to report detention',
        },
      });
    }
  });

  /**
   * POST /api/v1/detention/:incidentId/resolve
   * Resolve checkpoint detention (driver or OPS)
   * Auth: DRIVER, OPS_ADMIN
   */
  fastify.post('/api/v1/detention/:incidentId/resolve', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Not authorized to resolve detention',
          },
        });
      }

      const { incidentId } = request.params as { incidentId: string };

      await resolveDetention(incidentId, user.id);

      return reply.status(200).send({
        success: true,
        data: { message: 'Detention resolved' },
      });
    } catch (error: any) {
      console.error('Resolve detention error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'RESOLVE_FAILED',
          message: error.message || 'Failed to resolve detention',
        },
      });
    }
  });
}
