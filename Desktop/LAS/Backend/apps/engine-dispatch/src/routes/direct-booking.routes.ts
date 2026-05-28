import 'dotenv/config';
import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, requireKycTier } from '@ruit/shared-auth';
import { ROLES } from '@ruit/shared-types';
import {
  createDirectBooking,
  respondToDirectBooking,
  getDirectBookingById,
} from '../services/direct-booking.service.js';

export default async function directBookingRoutes(app: FastifyInstance) {
  // POST /api/v1/bookings/direct - Create direct booking (ORDERER)
  // Auth: Requires KYC Tier 2 (marketplace feature)
  app.post('/', {
    preHandler: [
      requireAuth,
      requireRole([ROLES.ORDERER]),
      requireKycTier(2)
    ]
  }, async (request, reply) => {
    try {
      const { loadId, ordererId, requestedDriverId, requestedTruckId } = request.body as {
        loadId: string;
        ordererId: string;
        requestedDriverId: string;
        requestedTruckId?: string;
      };

      if (!loadId || !ordererId || !requestedDriverId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'loadId, ordererId, and requestedDriverId are required' },
        });
      }

      const result = await createDirectBooking({ loadId, ordererId, requestedDriverId, requestedTruckId });

      if (!result.success) {
        const statusCode = result.error?.code === 'UNAUTHORIZED' ? 403 : 400;
        return reply.status(statusCode).send(result);
      }

      return reply.status(201).send(result);
    } catch (error) {
      console.error('Error creating direct booking:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create direct booking' },
      });
    }
  });

  // POST /api/v1/bookings/direct/:id/respond - Respond to direct booking (DRIVER)
  // Auth: Requires KYC Tier 2 (marketplace feature)
  app.post('/:id/respond', {
    preHandler: [
      requireAuth,
      requireRole([ROLES.DRIVER]),
      requireKycTier(2)
    ]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { driverId, accept } = request.body as { driverId: string; accept: boolean };

      if (!driverId || accept === undefined) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'driverId and accept are required' },
        });
      }

      const result = await respondToDirectBooking({ bookingId: id, driverId, accept });

      if (!result.success) {
        const statusCode = result.error?.code === 'UNAUTHORIZED' ? 403 : 
                          result.error?.code === 'BOOKING_NOT_FOUND' ? 404 : 400;
        return reply.status(statusCode).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error responding to direct booking:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to respond to direct booking' },
      });
    }
  });

  // GET /api/v1/bookings/direct/:id - Get booking details
  // Auth: Requires KYC Tier 2 (marketplace feature)
  app.get('/:id', {
    preHandler: [
      requireAuth,
      requireRole([ROLES.DRIVER, ROLES.ORDERER, ROLES.FLEET_OWNER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN]),
      requireKycTier(2)
    ]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await getDirectBookingById(id);

      if (!result.success) {
        return reply.status(404).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error getting direct booking:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get direct booking' },
      });
    }
  });
}
