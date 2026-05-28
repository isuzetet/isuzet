import 'dotenv/config';
import { FastifyInstance } from 'fastify';
import {
  createRouteContract,
  renewRouteContract,
  cancelRouteContract,
  pauseRouteContract,
  resumeRouteContract,
  listOrdererContracts,
  getContractById,
} from '../services/route-contract.service.js';

export default async function routeContractRoutes(app: FastifyInstance) {
  // POST /api/v1/contracts/route - Create route contract (ORDERER)
  app.post('/', async (request, reply) => {
    try {
      const { ordererId, preferredFleetId, corridorId, cargoType, weightKg, frequency, startDate, endDate, agreedRateCents, autoPost } = request.body as {
        ordererId: string;
        preferredFleetId?: string;
        corridorId: string;
        cargoType: string;
        weightKg: number;
        frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
        startDate: string;
        endDate: string;
        agreedRateCents: number;
        autoPost: boolean;
      };

      if (!ordererId || !corridorId || !cargoType || !weightKg || !frequency || !startDate || !endDate || agreedRateCents === undefined) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Required fields: ordererId, corridorId, cargoType, weightKg, frequency, startDate, endDate, agreedRateCents' },
        });
      }

      const result = await createRouteContract({
        ordererId,
        preferredFleetId,
        corridorId,
        cargoType,
        weightKg,
        frequency,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        agreedRateCents,
        autoPost: autoPost ?? true,
      });

      if (!result.success) {
        const statusCode = result.error?.code === 'ORDERER_NOT_FOUND' || result.error?.code === 'CORRIDOR_NOT_FOUND' || result.error?.code === 'FLEET_NOT_FOUND' ? 404 : 400;
        return reply.status(statusCode).send(result);
      }

      return reply.status(201).send(result);
    } catch (error) {
      console.error('Error creating route contract:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create route contract' },
      });
    }
  });

  // GET /api/v1/contracts/route - List orderer's contracts (ORDERER, ADMIN)
  app.get('/', async (request, reply) => {
    try {
      const { ordererId, role } = request.query as { ordererId?: string; role?: string };

      if (!ordererId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'ordererId is required' },
        });
      }

      const result = await listOrdererContracts(ordererId);
      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error listing route contracts:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list route contracts' },
      });
    }
  });

  // GET /api/v1/contracts/route/:id - Get single contract
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await getContractById(id);

      if (!result.success) {
        return reply.status(404).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error getting route contract:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get route contract' },
      });
    }
  });

  // POST /api/v1/contracts/route/:id/renew - Renew route contract
  app.post('/:id/renew', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { newEndDate, newAgreedRateCents } = request.body as { newEndDate: string; newAgreedRateCents?: number };

      if (!newEndDate) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'newEndDate is required' },
        });
      }

      const result = await renewRouteContract(id, { newEndDate: new Date(newEndDate), newAgreedRateCents });

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error renewing route contract:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to renew route contract' },
      });
    }
  });

  // POST /api/v1/contracts/route/:id/cancel - Cancel route contract
  app.post('/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      const result = await cancelRouteContract(id, reason ?? 'User initiated cancellation');

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error canceling route contract:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel route contract' },
      });
    }
  });

  // POST /api/v1/contracts/route/:id/pause - Pause route contract
  app.post('/:id/pause', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await pauseRouteContract(id);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error pausing route contract:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to pause route contract' },
      });
    }
  });

  // POST /api/v1/contracts/route/:id/resume - Resume route contract
  app.post('/:id/resume', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await resumeRouteContract(id);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Error resuming route contract:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to resume route contract' },
      });
    }
  });
}
