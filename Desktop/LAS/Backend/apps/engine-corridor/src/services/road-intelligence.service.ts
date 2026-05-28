import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { PaymentRailType, RoadAlertType, RoadAlertSeverity, RoadAlertSource, DRIVER_EARNING_TYPE } from '@ruit/shared-types';
import type { RoadAlert, RoadAlertConfirmation } from '@prisma/client';
import { Prisma } from '@prisma/client';

const logger = console;

/** ═══════════════════════════════════════════════════════════════════
 * ROAD INTELLIGENCE SERVICE
 * 
 * Implements the driver-facing alert feed for road conditions, checkpoints,
 * fuel availability, and security threats in ISUZET.
 * 
 * Key business rules:
 * - Anyone can READ alerts (no KYC required)
 * - Only authenticated users can CREATE alerts
 * - A driver can only earn one bonus per corridor per cooldown period
 * - Alert bonus is paid when verificationCount reaches threshold
 * - Alerts auto-expire based on StrategyVersion.roadAlertValidityHours
 * ═══════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculates great-circle distance between two latlng points in kilometers.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ─────────────────────────────────────────────────────────────────────
// TYPES AND INTERFACES
// ─────────────────────────────────────────────────────────────────────

export interface CreateAlertParams {
  reportedByUserId: string;
  reportedByRole: string;
  corridorId?: string;
  alertType: string; // from RoadAlertType enum
  severity: string; // from RoadAlertSeverity enum
  source: string; // from RoadAlertSource enum
  lat: number;
  lng: number;
  locationName?: string;
  description?: string;
}

export interface ConfirmAlertParams {
  alertId: string;
  confirmedByUserId: string;
}

export interface GetPublicFeedParams {
  corridorId?: string;
  alertType?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
}

export interface CorridorAlertSummary {
  corridorId: string;
  activeAlertCount: number;
  criticalAlertCount: number;
  verifiedAlertCount: number;
  hasFuelIssue: boolean;
  hasSecurityAlert: boolean;
  hasRoadClosure: boolean;
  lastAlertAt: Date | null;
  alerts: RoadAlert[];
}

export interface ClearAlertParams {
  alertId: string;
  clearedByUserId: string;
}

export interface CreateFuelReportParams {
  reportedByUserId: string;
  stationName: string;
  lat: number;
  lng: number;
  corridorId?: string;
  zoneId?: string;
  hasFuel: boolean;
  isLimited?: boolean;
  queueOverOneHour?: boolean;
  dieselPriceEtb?: number;
}

/**
 * FuelStationReport interface - represents a fuel station availability report
 * NOTE: This model should exist in the database schema but currently does not.
 * For now, we return a partial object structure.
 */
export interface FuelStationReport {
  id: string;
  reportedByUserId: string;
  stationName: string;
  lat: number;
  lng: number;
  corridorId?: string;
  zoneId?: string;
  hasFuel: boolean;
  isLimited?: boolean;
  queueOverOneHour?: boolean;
  dieselPriceEtb?: number;
  expiresAt: Date;
  verificationCount: number;
  bonusPaid: boolean;
  createdAt: Date;
}

