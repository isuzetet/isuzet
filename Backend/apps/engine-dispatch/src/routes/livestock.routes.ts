/**
 * Phase 10: Livestock Transport Routes
 * Mortality reporting endpoint
 */

import 'dotenv/config';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, generateId, calculateLivestockPayoutCents, isLivestockHeatRestrictionActive, getConfig } from '@ruit/shared-db';
import { Prisma } from '@prisma/client';

export default async function livestockRoutes(app: FastifyInstance) {
  // POST /api/v1/trips/:tripId/livestock/mortality - Report livestock mortality (DRIVER)
  app.post('/trips/:tripId/livestock/mortality', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };
      const body = request.body as {
        count: number;
        cause: string;
      };

      if (!body.count || body.count < 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'count must be a non-negative number' },
        });
      }

      if (!body.cause || body.cause.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'cause is required' },
        });
      }

      // Get trip with load details
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { load: true },
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' },
        });
      }

      if (!trip.load) {
        return reply.status(404).send({
          success: false,
          error: { code: 'LOAD_NOT_FOUND', message: 'Load not found for trip' },
        });
      }

      // Verify this is a livestock load
      if (trip.load.cargoType !== 'LIVESTOCK') {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_LIVESTOCK', message: 'Trip is not a livestock transport' },
        });
      }

      // Check current delivered count
      const currentDelivered = trip.load.livestockDeliveredAlive ?? trip.load.livestockHeadCount ?? 0;
      const newDelivered = Math.max(0, currentDelivered - body.count);

      // Update load with mortality info
      const updatedLoad = await prisma.load.update({
        where: { id: trip.loadId },
        data: {
          livestockDeliveredAlive: newDelivered,
        },
      });

      // Create incident for mortality
      const incident = await prisma.incident.create({
        data: {
          id: generateId('inc'),
          tripId,
          incidentType: 'CARGO_DAMAGE',
          reportedBy: 'DRIVER',
          reporterRole: 'DRIVER',
          severity: body.count > (trip.load.livestockHeadCount || 0) * 0.1 ? 'HIGH' : 'MEDIUM',
          description: `Livestock mortality: ${body.count} head(s) - Cause: ${body.cause}`,
          status: 'OPEN',
        },
      });

      // Calculate adjusted payment (to be applied at delivery confirmation)
      const headCount = trip.load.livestockHeadCount || 1;
      const mortalityRate = body.count / headCount;
      
      // Use fleetPayoutEtb converted to cents for payout calculation
      const originalPayoutCents = trip.load.fleetPayoutEtb 
        ? Math.round((trip.load.fleetPayoutEtb as any).toNumber() * 100)
        : 0;
      
      const adjustedPayoutCents = calculateLivestockPayoutCents(
        originalPayoutCents,
        headCount,
        newDelivered
      );

      return reply.status(200).send({
        success: true,
        data: {
          tripId,
          mortalityReported: body.count,
          cause: body.cause,
          remainingHeadCount: newDelivered,
          originalHeadCount: headCount,
          mortalityRate: Math.round(mortalityRate * 100) / 100,
          adjustedPayoutCents,
          incidentId: incident.id,
          reportedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error reporting livestock mortality:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to report livestock mortality' },
      });
    }
  });

  // GET /api/v1/trips/:tripId/livestock/status - Get livestock transport status
  app.get('/trips/:tripId/livestock/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { load: true },
      });

      if (!trip) {
        return reply.status(404).send({
          success: false,
          error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' },
        });
      }

      if (!trip.load || trip.load.cargoType !== 'LIVESTOCK') {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_LIVESTOCK', message: 'Trip is not a livestock transport' },
        });
      }

      const headCount = trip.load.livestockHeadCount || 0;
      const deliveredAlive = trip.load.livestockDeliveredAlive ?? headCount;
      const mortality = headCount - deliveredAlive;

      return reply.status(200).send({
        success: true,
        data: {
          tripId,
          species: trip.load.livestockSpecies,
          headCount,
          deliveredAlive,
          mortality,
          mortalityRate: headCount > 0 ? Math.round((mortality / headCount) * 100) / 100 : 0,
          vetCertUrl: trip.load.vetCertificateUrl,
          deliveryDeadline: trip.load.deliveryDeadline,
          paymentBasis: trip.load.paymentBasis,
        },
      });
    } catch (error) {
      console.error('Error getting livestock status:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get livestock status' },
      });
    }
  });
}