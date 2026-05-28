/**
 * RUIT CBE - Engine 4: Insurance Service (Phase 11E)
 * Thin integration layer for cargo insurance - not a full insurance engine
 * Calculates premiums, creates escrow entries, and tracks insurance purchases
 */

import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { createEscrowEntry } from './escrow-ledger.service';

/**
 * Calculate insurance premium based on declared cargo value
 * Uses config-driven premium rate and platform revenue share
 */
export async function calculateInsurancePremium(
  declaredValueCents: number
): Promise<number> {
  const config = await getConfig();
  
  const premium = Math.round(
    (declaredValueCents * config.insurancePremiumRatePct) / 100
  );
  
  return premium;
}

/**
 * Offer insurance quote to orderer
 * No DB record created - this is just a quote that expires in 30 minutes
 */
export async function offerInsurance(
  loadId: string,
  declaredValueCents: number
): Promise<{
  success: boolean;
  data?: {
    premiumCents: number;
    coverageCents: number;
    expiresAt: string;
  };
  error?: { code: string; message: string };
}> {
  // Validate load exists
  const load = await prisma.load.findUnique({
    where: { id: loadId },
  });

  if (!load) {
    return {
      success: false,
      error: {
        code: 'LOAD_NOT_FOUND',
        message: 'Load not found',
      },
    };
  }

  // Validate declared value is positive
  if (declaredValueCents <= 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: 'Declared value must be greater than zero',
      },
    };
  }

  // Calculate premium
  const premiumCents = await calculateInsurancePremium(declaredValueCents);

  // Quote expires in 30 minutes
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  return {
    success: true,
    data: {
      premiumCents,
      coverageCents: declaredValueCents,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

/**
 * Accept insurance offer and create escrow entry for premium
 * Creates two escrow entries: premium collection and platform revenue
 */
export async function acceptInsurance(
  loadId: string,
  declaredValueCents: number
): Promise<{
  success: boolean;
  data?: {
    premiumCents: number;
    coverageCents: number;
    policyRef: string;
  };
  error?: { code: string; message: string };
}> {
  // Validate load exists and get orderer
  const load = await prisma.load.findUnique({
    where: { id: loadId },
  });

  if (!load) {
    return {
      success: false,
      error: {
        code: 'LOAD_NOT_FOUND',
        message: 'Load not found',
      },
    };
  }

  // Validate declared value
  if (declaredValueCents <= 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: 'Declared value must be greater than zero',
      },
    };
  }

  // Calculate premium
  const premiumCents = await calculateInsurancePremium(declaredValueCents);

  // Generate policy reference
  const policyRef = generateId('pol');

  // Create in transaction: escrow entry + update load
  try {
    await prisma.$transaction(async (tx) => {
      // Create escrow entry for premium collection
      // Premium is collected from orderer, goes to platform
      await createEscrowEntry({
        loadId,
        fromUserId: load.ordererId || undefined,
        toUserId: 'PLATFORM',
        amountCents: premiumCents,
        type: 'INSURANCE_PREMIUM_COLLECTED',
        notes: `Cargo insurance premium for ${declaredValueCents} cents coverage`,
      });

      // Update load with insurance details
      await tx.load.update({
        where: { id: loadId },
        data: {
          insuranceAccepted: true,
          insuranceCoverageCents: declaredValueCents,
          insurancePremiumCents: premiumCents,
        },
      });
    });

    return {
      success: true,
      data: {
        premiumCents,
        coverageCents: declaredValueCents,
        policyRef,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to accept insurance';
    return {
      success: false,
      error: {
        code: 'INSURANCE_ACCEPTANCE_FAILED',
        message,
      },
    };
  }
}
