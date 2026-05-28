import 'dotenv/config';
import { prisma, getConfig } from '@ruit/shared-db';
import { Decimal } from '@prisma/client/runtime/library';

export interface PublicPriceEstimateInput {
  corridorId: string;
  cargoType: string;
  weightKg: number;
}

export interface PublicPriceEstimate {
  platformRateCents: number;
  platformRatePerKgPerKm: number;
  estimatedBrokerRateCents: number;
  savingsVsBrokerCents: number;
  savingsPct: number;
  corridorName: string;
  distanceKm: number;
  currency: string;
}

/**
 * Public price calculator - no auth required
 * Shows platform rate vs traditional broker estimate
 * Provides acquisition insight for orderers
 */
export async function calculatePublicPriceEstimate(
  input: PublicPriceEstimateInput
): Promise<{
  success: boolean;
  data?: PublicPriceEstimate;
  error?: { code: string; message: string };
}> {
  try {
    const { corridorId, cargoType, weightKg } = input;

    // Validate inputs
    if (!corridorId || !cargoType || weightKg <= 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'corridorId, cargoType, and positive weightKg required',
        },
      };
    }

    const config = await getConfig();

    // Get corridor details
    const corridor = await prisma.corridor.findUnique({
      where: { id: corridorId },
      select: {
        id: true,
        name: true,
        distanceKm: true,
        originZoneId: true,
        destinationZoneId: true,
      },
    });

    if (!corridor) {
      return {
        success: false,
        error: { code: 'CORRIDOR_NOT_FOUND', message: 'Corridor not found' },
      };
    }

    const distanceKm = corridor.distanceKm || 1;

    // Get cargo class multiplier
    const cargoMultiplier = config.cargoClassMultipliers?.[cargoType] || 1.0;

    // Calculate platform rate using standard pricing formula
    // Base rate per kg-km * weight * distance * cargo multiplier
    const baseRatePerKgPerKm = 2; // ETB cents per kg-km (example, should come from config)
    const platformRateCentsRaw = baseRatePerKgPerKm * weightKg * distanceKm * cargoMultiplier;
    const platformRateCents = Math.round(platformRateCentsRaw);

    // Calculate rate per kg-km for display
    const platformRatePerKgPerKm = platformRateCents / (weightKg * distanceKm);

    // Estimate traditional broker cost: platform rate + broker commission
    // Traditional brokers typically add 15-25% commission
    const brokerCommissionPct = config.informalBrokerCommissionEstimatePct || 20;
    const estimatedBrokerRateCents = Math.round(
      platformRateCents * (1 + brokerCommissionPct / 100)
    );

    // Calculate savings
    const savingsVsBrokerCents = estimatedBrokerRateCents - platformRateCents;
    const savingsPct =
      estimatedBrokerRateCents > 0
        ? Math.round((savingsVsBrokerCents / estimatedBrokerRateCents) * 100)
        : 0;

    return {
      success: true,
      data: {
        platformRateCents,
        platformRatePerKgPerKm,
        estimatedBrokerRateCents,
        savingsVsBrokerCents,
        savingsPct,
        corridorName: corridor.name,
        distanceKm,
        currency: 'ETB',
      },
    };
  } catch (error: any) {
    console.error('[Calculator] calculatePublicPriceEstimate error:', error);
    return {
      success: false,
      error: {
        code: 'CALCULATE_PRICE_FAILED',
        message: error.message,
      },
    };
  }
}
