import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { reportObstacle, approveReroute } from '../services/reroute.service.js';

const ReportObstacleSchema = z.object({
  obstacleType: z.enum(['ROAD_CLOSED', 'FLOODING', 'ACCIDENT', 'CHECKPOINT_CLOSED']),
  lat: z.number(),
  lng: z.number(),
  detourEstimateMin: z.number(),
});

const ApproveRerouteSchema = z.object({
  approvedByUserId: z.string(),
});

export default async function rerouteRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/reroute/report
   * Report an obstacle and request reroute
   * Auth: DRIVER
   */
  fastify.post('/api/v1/trips/:tripId/reroute/report', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can report obstacles',
          },
        });
      }

      const { tripId } = request.params as { tripId: string };
      const data = ReportObstacleSchema.parse(request.body);

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

      const result = await reportObstacle(driverId, tripId, data);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Report obstacle error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'REPORT_FAILED',
          message: error.message || 'Failed to report obstacle',
        },
      });
    }
  });

  /**
   * POST /api/v1/reroute/:tripId/approve
   * OPS Admin approves reroute and clears deviation penalty
   * Auth: OPS_ADMIN
   */
  fastify.post('/api/v1/reroute/:tripId/approve', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only OPS Admin can approve reroutes',
          },
        });
      }

      const { tripId } = request.params as { tripId: string };

      await approveReroute(tripId, user.id);

      return reply.status(200).send({
        success: true,
        data: { message: 'Reroute approved' },
      });
    } catch (error: any) {
      console.error('Approve reroute error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'APPROVE_FAILED',
          message: error.message || 'Failed to approve reroute',
        },
      });
    }
  });
}
