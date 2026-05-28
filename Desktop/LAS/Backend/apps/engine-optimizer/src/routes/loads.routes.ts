import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, prisma as db, generateId } from '@ruit/shared-db';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';

export default async function loadsRoutes(app: FastifyInstance) {
  // POST /api/v1/optimizer/loads/:id/fast-track
  // Auth: OPS_ADMIN, FLEET_OWNER
  app.post('/:id/fast-track', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const userRole = user?.role;
      const userId = user?.userId;

      // Find Load by id
      const load = await prisma.load.findUnique({
        where: { id },
        include: {
          orderer: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!load) {
        return reply.status(404).send({
          success: false,
          error: { code: 'LOAD_NOT_FOUND', message: 'Load not found' },
        });
      }

      // Validate load.status === 'QUOTING'
      if (load.status !== 'QUOTING') {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Load status must be QUOTING to fast-track' },
        });
      }

      // If OPS_ADMIN: skip eligibility check (admin override)
      if (userRole !== ROLES.OPS_ADMIN) {
        // Fetch orderer's user record to check kycTier and completed loads count
        const ordererUser = load.orderer?.user;
        if (!ordererUser) {
          return reply.status(404).send({
            success: false,
            error: { code: 'ORDERER_NOT_FOUND', message: 'Orderer user record not found' },
          });
        }

        // kycTier must be >= 2
        if (ordererUser.kycTier < 2) {
          return reply.status(403).send({
            success: false,
            error: { code: 'INSUFFICIENT_KYC', message: 'Orderer KYC tier must be >= 2 for fast-track' },
          });
        }

        // completed loads (status DELIVERED) count must be >= 3
        const completedLoadsCount = await prisma.load.count({
          where: {
            ordererId: load.ordererId,
            status: 'DELIVERED',
          },
        });

        if (completedLoadsCount < 3) {
          return reply.status(403).send({
            success: false,
            error: { code: 'INSUFFICIENT_HISTORY', message: 'Orderer must have at least 3 completed loads for fast-track' },
          });
        }

        // No active FraudFlag on orderer
        const activeFraudFlag = await prisma.fraudFlag.findFirst({
          where: {
            entityId: ordererUser.id,
            entityType: 'USER',
            status: 'OPEN',
          },
        });

        if (activeFraudFlag) {
          return reply.status(403).send({
            success: false,
            error: { code: 'FRAUD_FLAG_ACTIVE', message: 'Orderer has an active fraud flag' },
          });
        }
      }

      // Get active strategy version
      const activeStrategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      const strategyVersionId = activeStrategy?.id ?? 'sv_phase1_growth';

      // Update load: status = 'READY_TO_MATCH', fastTrack = true
      const updatedLoad = await prisma.load.update({
        where: { id },
        data: {
          status: 'READY_TO_MATCH',
          fastTrack: true,
        },
      });

      // Auto-trigger dispatch loop via internal HTTP — fire and forget, never blocks load creation
      setImmediate(async () => {
        try {
          const port = process.env.ENGINE_DISPATCH_PORT ?? '3005';
          const secret = process.env.INTERNAL_SECRET ?? '';
          await fetch(`http://localhost:${port}/api/v1/dispatch/load/${updatedLoad.id}`, {
            method: 'POST',
            headers: {
              'x-internal-secret': secret,
              'content-type': 'application/json',
            },
          });
        } catch (err) {
          console.error('[DISPATCH] Auto-dispatch failed for load:', updatedLoad.id, err);
        }
      });

      // Create Event record with LOAD_STATUS_CHANGED
      await prisma.event.create({
        data: {
          id: generateId('evt'),
          eventType: EVENT_TYPES.LOAD_STATUS_CHANGED,
          aggregateId: id,
          aggregateType: 'LOAD',
          actorId: userId || 'SYSTEM',
          actorRole: userRole || 'SYSTEM',
          strategyVersionId,
          payload: {
            loadId: id,
            previousStatus: 'QUOTING',
            newStatus: 'READY_TO_MATCH',
            fastTrack: true,
            triggeredBy: userRole === ROLES.OPS_ADMIN ? 'ADMIN_OVERRIDE' : 'FAST_TRACK',
          },
        },
      });

      // Return updated load
      return reply.send({
        success: true,
        data: updatedLoad,
      });
    } catch (error) {
      console.error('Fast-track error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  });

  // GET /api/v1/optimizer/loads/:id/economics
  // Auth: FLEET_OWNER, FLEET_MANAGER, ORDERER, OPS_ADMIN
  app.get('/:id/economics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      // Find Load by id
      const load = await prisma.load.findUnique({
        where: { id },
      });

      if (!load) {
        return reply.status(404).send({
          success: false,
          error: { code: 'LOAD_NOT_FOUND', message: 'Load not found' },
        });
      }

      // Fetch corridor separately
      const corridor = await prisma.corridor.findUnique({
        where: { id: load.corridorId },
      });

      if (!corridor) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CORRIDOR_NOT_FOUND', message: 'Corridor not found for this load' },
        });
      }

      // Fetch stops separately
      const stops = await prisma.loadStop.findMany({
        where: {
          loadId: id,
          stopType: 'PICKUP',
        },
      });

      // Find latest FuelPriceSnapshot for the corridor's region
      const fuelPriceSnapshot = await prisma.fuelPriceSnapshot.findFirst({
        where: { region: corridor.region },
        orderBy: { recordedAt: 'desc' },
      });

      // Find assignment for this load
      const assignment = await prisma.assignment.findFirst({
        where: {
          loadId: id,
          status: { in: ['SUGGESTED', 'ACCEPTED'] },
        },
      });

      // Find truck assigned to this load
      let truck = null;
      if (assignment?.truckId) {
        truck = await prisma.truck.findUnique({
          where: { id: assignment.truckId },
        });
      }

      // Find all CheckpointIntelligence for this corridorId
      const checkpointIntelligences = await prisma.checkpointIntelligence.findMany({
        where: { corridorId: load.corridorId },
      });

      // Sum averageFeeEtb for total expected checkpoint fees
      const checkpointFeesEtb = checkpointIntelligences.reduce(
        (sum: number, ci: any) => sum + ci.averageFeeEtb,
        0
      );

      // Calculate fuelCostEstimateEtb
      let fuelCostEstimateEtb = 0;
      if (truck?.averageFuelConsumptionLper100km && fuelPriceSnapshot?.dieselPriceEtbPerLiter) {
        const consumption = truck.averageFuelConsumptionLper100km.toNumber();
        const distanceKm = (corridor.distanceKm as any);
        const dieselPrice = fuelPriceSnapshot.dieselPriceEtbPerLiter.toNumber();
        fuelCostEstimateEtb = Math.round((distanceKm * consumption / 100) * dieselPrice * 100);
      }

      // Calculate totalWeightQuintals from PICKUP stops
      const totalWeightQuintals = stops.reduce(
        (sum: number, stop: any) => sum + (stop.weightQuintals?.toNumber() || 0),
        0
      );

      // Calculate revenue per KM
      const distanceKm = (corridor.distanceKm as any);
      const finalRateEtb = load.finalRateEtb?.toNumber() || 0;
      const revenuePerKm = distanceKm > 0 ? finalRateEtb / distanceKm : 0;

      // Calculate revenue per quintal
      const revenuePerQuintal = totalWeightQuintals > 0 ? finalRateEtb / totalWeightQuintals : 0;

      // Return TripEconomics object
      const tripEconomics = {
        loadId: load.id,
        grossRevenueEtb: finalRateEtb,
        fuelCostEstimateEtb,
        checkpointFeesEtb,
        platformCommissionEtb: load.ruitCommissionEtb?.toNumber() || 0,
        brokerCommissionEtb: 0, // Not yet tracked per load
        driverBonusEtb: 0, // Not yet tracked per load
        netPayoutToFleetEtb: load.fleetPayoutEtb?.toNumber() || 0,
        revenuePerKm,
        revenuePerQuintal,
      };

      return reply.send({
        success: true,
        data: tripEconomics,
      });
    } catch (error) {
      console.error('Economics error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  });
}
