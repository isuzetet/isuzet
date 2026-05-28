import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { requireDeviceAuth, hashApiKey } from '../middleware/device-auth.middleware.js';
import { prisma, generateId } from '@ruit/shared-db';
import { processLocationPing } from '../services/location.service.js';
import crypto from 'crypto';

export async function deviceRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────
  // POST /api/v1/location/device/register
  // Register a hardware GPS device to a truck
  // Auth: FLEET_OWNER, OPS_ADMIN
  // ─────────────────────────────────────────────────────────────
  fastify.post('/device/register', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'OPS_ADMIN'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        truckId: string;
        deviceSerial?: string;
        deviceType?: string;
      };

      if (!body.truckId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_TRUCK',
            message: 'truckId is required'
          }
        });
      }

      // Verify truck belongs to requesting fleet owner
      const user = (request as any).user;
      if (user.role === 'FLEET_OWNER') {
        const truck = await prisma.truck.findUnique({
          where: { id: body.truckId },
        });

        if (!truck) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'TRUCK_NOT_FOUND',
              message: 'Truck not found'
            }
          });
        }
      }

      // Generate API key for device
      // Format: dev_live_XXXXXXXXXXXXXXXXXXXXX
      const rawKey = `dev_live_${crypto.randomBytes(20).toString('hex')}`;
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 12);

      // Deactivate any existing device for this truck
      await prisma.deviceRegistration.updateMany({
        where: { truckId: body.truckId, isActive: true },
        data: { isActive: false }
      });

      // Create new device registration
      const device = await prisma.deviceRegistration.create({
        data: {
          id: generateId('dev'),
          truckId: body.truckId,
          deviceType: body.deviceType || 'GPS_HARDWARE',
          deviceSerial: body.deviceSerial,
          apiKey: keyPrefix,
          apiKeyHash: keyHash,
          isActive: true,
        }
      });

      return reply.send({
        success: true,
        data: {
          deviceId: device.id,
          truckId: device.truckId,
          // Return FULL key ONCE — it will never be shown again
          apiKey: rawKey,
          keyPrefix,
          warning: 'Store this API key securely. It will not be shown again.',
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DEVICE_ERROR',
          message: 'Failed to register device'
        }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/v1/location/hardware-ping
  // Receive GPS ping from hardware device
  // Auth: X-Device-Key header (not JWT)
  // Called by: physical GPS hardware every 30 seconds
  // ─────────────────────────────────────────────────────────────
  fastify.post('/hardware-ping', {
    preHandler: [requireDeviceAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const device = (request as any).device;
      const body = request.body as {
        tripId: string;
        loadId?: string;
        lat: number;
        lng: number;
        speedKmh?: number;
        headingDeg?: number;
        altitudeM?: number;
        timestamp?: string; // Device timestamp (may differ from server time)
      };

      if (!body.tripId || body.lat === undefined || body.lng === undefined) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'tripId, lat, and lng are required'
          }
        });
      }

      // Get driverId from the truck assigned to this device
      const truck = await prisma.truck.findUnique({
        where: { id: device.truckId },
      });

      // Find driver assigned to truck — use 'unknown' if no driver
      const driverId = (truck as any)?.currentDriverId || 'HARDWARE_ONLY';

      const result = await processLocationPing({
        tripId: body.tripId,
        driverId,
        loadId: body.loadId,
        lat: body.lat,
        lng: body.lng,
        speedKmh: body.speedKmh,
        headingDeg: body.headingDeg,
        altitudeM: body.altitudeM,
        source: 'HARDWARE',
        deviceId: device.id,
      });

      return reply.send({
        success: true,
        data: {
          pingId: result.pingId,
          received: true,
          nextPingInSeconds: 30,
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'HARDWARE_PING_ERROR',
          message: 'Failed to process hardware ping'
        }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/v1/location/device/truck/:truckId
  // Get device registration status for a truck
  // Auth: FLEET_OWNER, OPS_ADMIN
  // ─────────────────────────────────────────────────────────────
  fastify.get('/device/truck/:truckId', {
    preHandler: [requireAuth(), requireRole(['FLEET_OWNER', 'FLEET_MANAGER', 'OPS_ADMIN'])],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { truckId } = request.params as { truckId: string };

      const device = await prisma.deviceRegistration.findFirst({
        where: { truckId, isActive: true },
        select: {
          id: true,
          truckId: true,
          deviceType: true,
          deviceSerial: true,
          apiKey: true,
          isActive: true,
          lastSeenAt: true,
          createdAt: true,
        }
      });

      if (!device) {
        return reply.send({
          success: true,
          data: {
            hasDevice: false,
            truckId
          }
        });
      }

      return reply.send({
        success: true,
        data: {
          hasDevice: true,
          device: {
            ...device,
            apiKey: undefined, // Never return key (even prefix) in GET
            keyPrefix: device.apiKey,
          }
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DEVICE_ERROR',
          message: 'Failed to get device info'
        }
      });
    }
  });
}
