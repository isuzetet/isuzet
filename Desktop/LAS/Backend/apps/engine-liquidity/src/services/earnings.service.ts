import 'dotenv/config';
// use shared-db helper rather than instantiating our own client
import { prisma as db, generateId } from '@ruit/shared-db';
import { DriverEarningStatus, DriverEarningType } from '@ruit/shared-types';

// alias db throughout file for clarity


export async function getDriverEarnings(
  driverId: string,
  filters: {
    status?: any;
    earningType?: any;
    limit?: number;
  }
): Promise<{
  earnings: any[];
  summary: {
    totalPendingEtb: number;
    totalPaidEtb: number;
  };
}> {
  const limit = filters.limit ?? 50;

  const where: any = {
    driverId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.earningType) {
    where.earningType = filters.earningType;
  }

  const [earnings, pendingSum, paidSum] = await Promise.all([
    db.driverEarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.driverEarning.aggregate({
      where: { driverId, status: 'PENDING' },
      _sum: { amountEtb: true },
    }),
    db.driverEarning.aggregate({
      where: { driverId, status: 'PAID' },
      _sum: { amountEtb: true },
    }),
  ]);

  // Handle Decimal conversion
  const totalPendingEtb = Number(pendingSum._sum.amountEtb ?? 0);
  const totalPaidEtb = Number(paidSum._sum.amountEtb ?? 0);

  return {
    earnings,
    summary: {
      totalPendingEtb,
      totalPaidEtb,
    },
  };
}

export async function markEarningsPaid(
  driverId: string,
  earningIds: string[]
): Promise<{ updatedCount: number }> {
  if (!Array.isArray(earningIds) || earningIds.length === 0) {
    throw new Error('earningIds must be a non-empty array');
  }

  // Find all earnings for this driver
  const earnings = await db.driverEarning.findMany({
    where: {
      id: { in: earningIds },
      driverId,
    },
  });

  if (earnings.length !== earningIds.length) {
      const foundIds = earnings.map((e: { id: string }) => e.id);
    const missingIds = earningIds.filter((id) => !foundIds.includes(id));
    throw new Error(`Earnings not found: ${missingIds.join(', ')}`);
  }

  // Check if any are already paid
  const alreadyPaid = earnings.filter((e: any) => e.status === 'PAID');
  if (alreadyPaid.length > 0) {
    throw new Error(`Already paid: ${alreadyPaid.map((e: any) => e.id).join(', ')}`);
  }

  await db.$transaction(async (tx: any) => {
    await tx.driverEarning.updateMany({
      where: {
        id: { in: earningIds },
        driverId,
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidByFleetOwner: true,
      },
    });

    // Create events for each earning
    for (const earning of earnings) {
      await tx.event.create({
        data: {
          id: generateId('evt'),
          eventType: 'EARNING_PAID',
          aggregateId: earning.id,
          aggregateType: 'DriverEarning',
          actorId: driverId,
          actorRole: 'FLEET_OWNER',
          strategyVersionId: 'default',
          payload: {
            earningId: earning.id,
            driverId,
            amountEtb: earning.amountEtb,
          },
        },
      });
    }
  });

  return { updatedCount: earnings.length };
}

export async function getFleetPayoutSummary(fleetOwnerId: string): Promise<any> {
  // stub implementation since payout/escrow models are not available
  return {
    fleetOwnerId,
    totalPayoutsEtb: 0,
    pendingDriverEarningsEtb: 0,
    activeEscrowEtb: 0,
    recentPayouts: [],
  };
}



