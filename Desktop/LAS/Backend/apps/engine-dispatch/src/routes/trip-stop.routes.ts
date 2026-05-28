import 'dotenv/config';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createMultiStopTrip,
  confirmStopArrival,
  confirmStopDelivery,
  getTripStops,
  confirmPickup
} from '../services/trip-stop.service.js';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { ROLES } from '@ruit/shared-types';

// Schema for creating multi-stop trip
const CreateStopsSchema = z.object({
  stops: z.array(z.object({
    stopNumber: z.number().int().min(1),
    locationLat: z.number(),
    locationLng: z.number(),
    locationName: z.string(),
    cargoQuantityKg: z.number().int(),
    recipientName: z.string(),
    recipientPhone: z.string(),
    timeWindowStart: z.string().datetime().optional(),
    timeWindowEnd: z.string().datetime().optional(),
    escrowReleasePct: z.number().int().min(0).max(100).optional()
  })).min(2, 'Multi-stop trips require at least 2 stops'),
  escrowMode: z.enum(['FULL_ON_FINAL', 'PROPORTIONAL', 'ORDERER_CONFIG'])
});

// Schema for stop arrival
const StopArrivalSchema = z.object({
  driverLat: z.number(),
  driverLng: z.number()
});

// Schema for stop delivery
const StopDeliverySchema = z.object({
  recipientOtp: z.string().length(4),
  podPhotoUrl: z.string().optional()
});

// Schema for pickup confirmation with mandatory cargo photo
const PickupConfirmationSchema = z.object({
  loadStopId: z.string(),
  cargoPhotoUrl: z.string().min(1, 'Cargo photo URL is required'),
  cargoPhotoGeoLat: z.number(),
  cargoPhotoGeoLng: z.number(),
  cargoPhotoTimestamp: z.string().datetime(),
  weightTicketPhotoUrl: z.string().optional()
});

