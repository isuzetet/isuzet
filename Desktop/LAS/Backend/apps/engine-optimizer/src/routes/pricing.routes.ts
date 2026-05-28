import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { computeQuote } from '../services/pricing.service.js';
import { prisma } from '@ruit/shared-db';

export default async function pricingRoutes(app: FastifyInstance) {
  // POST /api/v1/pricing/quote - Get a price quote without creating a load
  app.post('/quote', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      corridorId: z.string(),
      cargoType: z.string(),
      weightKg: z.number().positive(),
      pickupDate: z.union([z.string().datetime(), z.string().date()]).optional(),
      urgencyLevel: z.number().min(1).max(4).default(2),
      ethiopianCalendarEvent: z.string().nullable().default(null),
      pricingMode: z.enum(['CONSOLIDATED', 'CHARTER']).optional(),
      charterTruckSize: z.string().optional(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error
        }
      });
    }

    const { corridorId, cargoType, weightKg, pickupDate, urgencyLevel, ethiopianCalendarEvent, pricingMode, charterTruckSize } = result.data;

    try {
      // Get active strategy for defaults
      const strategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        select: { id: true }
      });

      if (!strategy) {
        return reply.status(500).send({
          success: false,
          error: { code: 'NO_ACTIVE_STRATEGY', message: 'No active strategy found' }
        });
      }

      const quote = await computeQuote({
        corridorId,
        cargoType,
        weightKg,
        pickupDate: pickupDate ? new Date(pickupDate) : new Date(),
        ethiopianCalendarEvent,
        backhaulProbability: 0.3,
        backhaulConfidence: 0.5,
        liquidityStressLevel: 0,
        ordererId: 'placeholder', // Will be replaced in real implementation
        shockSeverity: urgencyLevel,
        strategyVersionId: strategy.id
      });

      // If pricingMode is specified, return mode-specific pricing
      if (pricingMode) {
        return reply.send({
          success: true,
          data: {
            pricingMode,
            charterTruckSize: charterTruckSize || 'STANDARD',
            systemQuoteEtb: quote.systemQuoteEtb,
            fleetPayoutEtb: quote.fleetPayoutEtb,
            commissionEtb: quote.commissionEtb,
            negotiationBandMin: quote.negotiationBandMin,
            negotiationBandMax: quote.negotiationBandMax,
            breakdown: quote.breakdown,
            priceBreakdown: quote.priceBreakdown
          }
        });
      }

      return reply.send({
        success: true,
        data: {
          systemQuoteEtb: quote.systemQuoteEtb,
          fleetPayoutEtb: quote.fleetPayoutEtb,
          commissionEtb: quote.commissionEtb,
          negotiationBandMin: quote.negotiationBandMin,
          negotiationBandMax: quote.negotiationBandMax,
          breakdown: quote.breakdown,
          priceBreakdown: quote.priceBreakdown
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compute quote';
      const statusCode = message === 'RATE_CARD_NOT_FOUND' ? 404 : 500;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: message === 'RATE_CARD_NOT_FOUND' ? 'RATE_CARD_NOT_FOUND' : 'QUOTE_FAILED',
          message
        }
      });
    }
  });

  // POST /api/v1/pricing/quote/multi-stop
  // Calculates total price for a multi-stop load
  // Each leg is priced: distance from previous stop × WDM formula
  // A 10% consolidation discount applies to the total
  app.post('/quote/multi-stop', {
    preHandler: [(app as any).requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      stops: Array<{
        lat: number;
        lng: number;
        weightQuintals?: number;
        weightKg?: number;
        unitCount?: number;
        stopType: 'PICKUP' | 'DELIVERY';
      }>;
      truckBodyType?: string;
      urgency?: 'LOW' | 'NORMAL' | 'HIGH';
    };

    if (!body.stops || body.stops.length < 2) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STOPS', message: 'At least 2 stops required' }
      });
    }

    try {
      // Get active strategy version for pricing parameters
      const strategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true }
      });

      if (!strategy) {
        return reply.status(500).send({
          success: false,
          error: { code: 'NO_STRATEGY', message: 'No active strategy version found' }
        });
      }

      // Calculate price per leg
      // A "leg" is the distance between consecutive stops
      const legs: Array<{
        fromStop: number;
        toStop: number;
        distanceKm: number;
        weightQuintals: number;
        legPriceEtb: number;
      }> = [];
      let totalPriceEtb = 0;

      for (let i = 0; i < body.stops.length - 1; i++) {
        const fromStop = body.stops[i];
        const toStop = body.stops[i + 1];

        // Calculate distance between stops using Haversine formula
        const distanceKm = calculateHaversineDistance(
          fromStop.lat, fromStop.lng,
          toStop.lat, toStop.lng
        );

        // Get weight for this leg (use the TO stop's weight, or default to 1)
        const weightQuintals = toStop.weightQuintals || (toStop.weightKg ? toStop.weightKg / 100 : 1);

        // Base WDM price: weight × distance × base rate from strategy
        // Use floorPricePerKmPerQuintal from strategy
        const baseRatePerKmPerQuintal = Number(
          (strategy as any).floorPricePerKmPerQuintal || 0.5
        );

        const legPriceEtb = Math.round(
          weightQuintals * distanceKm * baseRatePerKmPerQuintal * 100
        ); // stored as cents

        legs.push({
          fromStop: i,
          toStop: i + 1,
          distanceKm: Math.round(distanceKm * 10) / 10,
          weightQuintals,
          legPriceEtb
        });

        totalPriceEtb += legPriceEtb;
      }

      // Apply 10% consolidation discount for multi-stop loads
      const consolidationDiscountRate = 0.10;
      const discountAmountEtb = Math.round(totalPriceEtb * consolidationDiscountRate);
      const finalPriceEtb = totalPriceEtb - discountAmountEtb;

      // Apply market multiplier from existing market-pricing service
      // For multi-stop without corridor, use multiplier of 1.0
      const marketMultiplier = 1.0;
      const quotedPriceEtb = Math.round(finalPriceEtb * marketMultiplier);

      return reply.send({
        success: true,
        data: {
          stops: body.stops.length,
          legs: legs.length,
          legBreakdown: legs,
          subtotalEtb: totalPriceEtb,
          consolidationDiscount: {
            rate: consolidationDiscountRate,
            amountEtb: discountAmountEtb
          },
          marketMultiplier,
          quotedPriceEtb,
          quotedPriceDisplay: quotedPriceEtb / 100,
          currency: 'ETB',
          validForMinutes: 30
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'QUOTE_ERROR',
          message: 'Failed to calculate multi-stop quote'
        }
      });
    }
  });

  // GET /api/v1/pricing/rate-cards
  app.get('/rate-cards', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rateCards = await prisma.rateCardVersion.findMany({
        where: { effectiveTo: null },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch corridors separately
      const corridorIds = [...new Set(rateCards.map((rc: typeof rateCards[0]) => rc.corridorId))];
      const corridors = await prisma.corridor.findMany({
        where: { id: { in: corridorIds } },
        select: { id: true, originCity: true, destinationCity: true }
      });

      const corridorMap: Map<string, any> = new Map(corridors.map((c: any) => [c.id, c]));

      return reply.send({
        success: true,
        data: rateCards.map((rc: any) => {
          const corridor = corridorMap.get(rc.corridorId);
          return {
            id: rc.id,
            corridorId: rc.corridorId,
            corridorName: corridor ? `${corridor.originCity} - ${corridor.destinationCity}` : 'Unknown',
            baseRatePerKm: rc.baseRatePerKm,
            marginFloorEtb: rc.marginFloorEtb,
            effectiveFrom: rc.effectiveFrom
          };
        })
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch rate cards' }
      });
    }
  });
}

// Haversine distance formula — calculates km between two GPS coordinates
function calculateHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
