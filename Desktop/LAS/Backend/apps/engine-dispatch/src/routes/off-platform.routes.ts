import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { prisma } from '@ruit/shared-db';
import {
  createOffPlatformTrip,
  verifyOffPlatformTrip,
  getOffPlatformTrips,
} from '../services/off-platform-trip.service.js';

const CreateOffPlatformTripSchema = z.object({
  fleetOwnerId: z.string().optional(),
  originZoneId: z.string().optional(),
  destZoneId: z.string().optional(),
  corridorId: z.string().optional(),
  cargoType: z.string().optional(),
  weightKg: z.number().int().positive().optional(),
  earningsCents: z.number().int().nonnegative().optional(),
  completedAt: z.string().datetime(),
});

const VerifyOffPlatformTripSchema = z.object({
  tripId: z.string(),
});

export default async function offPlatformRoutes(fastify: FastifyInstance) {
  // POST /api/v1/trips/off-platform — DRIVER auth
  fastify.post<{ Body: z.infer<typeof CreateOffPlatformTripSchema> }>(
    '/off-platform',
    { preHandler: (fastify as any).requireRole([ROLES.DRIVER]) },
    async (request, reply) => {
      try {
        const body = CreateOffPlatformTripSchema.parse(request.body);
        const user = (request as any).user;

        const tripId = await createOffPlatformTrip({
          driverId: user.entity_id,
          fleetOwnerId: body.fleetOwnerId,
          originZoneId: body.originZoneId,
          destZoneId: body.destZoneId,
          corridorId: body.corridorId,
          cargoType: body.cargoType,
          weightKg: body.weightKg,
          earningsCents: body.earningsCents,
          completedAt: new Date(body.completedAt),
        });

        return { success: true, data: { tripId } };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'CREATION_FAILED', message: error.message },
        };
      }
    }
  );

  // POST /api/v1/trips/off-platform/:id/verify — FLEET_OWNER auth
  fastify.post<{ Params: { id: string } }>(
    '/off-platform/:id/verify',
    { preHandler: (fastify as any).requireRole([ROLES.FLEET_OWNER]) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const user = (request as any).user;

        const result = await verifyOffPlatformTrip({
          tripId: id,
          fleetOwnerId: user.entity_id,
        });

        return { success: true, data: result };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'VERIFICATION_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/trips/off-platform — DRIVER or FLEET_OWNER auth
  fastify.get<{}>
    (
      '/off-platform',
      {
        preHandler: (fastify as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER]),
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;

          const trips = await getOffPlatformTrips(user.entity_id, user.role);

          return { success: true, data: trips };
        } catch (error: any) {
          reply.status(400);
          return {
            success: false,
            error: { code: 'FETCH_FAILED', message: error.message },
          };
        }
      }
    );

  // GET /api/v1/off-platform/earnings-comparison — earnings comparison for a driver
  fastify.get<{ Params: { driverId: string } }>(
    '/earnings-comparison/:driverId',
    { preHandler: (fastify as any).requireAuth },
    async (request, reply) => {
      try {
        const { driverId } = request.params;
        const { month, year } = request.query as any;

        const comparison = await (prisma as any).earningsComparison.findUnique({
          where: {
            driverId_periodMonth_periodYear: {
              driverId,
              periodMonth: parseInt(month ?? new Date().getMonth() + 1),
              periodYear: parseInt(year ?? new Date().getFullYear()),
            },
          },
        });

        return { success: true, data: comparison };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );

  // GET /api/v1/off-platform/fleet-summary — fleet summary including off-platform trips
  fastify.get<{ Params: { fleetOwnerId: string } }>(
    '/fleet-summary/:fleetOwnerId',
    { preHandler: (fastify as any).requireAuth },
    async (request, reply) => {
      try {
        const { fleetOwnerId } = request.params;
        const { days } = request.query as any;
        const since = new Date(
          Date.now() - (parseInt(days ?? '30')) * 24 * 60 * 60 * 1000
        );

        const trips = await (prisma as any).offPlatformTrip.findMany({
          where: { fleetOwnerId, pickupDate: { gte: since } },
          orderBy: { pickupDate: 'desc' },
        });

        const totalEarnings = trips.reduce(
          (sum: number, t: any) => sum + t.earningsEtb,
          0
        );
        const totalBrokerCut = trips.reduce(
          (sum: number, t: any) => sum + (t.brokerCommissionEtb ?? 0),
          0
        );

        return {
          success: true,
          data: {
            trips,
            totalEarnings,
            totalBrokerCut,
            tripCount: trips.length,
          },
        };
      } catch (error: any) {
        reply.status(400);
        return {
          success: false,
          error: { code: 'FETCH_FAILED', message: error.message },
        };
      }
    }
  );
}