export default async function tripStopRoutes(fastify: FastifyInstance) {
  // POST /api/v1/trips/:tripId/stops
  // Auth: ORDERER role (adding stops to an existing trip before it starts)
  fastify.post('/:tripId/stops', {
    preHandler: [requireAuth, requireRole([ROLES.ORDERER, ROLES.SUPER_ADMIN, ROLES.OPS_ADMIN])]
  }, async (request: FastifyRequest & { user?: any }, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };
      const body = CreateStopsSchema.parse(request.body);

      // Get loadId from trip
      const { prisma } = await import('@ruit/shared-db');
      const trip = await (prisma as any).trip.findUnique({
        where: { id: tripId },
        include: { load: true }
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' }
        });
      }

      // Check if orderer owns this trip's load
      if (request.user?.role === ROLES.ORDERER && trip.load?.ordererId !== request.user.sub) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to add stops to this trip' }
        });
      }

      // Parse dates if provided
      const stopsWithDates = body.stops.map(stop => ({
        ...stop,
        timeWindowStart: stop.timeWindowStart ? new Date(stop.timeWindowStart) : undefined,
        timeWindowEnd: stop.timeWindowEnd ? new Date(stop.timeWindowEnd) : undefined
      }));

      const result = await createMultiStopTrip({
        loadId: trip.loadId,
        stops: stopsWithDates,
        escrowMode: body.escrowMode
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create trip stops' }
      });
    }
  });

  // POST /api/v1/trips/:tripId/stops/:stopId/arrive
  // Auth: DRIVER role
  fastify.post('/:tripId/stops/:stopId/arrive', {
    preHandler: [requireAuth, requireRole([ROLES.DRIVER])]
  }, async (request: FastifyRequest & { user?: any }, reply: FastifyReply) => {
    try {
      const { tripId, stopId } = request.params as { tripId: string; stopId: string };
      const body = StopArrivalSchema.parse(request.body);

      // Verify driver is assigned to this trip
      const { prisma } = await import('@ruit/shared-db');
      const trip = await (prisma as any).trip.findUnique({
        where: { id: tripId }
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' }
        });
      }

      if (trip.driverId !== request.user?.sub) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to update this trip' }
        });
      }

      const result = await confirmStopArrival({
        tripId,
        stopId,
        driverLat: body.driverLat,
        driverLng: body.driverLng
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm stop arrival' }
      });
    }
  });

  // POST /api/v1/trips/:tripId/stops/:stopId/deliver
  // Auth: DRIVER role
  fastify.post('/:tripId/stops/:stopId/deliver', {
    preHandler: [requireAuth, requireRole([ROLES.DRIVER])]
  }, async (request: FastifyRequest & { user?: any }, reply: FastifyReply) => {
    try {
      const { tripId, stopId } = request.params as { tripId: string; stopId: string };
      const body = StopDeliverySchema.parse(request.body);

      // Verify driver is assigned to this trip
      const { prisma } = await import('@ruit/shared-db');
      const trip = await (prisma as any).trip.findUnique({
        where: { id: tripId }
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' }
        });
      }

      if (trip.driverId !== request.user?.sub) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to update this trip' }
        });
      }

      const result = await confirmStopDelivery({
        tripId,
        stopId,
        recipientOtp: body.recipientOtp,
        podPhotoUrl: body.podPhotoUrl
      });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm delivery' }
      });
    }
  });

  // GET /api/v1/trips/:tripId/stops
  // Auth: any authenticated (DRIVER, ORDERER, FLEET_OWNER, ADMIN)
  fastify.get('/:tripId/stops', {
    preHandler: [requireAuth, requireRole([ROLES.DRIVER, ROLES.ORDERER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN])]
  }, async (request: FastifyRequest & { user?: any }, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };

      // Verify user is related to this trip
      const { prisma } = await import('@ruit/shared-db');
      const trip = await (prisma as any).trip.findUnique({
        where: { id: tripId },
        include: { load: true }
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' }
        });
      }

      const userRole = request.user?.role;
      const userId = request.user?.sub;

      // Check authorization based on role
      let isAuthorized = false;
      if (userRole === ROLES.DRIVER && trip.driverId === userId) isAuthorized = true;
      if (userRole === ROLES.ORDERER && trip.load?.ordererId === userId) isAuthorized = true;
      if (userRole === ROLES.FLEET_OWNER && trip.fleetOwnerId === userId) isAuthorized = true;
      if (userRole === ROLES.FLEET_MANAGER && trip.fleetOwnerId === userId) isAuthorized = true;
      if ([ROLES.OPS_ADMIN, ROLES.OPS_VIEWER, ROLES.SUPER_ADMIN].includes(userRole)) isAuthorized = true;

      if (!isAuthorized) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to view this trip' }
        });
      }

      const result = await getTripStops(tripId);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch trip stops' }
      });
    }
  });

  // POST /api/v1/trips/:tripId/pickup-confirm
  // Auth: DRIVER role - Confirm pickup with mandatory cargo photo
  fastify.post('/:tripId/pickup-confirm', {
    preHandler: [requireAuth, requireRole([ROLES.DRIVER])]
  }, async (request: FastifyRequest & { user?: any }, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };
      const body = PickupConfirmationSchema.parse(request.body);

      // Verify driver is assigned to this trip
      const { prisma } = await import('@ruit/shared-db');
      const trip = await (prisma as any).trip.findUnique({
        where: { id: tripId }
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' }
        });
      }

      if (trip.driverId !== request.user?.sub) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized to confirm pickup for this trip' }
        });
      }

      const result = await confirmPickup({
        tripId,
        loadStopId: body.loadStopId,
        cargoPhotoUrl: body.cargoPhotoUrl,
        cargoPhotoGeoLat: body.cargoPhotoGeoLat,
        cargoPhotoGeoLng: body.cargoPhotoGeoLng,
        cargoPhotoTimestamp: new Date(body.cargoPhotoTimestamp),
        weightTicketPhotoUrl: body.weightTicketPhotoUrl
      });

      if (!result.success) {
        const statusCode = result.error?.code === 'CARGO_PHOTO_REQUIRED' ? 400 : 
                           result.error?.code === 'FORBIDDEN' ? 403 : 400;
        return reply.status(statusCode).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm pickup' }
      });
    }
  });
}
