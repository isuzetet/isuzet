import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import {
  reportDriverNoShow,
  reportOrdererNoShow,
  reportRecipientAbsent,
} from '../services/no-show.service.js';

const ReportDriverNoShowSchema = z.object({
  // No body needed - uses loadId from URL
});

const ReportOrdererNoShowSchema = z.object({
  // No body needed - uses loadId from URL
});

const ReportRecipientAbsentSchema = z.object({
  // No body needed - uses tripId and stopId from URL
});

export default async function noShowRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/loads/:loadId/no-show/driver
   * Report driver no-show (called by orderer)
   * Auth: ORDERER
   */
  fastify.post('/api/v1/loads/:loadId/no-show/driver', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only orderers can report driver no-show',
          },
        });
      }

      const { loadId } = request.params as { loadId: string };

      const result = await reportDriverNoShow(loadId, user.id);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Report driver no-show error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'REPORT_FAILED',
          message: error.message || 'Failed to report driver no-show',
        },
      });
    }
  });

  /**
   * POST /api/v1/loads/:loadId/no-show/orderer
   * Report orderer no-show (called by driver)
   * Auth: DRIVER
   */
  fastify.post('/api/v1/loads/:loadId/no-show/orderer', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can report orderer no-show',
          },
        });
      }

      const { loadId } = request.params as { loadId: string };

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

      const result = await reportOrdererNoShow(loadId, driverId);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Report orderer no-show error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'REPORT_FAILED',
          message: error.message || 'Failed to report orderer no-show',
        },
      });
    }
  });

  /**
   * POST /api/v1/trips/:tripId/stops/:stopId/recipient-absent
   * Report recipient absent at delivery stop
   * Auth: DRIVER
   */
  fastify.post('/api/v1/trips/:tripId/stops/:stopId/recipient-absent', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can report recipient absent',
          },
        });
      }

      const { tripId, stopId } = request.params as { tripId: string; stopId: string };

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

      const result = await reportRecipientAbsent(tripId, stopId, driverId);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Report recipient absent error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'REPORT_FAILED',
          message: error.message || 'Failed to report recipient absent',
        },
      });
    }
  });
}
