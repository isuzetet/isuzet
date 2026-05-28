import { prisma } from '@ruit/shared-db';

// SLA thresholds from Amendment 2 C4
const SLA_THRESHOLDS: Record<string, number> = {
  LOW: 5,
  MEDIUM: 3,
  HIGH: 1,
  CRITICAL: 0,
};

// Platform summary type
export interface PlatformSummary {
  totalUsers: number;
  totalDrivers: number;
  totalFleetOwners: number;
  totalOrderers: number;
  completedTrips: number;
  activeTrips: number;
  openIncidents: number;
  openFraudFlags: number;
  activeShockEvents: number;
  openLoads: number;
}

// Financial summary type
export interface FinancialSummary {
  totalVolumeEtb: number;
  totalCommissionEtb: number;
  totalEscrowHeldEtb: number;
  avgTransactionEtb: number;
  transactionCount: number;
}

// Ops workqueue type
export interface OpsWorkqueue {
  openIncidents: any[];
  openDisputeCount: number;
  pendingKycReviews: number;
  openFraudFlags: number;
  slaBreachedCount: number;
}

// CBE compliance report type
export interface CBEComplianceReport {
  reportMonth: string;
  totalTransactionVolume: number;
  transactionCount: number;
  averageTransactionValue: number;
  commissionEarned: number;
  escrowUtilization: number;
  fraudFlagsRaised: number;
  incidentsResolved: number;
  corridorBreakdown: any[];
  generatedAt: string;
  ethiopianDate: string;
}

/**
 * Get platform summary
 */
export async function getPlatformSummary(): Promise<PlatformSummary> {
  // Query all counts in parallel
  const [
    totalUsers,
    totalDrivers,
    totalFleetOwners,
    totalOrderers,
    completedTrips,
    activeTrips,
    openIncidents,
    openFraudFlags,
    activeShockEvents,
    openLoads,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.driver.count(),
    prisma.fleetOwner.count(),
    prisma.orderer.count(),
    prisma.trip.count({ where: { status: 'COMPLETED' } }),
    prisma.trip.count({
      where: { status: { in: ['ACTIVE', 'IN_TRANSIT'] } },
    }),
    prisma.incident.count({
      where: { status: { not: 'CLOSED' } },
    }),
    prisma.fraudFlag.count({ where: { status: 'OPEN' } }),
    prisma.shockEvent.count({ where: { isActive: true } }),
    prisma.load.count({ where: { status: 'OPEN' } }),
  ]);

  return {
    totalUsers,
    totalDrivers,
    totalFleetOwners,
    totalOrderers,
    completedTrips,
    activeTrips,
    openIncidents,
    openFraudFlags,
    activeShockEvents,
    openLoads,
  };
}

/**
 * Get financial summary
 * Uses raw SQL for aggregations as specified
 */
export async function getFinancialSummary(params: {
  fromDate: Date;
  toDate: Date;
  corridorId?: string;
}): Promise<FinancialSummary> {
  // Build where clause
  const where: string[] = [
    `created_at BETWEEN $1 AND $2`,
  ];

  if (params.corridorId) {
    where.push(`trip_id IN (SELECT id FROM trips WHERE load_id IN (SELECT id FROM loads WHERE corridor_id = $3))`);
  }

  const query = `
    SELECT
      COALESCE(SUM(amount_etb), 0)::float as total,
      COUNT(*)::bigint as count,
      COALESCE(AVG(amount_etb), 0)::float as avg,
      COALESCE(SUM(CASE WHEN tx_type = 'COMMISSION' THEN amount_etb ELSE 0 END), 0)::float as commission,
      COALESCE(SUM(CASE WHEN status = 'ESCROW' THEN amount_etb ELSE 0 END), 0)::float as escrow
    FROM financial_transactions
    WHERE ${where.join(' AND ')}
  `;

  const result = await prisma.$queryRawUnsafe(
    query,
    params.fromDate,
    params.toDate,
    ...(params.corridorId ? [params.corridorId] : [])
  ) as any[];

  const row = result[0] || {};

  return {
    totalVolumeEtb: Number(row.total) || 0,
    totalCommissionEtb: Number(row.commission) || 0,
    totalEscrowHeldEtb: Number(row.escrow) || 0,
    avgTransactionEtb: Number(row.avg) || 0,
    transactionCount: Number(row.count) || 0,
  };
}

/**
 * Get corridor performance
 */
export async function getCorridorPerformance(corridorId: string): Promise<{
  completedTrips: number;
  avgMarginEtb: number;
  onTimeRate: number;
  activeLoads: number;
  avgTrustScore: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    completedTrips,
    commissionResult,
    onTimeTrips,
    totalTrips,
    activeLoads,
    avgTrust,
  ] = await Promise.all([
    // Completed trips
    prisma.trip.count({
      where: { corridorId, status: 'COMPLETED' },
    }),
    // Average margin (commission transactions)
    prisma.$queryRaw`
      SELECT COALESCE(AVG(amount_etb), 0)::float as avg_commission
      FROM financial_transactions
      WHERE tx_type = 'COMMISSION'
      AND load_id IN (
        SELECT id FROM loads WHERE corridor_id = ${corridorId}
      )
    `,
    // On-time trips
    prisma.trip.count({
      where: { corridorId, status: 'COMPLETED', onTime: true },
    }),
    // Total trips
    prisma.trip.count({
      where: { corridorId },
    }),
    // Active loads
    prisma.load.count({ where: { corridorId, status: 'OPEN' } }),
    // Average trust score of active drivers
    prisma.$queryRaw`
      SELECT COALESCE(AVG(trust_score), 0)::float as avg_trust
      FROM drivers
      WHERE id IN (
        SELECT DISTINCT driver_id FROM trips
        WHERE corridor_id = ${corridorId}
        AND created_at >= ${since}
      )
    `,
  ]);

  const avgCommission = (commissionResult as any[])[0]?.avg_commission ?? 0;
  const avgTrustScore = (avgTrust as any[])[0]?.avg_trust ?? 0;
  const onTimeRate = totalTrips > 0 ? onTimeTrips / totalTrips : 0;

  return {
    completedTrips,
    avgMarginEtb: Math.round(avgCommission * 100) / 100,
    onTimeRate: Math.round(onTimeRate * 10000) / 100, // As percentage
    activeLoads,
    avgTrustScore: Math.round(avgTrustScore * 100) / 100,
  };
}