export const roadIntelligenceService = {
  /**
   * CREATE ALERT
   * 
   * Creates a new road alert and checks if the user is eligible for bonus payment.
   * 
   * Bonus eligibility is determined by:
   * 1. No recent paid bonus on the same corridor (within cooldown period)
   * 2. No pending unverified alert on the same corridor
   */
  async createAlert(params: CreateAlertParams): Promise<{ alert: RoadAlert; bonusEligible: boolean }> {
    // Load active StrategyVersion
    const strategyVersion = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
      orderBy: { activatedAt: 'desc' },
    });

    if (!strategyVersion) {
      throw new Error('No active strategy version configured');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Number(strategyVersion.roadAlertValidityHours) * 60 * 60 * 1000);

    // Create the alert
    const alert = await prisma.roadAlert.create({
      data: {
        id: generateId('ral'),
        reportedByUserId: params.reportedByUserId,
        reportedByRole: params.reportedByRole,
        corridorId: params.corridorId,
        alertType: params.alertType,
        severity: params.severity,
        source: params.source,
        lat: params.lat,
        lng: params.lng,
        locationName: params.locationName,
        description: params.description,
        expiresAt,
        verificationCount: 0,
        bonusPaid: false,
        bonusPaidEtb: 0,
        isVerified: false,
      },
    });

    // Check bonus eligibility
    let bonusEligible = false;
    if (params.corridorId) {
      const cooldownHours = Number(strategyVersion.roadAlertBonusCooldownHours);
      const cooldownStart = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);

      // Check for recent paid bonus on same corridor
      const recentPaidBonus = await prisma.roadAlert.findFirst({
        where: {
          reportedByUserId: params.reportedByUserId,
          corridorId: params.corridorId,
          bonusPaid: true,
          createdAt: { gte: cooldownStart },
        },
      });

      // Check for pending unverified alert on same corridor
      const pendingUnverified = await prisma.roadAlert.findFirst({
        where: {
          reportedByUserId: params.reportedByUserId,
          corridorId: params.corridorId,
          isVerified: false,
          bonusPaid: false,
          clearedAt: null,
          expiresAt: { gt: now },
          id: { not: alert.id }, // Exclude the alert we just created
        },
      });

      bonusEligible = !recentPaidBonus && !pendingUnverified;
    }

    return { alert, bonusEligible };
  },

  /**
   * CONFIRM ALERT
   * 
   * Confirms an alert and increments its verification count.
   * When verification count reaches the threshold, pays the bonus to the original reporter.
   */
  async confirmAlert(params: ConfirmAlertParams): Promise<{ confirmed: boolean; bonusPaid: boolean; bonusAmountEtb: number }> {
    const now = new Date();

    // Load the alert
    const alert = await prisma.roadAlert.findUnique({
      where: { id: params.alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    // Check if alert is still active
    if (alert.clearedAt || alert.expiresAt < now) {
      throw new Error('Alert is no longer active');
    }

    // Check if confirming user is the original reporter
    if (params.confirmedByUserId === alert.reportedByUserId) {
      throw new Error('Cannot confirm your own alert');
    }

    // Check if confirming user already confirmed this alert
    const existingConfirmation = await prisma.roadAlertConfirmation.findUnique({
      where: {
        alertId_confirmedByUserId: {
          alertId: params.alertId,
          confirmedByUserId: params.confirmedByUserId,
        },
      },
    });

    if (existingConfirmation) {
      throw new Error('Already confirmed this alert');
    }

    // Create confirmation record in a transaction
    let bonusPaid = false;
    let bonusAmountEtb = 0;

    await prisma.$transaction(async (tx) => {
      // Create confirmation
      await tx.roadAlertConfirmation.create({
        data: {
          id: generateId('rac'),
          alertId: params.alertId,
          confirmedByUserId: params.confirmedByUserId,
          confirmedAt: now,
        },
      });

      // Increment verification count
      const updatedAlert = await tx.roadAlert.update({
        where: { id: params.alertId },
        data: {
          verificationCount: { increment: 1 },
        },
      });

      // Load active strategy version
      const strategyVersion = await tx.strategyVersion.findFirst({
        where: { isActive: true },
        orderBy: { activatedAt: 'desc' },
      });

      if (!strategyVersion) {
        throw new Error('No active strategy version configured');
      }

      const verificationThreshold = Number(strategyVersion.roadAlertVerificationCount);
      const bonusAmount = Number(strategyVersion.roadAlertBonusEtb);

      // Check if we should pay bonus
      if (updatedAlert.verificationCount >= verificationThreshold && !updatedAlert.bonusPaid && updatedAlert.reportedByUserId) {
        // Update alert with bonus info
        await tx.roadAlert.update({
          where: { id: params.alertId },
          data: {
            isVerified: true,
            bonusPaid: true,
            bonusPaidEtb: bonusAmount,
          },
        });

        // Load user to get preferred payment rail
        const user = await tx.user.findUnique({
          where: { id: updatedAlert.reportedByUserId },
          select: { preferredPaymentRail: true },
        });

        const paymentRail = user?.preferredPaymentRail || PaymentRailType.TELEBIRR;
        const payoutSlaMinutes = Number(strategyVersion.payoutSlaMinutes);

        // TODO: Create DriverEarning record when ROAD_ALERT_BONUS is added to DriverEarningType enum
        // Currently, DriverEarningType only supports: ON_TIME_BONUS, CHECKPOINT_BONUS, 
        // FUEL_REPORT_BONUS, BACKHAUL_BONUS, PERFECT_WEEK
        // A PayoutRecord model should be created in the database schema for alert bonuses.

        bonusPaid = true;
        bonusAmountEtb = bonusAmount;

        // Create PayoutRecord for the alert bonus
        await tx.payoutRecord.create({
          data: {
            id: generateId('por'),
            recipientUserId: updatedAlert.reportedByUserId!,
            tripId: null,
            payoutType: 'ALERT_BONUS',
            amountEtb: new Prisma.Decimal(bonusAmount),
            paymentRail: paymentRail,
            status: 'PENDING',
            slaTargetMinutes: payoutSlaMinutes,
            slaBreached: false,
            initiatedBySystemJob: true,
          },
        });

        logger.info(`Bonus eligible for alert ${params.alertId}: ${bonusAmount} ETB via ${paymentRail}`);
      }
    });

    return { confirmed: true, bonusPaid, bonusAmountEtb };
  },

  /**
   * GET PUBLIC FEED
   * 
   * Returns active, non-expired alerts filtered by optional parameters.
   * Supports geographic radius filtering using haversine formula.
   * Results are ordered with verified alerts first.
   */
  async getPublicFeed(params: GetPublicFeedParams): Promise<RoadAlert[]> {
    const now = new Date();
    const limit = Math.min(params.limit || 50, 200); // Max 200

    // Query alerts
    const alerts = await prisma.roadAlert.findMany({
      where: {
        clearedAt: null,
        expiresAt: { gt: now },
        ...(params.corridorId && { corridorId: params.corridorId }),
        ...(params.alertType && { alertType: params.alertType }),
      },
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    // Apply geographic filtering if coordinates provided
    if (params.lat !== undefined && params.lng !== undefined && params.radiusKm) {
      return alerts.filter((alert) => {
        const distance = haversineKm(
          params.lat!,
          params.lng!,
          Number(alert.lat),
          Number(alert.lng)
        );
        return distance <= params.radiusKm!;
      });
    }

    return alerts;
  },

  /**
   * GET CORRIDOR ALERT SUMMARY
   * 
   * Returns a comprehensive summary of all active alerts on a corridor,
   * including counts by severity/status and flags for critical conditions.
   */
  async getCorridorAlertSummary(corridorId: string): Promise<CorridorAlertSummary> {
    const now = new Date();

    // Fetch all active alerts
    const alerts = await prisma.roadAlert.findMany({
      where: {
        corridorId,
        clearedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute summary
    const activeAlertCount = alerts.length;
    const criticalAlertCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
    const verifiedAlertCount = alerts.filter((a) => a.isVerified).length;

    const hasFuelIssue = alerts.some((a) =>
      ['FUEL_STATION_EMPTY', 'FUEL_STATION_LIMITED'].includes(a.alertType)
    );
    const hasSecurityAlert = alerts.some((a) =>
      ['SECURITY_ELEVATED', 'SECURITY_AVOID'].includes(a.alertType)
    );
    const hasRoadClosure = alerts.some((a) =>
      ['ROAD_CLOSED', 'FLOODING_IMPASSABLE', 'ACCIDENT_BLOCKING'].includes(a.alertType)
    );

    const lastAlertAt = alerts.length > 0 ? alerts[0].createdAt : null;

    return {
      corridorId,
      activeAlertCount,
      criticalAlertCount,
      verifiedAlertCount,
      hasFuelIssue,
      hasSecurityAlert,
      hasRoadClosure,
      lastAlertAt,
      alerts,
    };
  },

  /**
   * CLEAR ALERT
   * 
   * Marks an alert as cleared (no longer active).
   */
  async clearAlert(params: ClearAlertParams): Promise<RoadAlert> {
    const alert = await prisma.roadAlert.findUnique({
      where: { id: params.alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.clearedAt) {
      throw new Error('Alert already cleared');
    }

    const now = new Date();
    const clearedAlert = await prisma.roadAlert.update({
      where: { id: params.alertId },
      data: {
        clearedAt: now,
        clearedByUserId: params.clearedByUserId,
      },
    });

    return clearedAlert;
  },

  /**
   * CREATE FUEL REPORT
   * 
   * Creates a report about fuel availability at a station.
   * Checks bonus eligibility based on cooldown period.
   * 
   * NOTE: FuelStationReport model should be created in the database schema.
   */
  async createFuelReport(params: CreateFuelReportParams): Promise<{ report: FuelStationReport; bonusEligible: boolean }> {
    // Load active StrategyVersion
    const strategyVersion = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
      orderBy: { activatedAt: 'desc' },
    });

    if (!strategyVersion) {
      throw new Error('No active strategy version configured');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // Always 6 hours

    // Persist report to database
    const createdReport = await prisma.fuelStationReport.create({
      data: {
        id: generateId('fsr'),
        stationName: params.stationName,
        lat: new Prisma.Decimal(params.lat),
        lng: new Prisma.Decimal(params.lng),
        corridorId: params.corridorId ?? null,
        zoneId: params.zoneId ?? null,
        hasFuel: params.hasFuel,
        isLimited: params.isLimited ?? false,
        queueOverOneHour: params.queueOverOneHour ?? false,
        dieselPriceEtb: params.dieselPriceEtb ? new Prisma.Decimal(params.dieselPriceEtb) : null,
        reportedByUserId: params.reportedByUserId,
        expiresAt,
        verificationCount: 0,
        bonusPaid: false,
        bonusPaidEtb: 0,
      },
    });

    // Create local copy for internal use
    const report: FuelStationReport = {
      id: createdReport.id,
      reportedByUserId: createdReport.reportedByUserId,
      stationName: createdReport.stationName,
      lat: Number(createdReport.lat),
      lng: Number(createdReport.lng),
      corridorId: createdReport.corridorId ?? undefined,
      zoneId: createdReport.zoneId ?? undefined,
      hasFuel: createdReport.hasFuel,
      isLimited: createdReport.isLimited,
      queueOverOneHour: createdReport.queueOverOneHour,
      dieselPriceEtb: createdReport.dieselPriceEtb ? Number(createdReport.dieselPriceEtb) : undefined,
      expiresAt,
      verificationCount: 0,
      bonusPaid: false,
      createdAt: createdReport.createdAt,
    };

    // Check bonus eligibility
    let bonusEligible = false;
    const cooldownHours = Number(strategyVersion.fuelReportCooldownHours);
    const cooldownStart = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000);

    // Check for recent paid bonus
    const recentPaidBonus = await prisma.driverEarning.findFirst({
      where: {
        earningType: DRIVER_EARNING_TYPE.FUEL_REPORT_BONUS,
        driverId: params.reportedByUserId,
        createdAt: { gte: cooldownStart },
        status: 'PAID',
      },
    });

    bonusEligible = !recentPaidBonus;

    return { report, bonusEligible };
  },
};
