import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import {
  createFleetTruck,
  deleteFleetDriver,
  deleteFleetTruck,
  getFleetDriver,
  getFleetDrivers,
  getFleetMetrics,
  getFleetRecommendations,
  getFleetTruck,
  getFleetTrucks,
  getIdleTrucks,
  getLiveFleet,
  inviteFleetDriver,
  updateFleetDriver,
  updateFleetTruck,
} from '../services/fleet.service.js';

const FLEET_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER];
const FLEET_OPS_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN];

const CreateTruckSchema = z.object({
  licensePlate: z.string().min(2),
  plateNumber: z.string().min(2).optional(),
  capacityKg: z.number().int().positive(),
  registrationNumber: z.string().optional(),
  truckType: z.string().optional(),
  bodyType: z.string().optional(),
  driverId: z.string().optional(),
  status: z.string().optional(),
});

const UpdateTruckSchema = CreateTruckSchema.partial().extend({
  driverId: z.string().nullable().optional(),
});

const InviteDriverSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(9),
  licenseNumber: z.string().optional(),
  paymentType: z.string().optional(),
  paymentAmount: z.number().int().nonnegative().optional(),
});

const UpdateDriverSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(9).optional(),
  licenseNumber: z.string().optional(),
  active: z.boolean().optional(),
  status: z.string().optional(),
  paymentType: z.string().optional(),
  paymentAmount: z.number().int().nonnegative().nullable().optional(),
});

function sendRouteError(reply: FastifyReply, error: any) {
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Unexpected fleet error',
    },
  });
}

export default async function fleetRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/metrics',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        return reply.send(await getFleetMetrics(request.user!));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/trucks',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        return reply.send(await getFleetTrucks(request.user!));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/trucks',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const body = CreateTruckSchema.parse(request.body);
        return reply.status(201).send(await createFleetTruck(request.user!, body));
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid truck payload', details: error.flatten() },
          });
        }
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/trucks/:truckId',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { truckId } = request.params as { truckId: string };
        return reply.send(await getFleetTruck(request.user!, truckId));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.patch(
    '/trucks/:truckId',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { truckId } = request.params as { truckId: string };
        const body = UpdateTruckSchema.parse(request.body);
        return reply.send(await updateFleetTruck(request.user!, truckId, body));
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid truck payload', details: error.flatten() },
          });
        }
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.delete(
    '/trucks/:truckId',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { truckId } = request.params as { truckId: string };
        return reply.send(await deleteFleetTruck(request.user!, truckId));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/drivers',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        return reply.send(await getFleetDrivers(request.user!));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/drivers',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const body = InviteDriverSchema.parse(request.body);
        return reply.status(201).send(await inviteFleetDriver(request.user!, body));
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid driver payload', details: error.flatten() },
          });
        }
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/drivers/invite',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const body = InviteDriverSchema.parse(request.body);
        return reply.status(201).send(await inviteFleetDriver(request.user!, body));
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid driver payload', details: error.flatten() },
          });
        }
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/drivers/:driverId',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { driverId } = request.params as { driverId: string };
        return reply.send(await getFleetDriver(request.user!, driverId));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.patch(
    '/drivers/:driverId',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { driverId } = request.params as { driverId: string };
        const body = UpdateDriverSchema.parse(request.body);
        return reply.send(await updateFleetDriver(request.user!, driverId, body));
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid driver payload', details: error.flatten() },
          });
        }
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.delete(
    '/drivers/:driverId',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { driverId } = request.params as { driverId: string };
        return reply.send(await deleteFleetDriver(request.user!, driverId));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/live',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        return reply.send(await getLiveFleet(request.user!));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/idle',
    { preHandler: (fastify as any).requireRole(FLEET_OPS_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const { fleetOwnerId } = request.query as { fleetOwnerId?: string };
        return reply.send(await getIdleTrucks(request.user!, fleetOwnerId));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/recommendations',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        return reply.send(await getFleetRecommendations(request.user!));
      } catch (error) {
        return sendRouteError(reply, error);
      }
    }
  );
}
