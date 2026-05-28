import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ROLES } from '@ruit/shared-types';
import { AccessTokenPayload } from '@ruit/shared-auth';
import {
  createAvailabilitySlot,
  getAvailabilitySlots,
  deleteAvailabilitySlot,
} from '../services/availability.service.js';

const FLEET_ROLES = [ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER];

export default async function availabilityRoutes(fastify: FastifyInstance) {
  // POST /api/v1/dispatch/availability/slot
  fastify.post(
    '/slot',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const schema = z.object({
        truckId: z.string(),
        driverId: z.string().optional(),
        availableFrom: z.string(),
        availableUntil: z.string().optional(),
        locationLat: z.number(),
        locationLng: z.number(),
        zoneId: z.string().optional(),
        corridorPreferenceId: z.string().optional(),
        isRecurring: z.boolean().optional(),
        recurringDays: z.array(z.string()).optional(),
      });

      try {
        const body = schema.parse(request.body);
        const user = request.user!;
        const result = await createAvailabilitySlot(body, user.entity_id);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'CREATE_SLOT_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/dispatch/availability/slots
  fastify.get(
    '/slots',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const result = await getAvailabilitySlots(user.entity_id);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GET_SLOTS_FAILED', message: error.message },
        });
      }
    }
  );

  // DELETE /api/v1/dispatch/availability/slot/:id
  fastify.delete(
    '/slot/:id',
    { preHandler: (fastify as any).requireRole(FLEET_ROLES) },
    async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const user = request.user!;
        const result = await deleteAvailabilitySlot(id, user.entity_id);
        return reply.send(result);
      } catch (error: any) {
        if (error.code) {
          return reply.status(400).send({ success: false, error });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'DELETE_SLOT_FAILED', message: error.message },
        });
      }
    }
  );
}
