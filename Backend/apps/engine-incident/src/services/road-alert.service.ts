import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { addJob, QUEUES } from '@ruit/shared-queue';
import { ROAD_ALERT_TYPES, EVENT_TYPES, RoadAlertType } from '@ruit/shared-types';

export interface CreateRoadAlertInput {
  reportedByUserId: string;
  corridorId?: string;
  alertType: RoadAlertType;
  severity: string; // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  lat: number;
  lng: number;
  description?: string;
}

export interface ConfirmRoadAlertInput {
  alertId: string;
  confirmingDriverId: string;
}

export async function createRoadAlert(input: CreateRoadAlertInput): Promise<string> {
  const config = await getConfig();

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + config.roadAlertExpiryHours);

  const alert = await prisma.roadAlert.create({
    data: {
      id: generateId('ral'),
      reportedByUserId: input.reportedByUserId,
      corridorId: input.corridorId,
      alertType: input.alertType,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
      description: input.description,
      expiresAt,
      verificationCount: 0,
      bonusPaidEtb: 0,
      isVerified: false,
    },
  });

  // Schedule verification check
  await addJob(
    QUEUES.ROAD_ALERT_VERIFICATION,
    'check-alert-bonus',
    { alertId: alert.id },
    { delay: config.roadAlertExpiryHours * 60 * 60 * 1000 }
  );

  // Emit event
  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: EVENT_TYPES.ROAD_ALERT_CREATED,
      aggregateId: alert.id,
      aggregateType: 'ROAD_ALERT',
      actorId: input.reportedByUserId,
      actorRole: 'DRIVER',
      strategyVersionId: 'default',
      corridorId: input.corridorId,
      payload: {
        alertType: input.alertType,
        severity: input.severity,
        lat: input.lat,
        lng: input.lng,
      },
    },
  });

  return alert.id;
}

export async function confirmRoadAlert(input: ConfirmRoadAlertInput): Promise<{
  alertId: string;
  confirmedCount: number;
  bonusPaid: boolean;
}> {
  const config = await getConfig();

  let bonusPaid = false;

  await prisma.$transaction(async (tx: any) => {
    // Update alert
    await tx.roadAlert.update({
      where: { id: input.alertId },
      data: {
        verificationCount: { increment: 1 },
      },
    });

    const alert = await tx.roadAlert.findUnique({
      where: { id: input.alertId },
    });

    if (
      alert &&
      alert.verificationCount >= config.roadAlertMinVerificationsForBonus &&
      alert.bonusPaidEtb === 0 &&
      alert.reportedByUserId
    ) {
      // Pay bonus to original poster
      const bonusEtb = Math.round((config.roadAlertBonusCents || 5000) / 100);
      await tx.roadAlert.update({
        where: { id: input.alertId },
        data: { bonusPaidEtb: bonusEtb },
      });

      // Create escrow entry for bonus
      await tx.escrowLedgerEntry.create({
        data: {
          id: generateId('esc'),
          toUserId: alert.reportedByUserId,
          amountCents: config.roadAlertBonusCents || 5000,
          type: 'ROAD_ALERT_BONUS',
          status: 'COMPLETED',
          settledAt: new Date(),
          notes: `Bonus for verified road alert ${input.alertId}`,
        },
      });

      // Get driver and create earning record
      const driver = await tx.driver.findUnique({
        where: { userId: alert.reportedByUserId },
      });

      if (driver) {
        await tx.driverEarning.create({
          data: {
            id: generateId('der'),
            driverId: driver.id,
            earningType: 'ROAD_ALERT_BONUS',
            amountEtb: bonusEtb,
            status: 'PAID',
            paidAt: new Date(),
            description: `Road alert bonus - ${alert.alertType}`,
          },
        });
      }

      bonusPaid = true;
    }
  });

  const alert = await prisma.roadAlert.findUnique({
    where: { id: input.alertId },
  });

  return {
    alertId: input.alertId,
    confirmedCount: alert?.verificationCount || 0,
    bonusPaid,
  };
}

export async function getActiveRoadAlerts(corridorId?: string): Promise<any[]> {
  const now = new Date();

  const alerts = await prisma.roadAlert.findMany({
    where: {
      clearedAt: null,
      expiresAt: { gt: now },
      ...(corridorId && { corridorId }),
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });

  return alerts;
}

export async function expireOldAlerts(): Promise<number> {
  const now = new Date();

  const result = await prisma.roadAlert.updateMany({
    where: {
      clearedAt: null,
      expiresAt: { lt: now },
    },
    data: { clearedAt: now },
  });

  return result.count;
}