/**
 * Get OPS workqueue
 */
export async function getOpsWorkqueue(): Promise<OpsWorkqueue> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    openIncidents,
    openDisputes,
    pendingKyc,
    openFraudFlags,
  ] = await Promise.all([
    // Open incidents for display
    prisma.incident.findMany({
      where: {
        status: { in: ['OPEN', 'UNDER_INVESTIGATION'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Open disputes count
    prisma.incident.count({
      where: {
        incidentType: 'DISPUTE',
        status: { in: ['OPEN', 'UNDER_INVESTIGATION'] },
      },
    }),
    // Pending KYC reviews
    prisma.kycDocument.count({
      where: { status: 'PENDING' },
    }),
    // Open fraud flags
    prisma.fraudFlag.count({
      where: { status: 'OPEN' },
    }),
  ]);

  // Calculate SLA breached count
  const now = new Date();
  let slaBreachedCount = 0;

  for (const incident of openIncidents) {
    const createdAt = new Date(incident.createdAt);
    const daysOpen = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const severity = incident.severity || 'LOW';
    const slaThreshold = SLA_THRESHOLDS[severity] ?? 5;

    if (daysOpen > slaThreshold) {
      slaBreachedCount++;
    }
  }

  return {
    openIncidents,
    openDisputeCount: openDisputes,
    pendingKycReviews: pendingKyc,
    openFraudFlags,
    slaBreachedCount,
  };
}

/**
 * Get CBE compliance report
 * Per Amendment 2 C2
 */
export async function getCBEComplianceReport(
  month: number,
  year: number
): Promise<CBEComplianceReport> {
  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get financial aggregations
  const financialResult = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(amount_etb), 0)::float as total_volume,
      COUNT(*)::bigint as tx_count,
      COALESCE(AVG(amount_etb), 0)::float as avg_tx,
      COALESCE(SUM(CASE WHEN tx_type = 'COMMISSION' THEN amount_etb ELSE 0 END), 0)::float as commission
    FROM financial_transactions
    WHERE created_at BETWEEN ${startDate} AND ${endDate}
  `;

  const finRow = (financialResult as any[])[0] || {};

  // Count fraud flags raised
  const fraudFlagsRaised = await prisma.fraudFlag.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // Count incidents resolved
  const incidentsResolved = await prisma.incident.count({
    where: {
      status: 'RESOLVED',
      resolvedAt: { gte: startDate, lte: endDate },
    },
  });

  // Get escrow utilization (current vs total)
  const escrowResult = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'ESCROW' THEN amount_etb ELSE 0 END), 0)::float as escrow_held,
      COALESCE(SUM(amount_etb), 0)::float as total_volume
    FROM financial_transactions
  `;

  const escrowRow = (escrowResult as any[])[0] || {};
  const escrowUtilization =
    escrowRow.total_volume > 0
      ? escrowRow.escrow_held / escrowRow.total_volume
      : 0;

  // Corridor breakdown
  const corridorStats = await prisma.$queryRaw`
    SELECT
      c.id as corridor_id,
      c.name,
      COUNT(DISTINCT t.id)::bigint as trips,
      COALESCE(SUM(ft.amount_etb), 0)::float as volume_etb
    FROM corridors c
    LEFT JOIN loads l ON l.corridor_id = c.id
    LEFT JOIN trips t ON t.load_id = l.id
      AND t.created_at BETWEEN ${startDate} AND ${endDate}
    LEFT JOIN financial_transactions ft ON ft.trip_id = t.id
    GROUP BY c.id, c.name
    ORDER BY volume_etb DESC
  `;

  // Ethiopian date conversion - simplified
  const ethiopianDate = `${year - 8}-${month}-01`;

  return {
    reportMonth: `${year}-${String(month).padStart(2, '0')}`,
    totalTransactionVolume: Number(finRow.total_volume) || 0,
    transactionCount: Number(finRow.tx_count) || 0,
    averageTransactionValue: Number(finRow.avg_tx) || 0,
    commissionEarned: Number(finRow.commission) || 0,
    escrowUtilization: Math.round(escrowUtilization * 10000) / 100,
    fraudFlagsRaised,
    incidentsResolved,
    corridorBreakdown: (corridorStats as any[]).map((c) => ({
      corridorId: c.corridor_id,
      corridorName: c.name,
      trips: Number(c.trips),
      volumeEtb: Number(c.volume_etb),
    })),
    generatedAt: new Date().toISOString(),
    ethiopianDate,
  };
}

/**
 * Get recent events
 */
export async function getRecentEvents(params: {
  limit: number;
  eventType?: string;
  aggregateType?: string;
}): Promise<any[]> {
  const where: any = {};
  if (params.eventType) where.eventType = params.eventType;
  if (params.aggregateType) where.aggregateType = params.aggregateType;

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit,
  });

  return events.map((event: any) => ({
    ...event,
    createdAt: event.createdAt.toISOString(),
  }));
}
