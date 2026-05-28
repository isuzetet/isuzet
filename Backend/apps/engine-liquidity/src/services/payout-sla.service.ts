/**
 * RUIT CBE - Engine 4: Payout SLA Service
 * Tracks payout completion against SLA windows by payment rail
 * Alerts ops team immediately on SLA breaches
 */

import { prisma as db, generateId } from '@ruit/shared-db';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get the SLA target in minutes for a payment rail
 * Priority: PaymentRailConfig (if exists + active) > StrategyVersion.payoutSlaMinutes > 30 (default)
 */
async function getSlaTargetMinutes(paymentRail: string): Promise<number> {
  // Try to load PaymentRailConfig (may not exist in schema yet)
  try {
    const config = await (db as any).paymentRailConfig?.findFirst({
      where: {
        rail: paymentRail,
        isActive: true
      }
    });

    if (config) {
      return config.slaMinutes;
    }
  } catch (error) {
    // PaymentRailConfig may not exist in schema
  }

  // Fallback to StrategyVersion
  const strategy = await db.strategyVersion.findFirst({
    where: { isActive: true },
    select: { payoutSlaMinutes: true }
  });

  return strategy?.payoutSlaMinutes ?? 30; // Default: 30 minutes
}

/**
 * Determine the payment rail for a payout
 */
async function determinePaymentRail(params: {
  preferredRail?: string;
  recipientUserId?: string;
}): Promise<string> {
  // If explicitly provided, use it
  if (params.preferredRail) {
    return params.preferredRail;
  }

  // Try to load from User.preferredPaymentRail
  if (params.recipientUserId) {
    const user = await db.user.findUnique({
      where: { id: params.recipientUserId },
      select: { preferredPaymentRail: true }
    });

    if (user?.preferredPaymentRail) {
      return user.preferredPaymentRail;
    }
  }

  // Final fallback
  return 'TELEBIRR';
}

/**
 * Initiate a payout and create a PayoutRecord with SLA tracking
 */
async function initiatePayout(params: {
  recipientUserId: string;
  tripId?: string;
  payoutType: string; // "TRIP_EARNINGS" | "ALERT_BONUS" | "TIER_BONUS" | "CORRECTION" | "MICRO_LOAN_DISBURSEMENT" | "COMPENSATION"
  amountEtb: number;
  paymentRail?: string;
  accountNumber?: string;
  initiatedBySystemJob?: boolean;
}): Promise<any> {
  // Determine payment rail
  const paymentRail = await determinePaymentRail({
    preferredRail: params.paymentRail,
    recipientUserId: params.recipientUserId
  });

  // Get SLA target
  const slaTargetMinutes = await getSlaTargetMinutes(paymentRail);

  // Create PayoutRecord
  const record = await db.payoutRecord.create({
    data: {
      id: generateId('por'),
      recipientUserId: params.recipientUserId,
      tripId: params.tripId ?? null,
      payoutType: params.payoutType,
      amountEtb: new Decimal(params.amountEtb),
      paymentRail: paymentRail,
      status: 'PENDING',
      slaTargetMinutes: slaTargetMinutes,
      slaBreached: false,
      initiatedBySystemJob: params.initiatedBySystemJob ?? true,
      initiatedAt: new Date(),
      accountNumber: params.accountNumber ?? null
    }
  });

  return record;
}

/**
 * Mark a payout as completed and check for SLA breach
 */
