import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AccessTokenPayload, requireAuth } from '@ruit/shared-auth';
import { roadIntelligenceService } from '../services/road-intelligence.service.js';

export default async function roadIntelligenceRoutes(fastify: FastifyInstance) {
  // PUBLIC — no auth required
  fastify.get(
    '/public-feed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { corridorId, limit, alertType, lat, lng, radiusKm } = request.query as any;
      try {
        const feed = await roadIntelligenceService.getPublicFeed({
          corridorId,
          alertType,
          lat: lat ? parseFloat(lat) : undefined,
          lng: lng ? parseFloat(lng) : undefined,
          radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
          limit: limit ? parseInt(limit) : 50,
        });
        return reply.send({ data: feed });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.get(
    '/corridor/:corridorId/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { corridorId } = request.params as any;
      try {
        const summary = await roadIntelligenceService.getCorridorAlertSummary(corridorId);
        return reply.send({ data: summary });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // AUTHENTICATED routes
  fastify.post(
    '/alerts',
    { preHandler: [requireAuth()] },
    async (
      request: FastifyRequest & { user?: AccessTokenPayload },
      reply: FastifyReply
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as any;
      try {
        const { alert, bonusEligible } = await roadIntelligenceService.createAlert({
          reportedByUserId: user.sub,
          reportedByRole: user.role as string,
          corridorId: body.corridorId,
          alertType: body.alertType,
          severity: body.severity ?? 'MEDIUM',
          source: 'DRIVER_APP',
          lat: body.lat,
          lng: body.lng,
          locationName: body.locationName,
          description: body.description,
        });
        return reply.status(201).send({ data: { alert, bonusEligible } });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    '/alerts/:alertId/confirm',
    { preHandler: [requireAuth()] },
    async (
      request: FastifyRequest & { user?: AccessTokenPayload },
      reply: FastifyReply
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { alertId } = request.params as any;
      try {
        const result = await roadIntelligenceService.confirmAlert({
          alertId,
          confirmedByUserId: user.sub,
        });
        return reply.send({ data: result });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    '/alerts/:alertId/clear',
    { preHandler: [requireAuth()] },
    async (
      request: FastifyRequest & { user?: AccessTokenPayload },
      reply: FastifyReply
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { alertId } = request.params as any;
      try {
        const result = await roadIntelligenceService.clearAlert({
          alertId,
          clearedByUserId: user.sub,
        });
        return reply.send({ data: result });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // Fuel station reports
  fastify.post(
    '/fuel-reports',
    { preHandler: [requireAuth()] },
    async (
      request: FastifyRequest & { user?: AccessTokenPayload },
      reply: FastifyReply
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as any;
      try {
        const { report, bonusEligible } = await roadIntelligenceService.createFuelReport({
          reportedByUserId: user.sub,
          stationName: body.stationName,
          lat: body.lat,
          lng: body.lng,
          corridorId: body.corridorId,
          zoneId: body.zoneId,
          hasFuel: body.hasFuel,
          isLimited: body.isLimited,
          queueOverOneHour: body.queueOverOneHour,
          dieselPriceEtb: body.dieselPriceEtb,
        });
        return reply.status(201).send({ data: { report, bonusEligible } });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.get(
    '/fuel-reports',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { corridorId } = request.query as any;
      try {
        // This endpoint is now public and fetches from the service
        const now = new Date();
        // Since FuelStationReport is persisted via prisma in the service,
        // we need to query it through prisma here
        const { prisma } = await import('@ruit/shared-db');
        const reports = await (prisma as any).fuelStationReport.findMany({
          where: {
            expiresAt: { gt: now },
            ...(corridorId ? { corridorId } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        return reply.send({ data: reports });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );
}
