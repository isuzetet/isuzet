import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { triggerMedicalSOS, getMedicalSOSIncident } from '../services/medical-sos.service.js';

const MedicalSOSSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export default async function medicalSosRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/sos/medical
   * Trigger medical emergency SOS
   * Auth: DRIVER
   */
  fastify.post('/api/v1/sos/medical', async (request, reply) => {
    try {
      // Auth check
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can trigger medical SOS',
          },
        });
      }

      // Validate input
      const data = MedicalSOSSchema.parse(request.body);

      // Get driver ID from user
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

      const result = await triggerMedicalSOS(driverId, data.lat, data.lng);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Medical SOS error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'MEDICAL_SOS_FAILED',
          message: error.message || 'Failed to trigger medical SOS',
        },
      });
    }
  });

  /**
   * GET /api/v1/sos/medical/:incidentId
   * Get medical SOS incident details
   * Auth: DRIVER, OPS_ADMIN
   */
  fastify.get('/api/v1/sos/medical/:incidentId', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Not authorized',
          },
        });
      }

      const { incidentId } = request.params as { incidentId: string };

      const incident = await getMedicalSOSIncident(incidentId);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Medical SOS incident not found',
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: incident,
      });
    } catch (error: any) {
      console.error('Get medical SOS error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'GET_FAILED',
          message: 'Failed to get medical SOS incident',
        },
      });
    }
  });
}