async function markCompleted(params: {
  payoutRecordId: string;
  providerReference?: string;
}): Promise<{ record: any; slaBreached: boolean; minutesTaken: number }> {
  // Load the record
  const record = await db.payoutRecord.findUnique({
    where: { id: params.payoutRecordId }
  });

  if (!record) {
    throw new Error(`PayoutRecord not found: ${params.payoutRecordId}`);
  }

  // Check if already finalized
  if (record.status === 'COMPLETED' || record.status === 'REVERSED') {
    throw new Error(
      `Payout already finalized: ${params.payoutRecordId} (status=${record.status})`
    );
  }

  // Calculate time taken in minutes
  const now = new Date();
  let minutesTaken = 0;
  if (record.initiatedAt) {
    minutesTaken = (now.getTime() - record.initiatedAt.getTime()) / (1000 * 60);
  }

  // Check SLA breach
  const slaBreached =
    record.slaTargetMinutes != null && minutesTaken > record.slaTargetMinutes;

  // Update the record
  const updated = await db.payoutRecord.update({
    where: { id: params.payoutRecordId },
    data: {
      status: 'COMPLETED',
      completedAt: now,
      providerReference: params.providerReference ?? null,
      slaBreached: slaBreached
    }
  });

  // Alert if SLA breached
  if (slaBreached) {
    await alertSlaBreach(updated, minutesTaken);
  }

  return {
    record: updated,
    slaBreached,
    minutesTaken: Math.round(minutesTaken * 100) / 100 // Round to 2 decimals
  };
}

async function markFailed(params: {
  payoutRecordId: string;
  failureReason: string;
  shouldRetry?: boolean;
}): Promise<any> {
  // Load the record
  const record = await db.payoutRecord.findUnique({
    where: { id: params.payoutRecordId }
  });

  if (!record) {
    throw new Error(`PayoutRecord not found: ${params.payoutRecordId}`);
  }

  // Check if already completed
  if (record.status === 'COMPLETED') {
    throw new Error(
      `Cannot fail a completed payout: ${params.payoutRecordId}`
    );
  }

  // Update the record
  const now = new Date();
  const updated = await db.payoutRecord.update({
    where: { id: params.payoutRecordId },
    data: {
      status: 'FAILED',
      failureReason: params.failureReason,
      failedAt: now,
      retryCount: record.retryCount + 1
    }
  });

  // Log retry eligibility
  const retryCount = record.retryCount + 1;
  if (params.shouldRetry !== false && retryCount < 3) {
    console.warn(
      `⚠️  Payout ${params.payoutRecordId} failed (attempt ${retryCount}), eligible for retry`
    );
  }

  if (retryCount >= 3) {
    console.error(
      `❌ Payout ${params.payoutRecordId} failed 3+ times — requires manual intervention`
    );
  }

  return updated;
}

/**
 * Get SLA summary with optional filters and by-rail breakdown
 */
