import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { calculatePublicPriceEstimate } from '../services/public-calculator.service.js';
import { prisma } from '@ruit/shared-db';

export default async function calculatorRoutes(fastify: FastifyInstance) {
  // GET /api/v1/calculator/estimate?corridorId=&cargoType=&weightKg=
  // Public price calculator - NO AUTH REQUIRED
  // Shows platform rate vs broker estimate
  fastify.get(
    '/estimate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { corridorId, cargoType, weightKg } = request.query as {
          corridorId?: string;
          cargoType?: string;
          weightKg?: string;
        };

        if (!corridorId || !cargoType || !weightKg) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'MISSING_PARAMS',
              message: 'corridorId, cargoType, and weightKg query parameters required',
            },
          });
        }

        const result = await calculatePublicPriceEstimate({
          corridorId,
          cargoType,
          weightKg: parseInt(weightKg, 10),
        });

        if (!result.success) {
          return reply.status(400).send(result);
        }

        return reply.send(result);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'CALCULATE_ESTIMATE_FAILED', message: error.message },
        });
      }
    }
  );

  // GET /api/v1/public-estimate?originZoneName=Addis+Ababa&destZoneName=Hawassa&cargoType=grain&weightKg=5000&pickupDate=2026-03-25
  // Public price calculator by zone names - NO AUTH REQUIRED
  // Used by the public rate-calculator web app
  fastify.get(
    '/public-estimate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { originZoneName, destZoneName, cargoType, weightKg, pickupDate } =
          request.query as {
            originZoneName?: string;
            destZoneName?: string;
            cargoType?: string;
            weightKg?: string;
            pickupDate?: string;
          };

        if (!originZoneName || !destZoneName || !cargoType || !weightKg) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'MISSING_PARAMS',
              message: 'originZoneName, destZoneName, cargoType, weightKg are required',
            },
          });
        }

        // City aliases: some corridors use uppercase zone codes, others use proper English names.
        // Map display names to all possible DB zone names so we find corridors regardless of format.
        const CITY_ALIASES: Record<string, string[]> = {
          'addis ababa': ['KALITY', 'MERKATO', 'Addis Ababa', 'LEGEHAR', 'MEGENAGNA', 'SARIS', 'AKAKI'],
          'hawassa':     ['HAWASSA', 'Hawassa'],
          'dire dawa':   ['DIRE_DAWA', 'Dire Dawa'],
          'jimma':       ['JIMMA', 'Jimma'],
          'bahir dar':   ['BAHIR_DAR', 'Bahir Dar'],
          'mekelle':     ['MEKELLE', 'Mekele', 'Mekelle'],
          'gondar':      ['GONDAR', 'Gondar'],
          'adama':       ['ADAMA', 'Adama'],
          'dessie':      ['DESSIE', 'Dessie'],
          'arba minch':  ['ARBA_MINCH', 'Arba Minch'],
          'shashemene':  ['SHASHEMENE', 'Shashemene'],
          'gambela':     ['GAMBELA', 'Gambela'],
          'harar':       ['HARAR', 'Harar'],
          'debre birhan':['DEBRE_BIRHAN', 'Debre Birhan'],
          'ambo':        ['AMBO', 'Ambo'],
          'nekemte':     ['NEKEMTE', 'Nekemte'],
          'ziway':       ['ZIWAY', 'Ziway'],
          'meki':        ['MEKI', 'Meki'],
          'wolkite':     ['WOLKITE', 'Wolkite'],
        };

        const originAliases = CITY_ALIASES[originZoneName.toLowerCase()] ?? [originZoneName];
        const destAliases   = CITY_ALIASES[destZoneName.toLowerCase()]   ?? [destZoneName];

        // Find corridor by zone names (case-insensitive, bidirectional, alias-aware)
        const corridor = await prisma.corridor.findFirst({
          where: {
            OR: [
              {
                originZone:      { name: { in: originAliases, mode: 'insensitive' } },
                destinationZone: { name: { in: destAliases,   mode: 'insensitive' } },
              },
              {
                originZone:      { name: { in: destAliases,   mode: 'insensitive' } },
                destinationZone: { name: { in: originAliases, mode: 'insensitive' } },
              },
            ],
          },
          select: { id: true, distanceKm: true, name: true },
        });

        if (!corridor) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'CORRIDOR_NOT_FOUND',
              message: `No corridor found between ${originZoneName} and ${destZoneName}`,
            },
          });
        }

        const result = await calculatePublicPriceEstimate({
          corridorId: corridor.id,
          cargoType,
          weightKg: parseInt(weightKg, 10),
        });

        if (!result.success || !result.data) {
          return reply.status(400).send(result);
        }

        const distanceKm = result.data.distanceKm;
        const baseRate = result.data.platformRateCents / 100;

        // Seasonal adjustment: 15% uplift during Ethiopian rainy season (Jun–Sep)
        const isRainySeason = (() => {
          if (!pickupDate) return false;
          const month = new Date(pickupDate).getMonth();
          return month >= 5 && month <= 8;
        })();
        const seasonalAdjustment = isRainySeason ? Math.round(baseRate * 0.15) : 0;
        const total = baseRate + seasonalAdjustment;
        // Average truck speed on Ethiopian roads: ~55 km/h
        const transitHours = Math.ceil(distanceKm / 55);

        return reply.send({
          success: true,
          data: {
            distanceKm,
            transitHours,
            baseRate,
            cargoAdjustment: 0,
            seasonalAdjustment,
            total,
            minRange: Math.round(total * 0.95),
            maxRange: Math.round(total * 1.1),
            savingsVsBroker: result.data.savingsVsBrokerCents / 100,
            savingsPct: result.data.savingsPct,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: { code: 'ESTIMATE_FAILED', message: error.message },
        });
      }
    }
  );
}
