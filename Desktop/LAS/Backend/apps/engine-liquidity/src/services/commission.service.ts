import 'dotenv/config';
import { getConfig } from '@ruit/shared-db';
import { prisma, generateId } from '@ruit/shared-db';
import { createEscrowEntry } from './escrow-ledger.service';

/**
 * Commission Service
 * Handles platform and broker commission calculations
 */

/**
 * Calculate tiered platform commission based on load value
 */
export async function calculatePlatformCommission(
  loadValueCents: number
): Promise<number> {
  const config = await getConfig();
  const tiers = config.commissionTiers;

  for (const tier of tiers) {
    if (loadValueCents <= tier.maxValueCents) {
      const commission = Math.round((loadValueCents * tier.pct) / 100);
      return Math.max(
        config.commissionFloorCents,
        Math.min(config.commissionCeilingCents, commission)
      );
    }
  }

  // Fallback: use highest tier
  const highestTier = tiers[tiers.length - 1];
  const commission = Math.round((loadValueCents * highestTier.pct) / 100);
  return Math.max(
    config.commissionFloorCents,
    Math.min(config.commissionCeilingCents, commission)
  );
}

/**
 * Calculate broker commission
 * Rate: 3-5% of load value
 * With floor and ceiling
 */
export async function calculateBrokerCommission(
  loadValueCents: number
): Promise<number> {
  const config = await getConfig();

  const commission = Math.round(
    (loadValueCents * config.brokerCommissionRatePct) / 100
  );
  return Math.max(
    config.brokerCommissionFloorCents,
    Math.min(config.brokerCommissionCeilingCents, commission)
  );
}

/**
 * Settle commission for a load
 * Creates escrow entries for both platform and broker (if applicable)
 */
export async function settleCommission(data: {
  loadId: string;
  loadValueCents: number;
  brokerId?: string;
  ordererId: string;
}): Promise<any> {
  return await prisma.$transaction(async (tx) => {
    // Calculate platform commission
    const platformCommission = await calculatePlatformCommission(
      data.loadValueCents
    );

    // Create platform commission entry
    await createEscrowEntry({
      loadId: data.loadId,
      fromUserId: data.ordererId,
      toUserId: 'PLATFORM',
      amountCents: platformCommission,
      type: 'PLATFORM_COMMISSION',
      notes: `Platform commission: ${platformCommission} cents (${(
        (platformCommission / data.loadValueCents) *
        100
      ).toFixed(2)}%) on load value ${data.loadValueCents}`,
    });

    let brokerCommission = 0;

    // Calculate broker commission if broker exists
    if (data.brokerId) {
      brokerCommission = await calculateBrokerCommission(data.loadValueCents);

      await createEscrowEntry({
        loadId: data.loadId,
        fromUserId: data.ordererId,
        toUserId: data.brokerId,
        amountCents: brokerCommission,
        type: 'BROKER_COMMISSION',
        notes: `Broker commission: ${brokerCommission} cents (${(
          (brokerCommission / data.loadValueCents) *
          100
        ).toFixed(2)}%) on load value ${data.loadValueCents}`,
      });
    }

    return {
      loadId: data.loadId,
      platformCommissionCents: platformCommission,
      brokerCommissionCents: brokerCommission,
      totalCommissionCents: platformCommission + brokerCommission,
    };
  });
}

/**
 * Get commission breakdown (for preview before settlement)
 */
export async function getCommissionBreakdown(data: {
  loadValueCents: number;
  includeBroker?: boolean;
}): Promise<any> {
  const platformCommission = await calculatePlatformCommission(
    data.loadValueCents
  );

  let brokerCommission = 0;
  if (data.includeBroker) {
    brokerCommission = await calculateBrokerCommission(data.loadValueCents);
  }

  return {
    loadValueCents: data.loadValueCents,
    platformCommissionCents: platformCommission,
    platformCommissionPct: (
      (platformCommission / data.loadValueCents) *
      100
    ).toFixed(2),
    brokerCommissionCents: brokerCommission,
    brokerCommissionPct: brokerCommission
      ? ((brokerCommission / data.loadValueCents) * 100).toFixed(2)
      : '0.00',
    totalCommissionCents: platformCommission + brokerCommission,
    totalCommissionPct: (
      ((platformCommission + brokerCommission) / data.loadValueCents) *
      100
    ).toFixed(2),
  };
}
