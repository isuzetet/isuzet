import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import {
  confirmStopDeliveryPhotoGps,
  confirmStopDeliveryAgent,
  autoReleaseStopEscrow,
} from '../services/trip-stop.service.js';

const ConfirmPhotoGpsSchema = z.object({
  photoUrl: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const ConfirmAgentSchema = z.object({
  agentUserId: z.string(),
});

export default async function stopEscrowRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/trips/:tripId/stops/:stopId/confirm-photo-gps
   * Confirm stop delivery using driver photo + GPS validation
   * Auth: DRIVER
   */
  fastify.post('/api/v1/trips/:tripId/stops/:stopId/confirm-photo-gps', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can confirm delivery',
          },
        });
      }

      const { tripId, stopId } = request.params as { tripId: string; stopId: string };
      const data = ConfirmPhotoGpsSchema.parse(request.body);

      const result = await confirmStopDeliveryPhotoGps({
        tripId,
        stopId,
        photoUrl: data.photoUrl,
        lat: data.lat,
        lng: data.lng,
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      console.error('Confirm photo+GPS error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'CONFIRM_FAILED',
          message: error.message || 'Failed to confirm delivery',
        },
      });
    }
  });

  /**
   * POST /api/v1/trips/:tripId/stops/:stopId/confirm-agent
   * Confirm stop delivery using community agent confirmation
   * Auth: DRIVER
   */
  fastify.post('/api/v1/trips/:tripId/stops/:stopId/confirm-agent', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user || ![ROLES.DRIVER].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Only drivers can request agent confirmation',
          },
        });
      }

      const { tripId, stopId } = request.params as { tripId: string; stopId: string };
      const data = ConfirmAgentSchema.parse(request.body);

      const result = await confirmStopDeliveryAgent({
        tripId,
        stopId,
        agentUserId: data.agentUserId,
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      console.error('Confirm agent error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'CONFIRM_FAILED',
          message: error.message || 'Failed to confirm delivery',
        },
      });
    }
  });

  /**
   * POST /api/v1/stops/:stopId/auto-release
   * Auto-release escrow after 24 hours (called by worker)
   * Auth: SYSTEM (no auth check - called by worker)
   */
  fastify.post('/api/v1/stops/:stopId/auto-release', async (request, reply) => {
    try {
      const { stopId } = request.params as { stopId: string };

      const result = await autoReleaseStopEscrow(stopId);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error: any) {
      console.error('Auto-release error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: error.message || 'AUTO_RELEASE_FAILED',
          message: error.message || 'Failed to auto-release escrow',
        },
      });
    }
  });
}
