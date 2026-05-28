import 'dotenv/config';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { processLocationPing, logWeighbridgeEntry, getCurrentFuelPrice, reportFuelPrice } from '../services/location.service.js';
import { getTripLocationHistory } from '../services/timescale.service.js';
import { prisma } from '@ruit/shared-db';

export async function locationRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────
  // POST /api/v1/location/ping
  // Called by Flutter driver app every 30 seconds while on a trip
  // Auth: DRIVER JWT token
  // ─────────────────────────────────────────────────────────────
  fastify.post('/ping', {
    preHandler: [requireAuth(), requireRole(['DRIVER', 'FLEET_OWNER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        tripId: string;
        loadId?: string;
        lat: number;
        lng: number;
        accuracy?: number;
        speedKmh?: number;
        headingDeg?: number;
        altitudeM?: number;
        batteryLevel?: number;
        // Offline sync: driver was offline, now syncing queued pings
        offlinePings?: Array<{
          lat: number;
          lng: number;
          timestamp: string;
          accuracy?: number;
        }>;
      };

      if (!body.tripId || body.lat === undefined || body.lng === undefined) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'tripId, lat, and lng are required' }
        });
      }

      // Validate coordinates are reasonable for Ethiopia
      // Ethiopia bounds: lat 3.4-14.9, lng 32.9-47.9
      if (body.lat < 3 || body.lat > 15 || body.lng < 33 || body.lng > 48) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_COORDINATES', message: 'Coordinates outside Ethiopia bounds' }
        });
      }

      // Get driverId from JWT
      const user = (request as any).user;
      const driverId = user.entity_id;

      const result = await processLocationPing({
        tripId: body.tripId,
        driverId,
        loadId: body.loadId,
        lat: body.lat,
        lng: body.lng,
        accuracy: body.accuracy,
        speedKmh: body.speedKmh,
        headingDeg: body.headingDeg,
        altitudeM: body.altitudeM,
        batteryLevel: body.batteryLevel,
        source: 'PHONE',
        offlinePings: body.offlinePings,
      });

      return reply.send({
        success: true,
        data: {
          pingId: result.pingId,
          received: true,
          eta: result.eta,
          offlineSynced: result.offlineSynced,
          nextPingInSeconds: 30,
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PING_ERROR', message: 'Failed to process location ping' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/trip/:tripId/current
  // Get current location of a trip (from Redis cache)
  // Auth: FLEET_OWNER, FLEET_MANAGER, ORDERER, OPS_ADMIN
  // ─────────────────────────────────────────────────────────────
  fastify.get('/trip/:tripId/current', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'FLEET_MANAGER', 'ORDERER', 'OPS_ADMIN', 'OPS_VIEWER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };
      const { getLatestLocation } = await import('../services/location.service.js');
      const location = await getLatestLocation(tripId);

      if (!location) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NO_LOCATION', message: 'No location data available for this trip' }
        });
      }

      return reply.send({
        success: true,
        data: location
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'LOCATION_ERROR', message: 'Failed to get current location' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/trip/:tripId/history
  // Get full route history for a trip (from TimescaleDB)
  // Auth: FLEET_OWNER, ORDERER, OPS_ADMIN
  // ─────────────────────────────────────────────────────────────
  fastify.get('/trip/:tripId/history', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'FLEET_MANAGER', 'ORDERER', 'OPS_ADMIN'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tripId } = request.params as { tripId: string };
      const query = request.query as {
        from?: string;
        to?: string;
        limit?: string;
      };

      const history = await getTripLocationHistory(
        tripId,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
        query.limit ? parseInt(query.limit) : 1000
      );

      return reply.send({
        success: true,
        data: {
          tripId,
          pings: history,
          count: history.length
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'HISTORY_ERROR', message: 'Failed to get location history' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/load/:loadId/current
  // Get current location by load ID (uses load.currentLat/currentLng)
  // Auth: FLEET_OWNER, ORDERER, OPS_ADMIN
  // ─────────────────────────────────────────────────────────────
  fastify.get('/load/:loadId/current', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'FLEET_MANAGER', 'ORDERER', 'OPS_ADMIN', 'OPS_VIEWER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { loadId } = request.params as { loadId: string };
      const load = await prisma.load.findUnique({
        where: { id: loadId },
        select: {
          id: true,
          currentLat: true,
          currentLng: true,
          lastLocationAt: true,
          lastPingSource: true,
          status: true,
        }
      });

      if (!load) {
        return reply.status(404).send({
          success: false,
          error: { code: 'LOAD_NOT_FOUND', message: 'Load not found' }
        });
      }

      if (!load.currentLat || !load.currentLng) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NO_LOCATION', message: 'No location data available yet for this load' }
        });
      }

      return reply.send({
        success: true,
        data: {
          loadId: load.id,
          lat: Number(load.currentLat),
          lng: Number(load.currentLng),
          lastUpdated: load.lastLocationAt,
          source: load.lastPingSource,
          status: load.status,
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'LOCATION_ERROR', message: 'Failed to get load location' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/v1/location/weighbridge/log
  // Log weighbridge entry for a trip
  // Auth: DRIVER, FLEET_OWNER, FLEET_MANAGER
  // ─────────────────────────────────────────────────────────────
  fastify.post('/weighbridge/log', {
    preHandler: [requireAuth(), requireRole(['DRIVER', 'FLEET_OWNER', 'FLEET_MANAGER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        tripId: string;
        locationName: string;
        lat: number;
        lng: number;
        recordedWeightKg: number;
        legalLimitKg: number;
        fineAmountEtb?: number;
        delayMinutes?: number;
        corridorId?: string;
      };

      const user = (request as any).user;
      const driverId = user.entity_id;
      const userId = user.sub;

      const result = await logWeighbridgeEntry(body, driverId, userId);

      return reply.send({
        success: true,
        data: {
          logId: result.logId,
          wasOverweight: result.wasOverweight,
          incidentCreated: result.incidentCreated,
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'WEIGHBRIDGE_ERROR', message: 'Failed to log weighbridge entry' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/fuel-price/current
  // Get current fuel prices
  // Auth: any authenticated user
  // ─────────────────────────────────────────────────────────────
  fastify.get('/fuel-price/current', {
    preHandler: [requireAuth()],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { region?: string };
      const prices = await getCurrentFuelPrice(query.region);

      return reply.send({
        success: true,
        data: prices,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'FUEL_PRICE_ERROR', message: 'Failed to get fuel prices' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/v1/location/fuel-price/report
  // Report fuel price by driver (earns bonus)
  // Auth: DRIVER
  // ─────────────────────────────────────────────────────────────
  fastify.post('/fuel-price/report', {
    preHandler: [requireAuth(), requireRole(['DRIVER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        dieselPriceEtbPerLiter: number;
        region: string;
        petrolPriceEtbPerLiter?: number;
      };

      const user = (request as any).user;
      const driverId = user.entity_id;

      const result = await reportFuelPrice(body, driverId);

      return reply.send({
        success: true,
        data: {
          snapshot: result.snapshot,
          bonusEarned: result.bonusEarned,
        }
      });
    } catch (error) {
      request.log.error(error);
      const message = error instanceof Error ? error.message : 'Failed to report fuel price';
      return reply.status(500).send({
        success: false,
        error: { code: 'FUEL_REPORT_ERROR', message }
      });
    }
  });
}
