import 'dotenv/config';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { addSSESubscriber, getSubscriberCount } from '../services/sse.service.js';
import { getLatestLocation, getTrucksInZone, getFleetLiveState } from '../services/location.service.js';
import { prisma } from '@ruit/shared-db';

export async function trackingRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/track/:tripId
  // Server-Sent Events stream for live location updates
  // Auth: FLEET_OWNER, ORDERER, OPS_ADMIN
  //
  // How to use from browser/Flutter:
  // const sse = new EventSource('/api/v1/location/track/TRIP123?token=JWT')
  // sse.onmessage = (e) => { const loc = JSON.parse(e.data); updateMap(loc); }
  // ─────────────────────────────────────────────────────────────
  fastify.get('/track/:tripId', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'FLEET_MANAGER', 'ORDERER', 'OPS_ADMIN', 'OPS_VIEWER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tripId } = request.params as { tripId: string };

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial location immediately (from Redis cache)
    const currentLocation = await getLatestLocation(tripId);
    if (currentLocation) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'current', ...currentLocation })}\n\n`);
    } else {
      reply.raw.write(`data: ${JSON.stringify({ type: 'waiting', message: 'Waiting for driver location' })}\n\n`);
    }

    // Register this connection for push updates
    addSSESubscriber(tripId, reply);

    // Send heartbeat every 25 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
    });

    // Keep the connection open — do not return
    await new Promise(() => {});
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/active-trips
  // Get all active trips with their latest locations
  // Auth: OPS_ADMIN, OPS_VIEWER, FLEET_OWNER
  // ─────────────────────────────────────────────────────────────
  fastify.get('/active-trips', {
    preHandler: [requireAuth(), requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'FLEET_OWNER', 'FLEET_MANAGER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      // Get active loads (IN_PROGRESS status)
      const whereClause: any = { status: 'IN_PROGRESS' };

      // If fleet owner: only show their loads
      if (user.role === 'FLEET_OWNER' || user.role === 'FLEET_MANAGER') {
        whereClause.assignedFleetOwnerId = user.entity_id;
      }

      const activeLoads = await prisma.load.findMany({
        where: whereClause,
        select: {
          id: true,
          currentLat: true,
          currentLng: true,
          lastLocationAt: true,
          lastPingSource: true,
          loadType: true,
        },
        take: 100,
      });

      const tripsWithLocation = activeLoads
        .filter((load: any) => load.currentLat && load.currentLng)
        .map((load: any) => ({
          loadId: load.id,
          lat: Number(load.currentLat),
          lng: Number(load.currentLng),
          lastUpdated: load.lastLocationAt,
          source: load.lastPingSource,
        }));

      return reply.send({
        success: true,
        data: {
          activeTrips: tripsWithLocation,
          count: tripsWithLocation.length,
          activeSSEConnections: getSubscriberCount(),
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'TRACKING_ERROR', message: 'Failed to get active trips' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/zone/:zoneId/trucks
  // Get all trucks in a specific zone
  // Auth: OPS_ADMIN, OPS_VIEWER, FLEET_OWNER, FLEET_MANAGER
  // ─────────────────────────────────────────────────────────────
  fastify.get('/zone/:zoneId/trucks', {
    preHandler: [requireAuth(), requireRole(['OPS_ADMIN', 'OPS_VIEWER', 'FLEET_OWNER', 'FLEET_MANAGER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { zoneId } = request.params as { zoneId: string };
      const user = (request as any).user;

      const fleetOwnerId = user.role === 'FLEET_OWNER' ? user.entity_id : null;
      const trucks = await getTrucksInZone(zoneId, fleetOwnerId, user.role);

      return reply.send({
        success: true,
        data: trucks,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ZONE_TRUCKS_ERROR', message: 'Failed to get trucks in zone' }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/fleet/live
  // Get live fleet state with positions and load info
  // Auth: FLEET_OWNER, FLEET_MANAGER
  // ─────────────────────────────────────────────────────────────
  fastify.get('/fleet/live', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'FLEET_MANAGER'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const fleetOwnerId = user.entity_id;

      if (!fleetOwnerId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_USER', message: 'Fleet owner ID not found' }
        });
      }

      const fleetState = await getFleetLiveState(fleetOwnerId);

      return reply.send({
        success: true,
        data: fleetState,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: 'FLEET_LIVE_ERROR', message: 'Failed to get fleet live state' }
      });
    }
  });
}