async function getSlaSummary(params?: {
  fromDate?: Date;
  toDate?: Date;
  paymentRail?: string;
}): Promise<{
  totalPayouts: number;
  completedPayouts: number;
  failedPayouts: number;
  pendingPayouts: number;
  slaBreachedCount: number;
  slaBreachRate: number;
  averageMinutesToComplete: number;
  byRail: Record<
    string,
    {
      count: number;
      breachCount: number;
      breachRate: number;
      avgMinutes: number;
    }
  >;
}> {
  // Build query filter
  const where: any = {};

  if (params?.fromDate) {
    where.createdAt = { gte: params.fromDate };
  }

  if (params?.toDate) {
    if (where.createdAt) {
      where.createdAt.lte = params.toDate;
    } else {
      where.createdAt = { lte: params.toDate };
    }
  }

  if (params?.paymentRail) {
    where.paymentRail = params.paymentRail;
  }

  // Query all matching payout records
  const records = await db.payoutRecord.findMany({
    where: where,
    select: {
      id: true,
      paymentRail: true,
      status: true,
      slaBreached: true,
      initiatedAt: true,
      completedAt: true
    }
  });

  // Compute summary stats
  const totalPayouts = records.length;
  const completedPayouts = records.filter((r: any) => r.status === 'COMPLETED')
    .length;
  const failedPayouts = records.filter((r: any) => r.status === 'FAILED')
    .length;
  const pendingPayouts = records.filter(
    (r: any) => r.status === 'PENDING' || r.status === 'INITIATED'
  ).length;
  const slaBreachedCount = records.filter((r: any) => r.slaBreached === true)
    .length;
  const slaBreachRate = totalPayouts > 0 ? slaBreachedCount / totalPayouts : 0;

  // Calculate average completion time
  let averageMinutesToComplete = 0;
  const completedRecords = records.filter(
    (r: any) => r.status === 'COMPLETED' && r.initiatedAt && r.completedAt
  );
  if (completedRecords.length > 0) {
    const totalMinutes = completedRecords.reduce((sum: number, r: any) => {
      const mins = (r.completedAt!.getTime() - r.initiatedAt!.getTime()) / (1000 * 60);
      return sum + mins;
    }, 0);
    averageMinutesToComplete = totalMinutes / completedRecords.length;
  }

  // Group by payment rail
  const by_rail: Record<
    string,
    {
      count: number;
      breachCount: number;
      breachRate: number;
      avgMinutes: number;
    }
  > = {};

  records.forEach((record: any) => {
    if (!by_rail[record.paymentRail]) {
      by_rail[record.paymentRail] = {
        count: 0,
        breachCount: 0,
        breachRate: 0,
        avgMinutes: 0
      };
    }

    by_rail[record.paymentRail].count += 1;

    if (record.slaBreached) {
      by_rail[record.paymentRail].breachCount += 1;
    }
  });

  // Compute breach rates and average minutes by rail
  Object.keys(by_rail).forEach((rail: string) => {
    const railRecords = records.filter((r: any) => r.paymentRail === rail);
    const breachCount = by_rail[rail].breachCount;
    by_rail[rail].breachRate =
      by_rail[rail].count > 0 ? breachCount / by_rail[rail].count : 0;

    const completedRailRecords = railRecords.filter(
      (r: any) => r.status === 'COMPLETED' && r.initiatedAt && r.completedAt
    );
    if (completedRailRecords.length > 0) {
      const totalMinutes = completedRailRecords.reduce((sum: number, r: any) => {
        const mins = (r.completedAt!.getTime() - r.initiatedAt!.getTime()) / (1000 * 60);
        return sum + mins;
      }, 0);
      by_rail[rail].avgMinutes = totalMinutes / completedRailRecords.length;
    }
  });

  return {
    totalPayouts,
    completedPayouts,
    failedPayouts,
    pendingPayouts,
    slaBreachedCount,
    slaBreachRate: Math.round(slaBreachRate * 10000) / 10000, // 4 decimals
    averageMinutesToComplete: Math.round(averageMinutesToComplete * 100) / 100, // 2 decimals
    byRail: by_rail
  };
}

/**
 * Alert ops team on SLA breach
 */
async function alertSlaBreach(record: any, minutesTaken: number): Promise<void> {
  const criticalRails = ['TELEBIRR', 'CBE_BIRR'];
  const isCritical = criticalRails.includes(record.paymentRail);

  if (isCritical) {
    console.error(
      `🚨 SLA BREACH: Payout ${record.id} for ${record.recipientUserId} via ${record.paymentRail} took ${Math.round(minutesTaken)}min (SLA: ${record.slaTargetMinutes}min)`
    );
  } else {
    console.warn(
      `⚠️  SLA breach: Payout ${record.id} via ${record.paymentRail} took ${Math.round(minutesTaken)}min (SLA: ${record.slaTargetMinutes}min)`
    );
  }

  // TODO: wire to notification engine in Prompt 5.1
}

/**
 * Get pending payouts, optionally filtered by age and payment rail
 */
async function getPendingPayouts(params?: {
  olderThanMinutes?: number;
  paymentRail?: string;
}): Promise<any[]> {
  const where: any = {
    status: { in: ['PENDING', 'INITIATED'] }
  };

  if (params?.paymentRail) {
    where.paymentRail = params.paymentRail;
  }

  if (params?.olderThanMinutes) {
    const cutoffTime = new Date(
      Date.now() - params.olderThanMinutes * 60 * 1000
    );
    where.createdAt = { lte: cutoffTime };
  }

  return await db.payoutRecord.findMany({
    where: where,
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Export the service object
 */
export const payoutSlaService = {
  initiatePayout,
  markCompleted,
  markFailed,
  getSlaSummary,
  getPendingPayouts
};
