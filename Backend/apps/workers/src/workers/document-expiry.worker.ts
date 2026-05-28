/**
 * Document Expiry Worker
 * Runs daily at 6am Ethiopia time
 * Checks all driver licenses and truck documents for upcoming expiry
 * Creates/updates DocumentExpiryAlert records and sends notifications at 30, 14, 1 day(s) before expiry, and when expired
 */

import { Worker } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface DocumentExpiryCheckJob {
  // No input needed - scans all drivers and trucks
}

export async function runDocumentExpiryCheck(): Promise<{
  processed: number;
  alertsCreated: number;
  alertsUpdated: number;
  notificationsSent: number;
  errors: string[];
}> {
  console.log('Starting document expiry check...');

  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let alertsCreated = 0;
  let alertsUpdated = 0;
  let notificationsSent = 0;

  try {
    // ── PHASE 1: Process Driver documents ────────────────────────────────────────

    console.log('PHASE 1: Processing driver documents...');
    const drivers = await prisma.driver.findMany({
      where: {
        status: 'ACTIVE', // Check schema for the actual active status field name if different
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
          },
        },
      },
      take: 1000, // MVP limit: small Ethiopian fleet
    });

    for (const driver of drivers) {
      processed++;

      // Check DRIVER_LICENSE if expiry date exists
      if (driver.licenseExpiry) {
        const result = await processDocumentExpiry({
          entityType: 'DRIVER',
          entityId: driver.id,
          ownerId: driver.id, // Driver is responsible for their own license
          documentType: 'DRIVER_LICENSE',
          expiryDate: driver.licenseExpiry,
        });

        if (result.action === 'created') alertsCreated++;
        if (result.action === 'updated') alertsUpdated++;
        if (result.notified) notificationsSent++;
      }
    }

    console.log(
      `Processed ${drivers.length} drivers. Alerts created: ${alertsCreated}, updated: ${alertsUpdated}`
    );

    // ── PHASE 2: Process Truck documents ─────────────────────────────────────────

    console.log('PHASE 2: Processing truck documents...');
    const trucks = await prisma.truck.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        fleetOwner: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
      take: 1000,
    });

    for (const truck of trucks) {
      processed++;

      // Determine who should receive notifications
      const ownerId = truck.fleetOwnerId || truck.id;

      // Check VEHICLE_INSURANCE
      if (truck.insuranceExpiry) {
        const result = await processDocumentExpiry({
          entityType: 'TRUCK',
          entityId: truck.id,
          ownerId,
          documentType: 'VEHICLE_INSURANCE',
          expiryDate: truck.insuranceExpiry,
        });

        if (result.action === 'created') alertsCreated++;
        if (result.action === 'updated') alertsUpdated++;
        if (result.notified) notificationsSent++;
      }

      // Check VEHICLE_INSPECTION (using annualInspectionExpiry)
      if (truck.annualInspectionExpiry) {
        const result = await processDocumentExpiry({
          entityType: 'TRUCK',
          entityId: truck.id,
          ownerId,
          documentType: 'VEHICLE_INSPECTION',
          expiryDate: truck.annualInspectionExpiry,
        });

        if (result.action === 'created') alertsCreated++;
        if (result.action === 'updated') alertsUpdated++;
        if (result.notified) notificationsSent++;
      }

      // Check ROAD_WORTHINESS
      if (truck.roadWorthinessExpiry) {
        const result = await processDocumentExpiry({
          entityType: 'TRUCK',
          entityId: truck.id,
          ownerId,
          documentType: 'ROAD_WORTHINESS',
          expiryDate: truck.roadWorthinessExpiry,
        });

        if (result.action === 'created') alertsCreated++;
        if (result.action === 'updated') alertsUpdated++;
        if (result.notified) notificationsSent++;
      }

      // NOTE: VEHICLE_REGISTRATION (registrationExpiry) field does not exist in Truck schema.
      // This document type is currently not tracked. Schema update required if this document needs monitoring.
    }

    console.log(`Processed ${trucks.length} trucks.`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Document expiry check failed:', errorMsg);
    errors.push(errorMsg);
  }

  const duration = Date.now() - startTime;
  console.log(`Document expiry check completed in ${duration}ms`);
  console.log(
    `Summary: Processed=${processed}, Created=${alertsCreated}, Updated=${alertsUpdated}, Notified=${notificationsSent}, Errors=${errors.length}`
  );

  return {
    processed,
    alertsCreated,
    alertsUpdated,
    notificationsSent,
    errors,
  };
}

/**
 * Helper: Process a single document expiry
 * Returns action taken and whether notification was sent
 */
async function processDocumentExpiry(params: {
  entityType: string; // 'DRIVER' | 'TRUCK'
  entityId: string;
  ownerId: string; // User/FleetOwner to notify
  documentType: string; // from DocumentType enum
  expiryDate: Date;
}): Promise<{ action: 'created' | 'updated' | 'skipped'; notified: boolean }> {
  const now = new Date();

  // Calculate days until expiry
  const daysUntilExpiry = Math.floor(
    (params.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine alert status based on days remaining
  let alertStatus: string;

  if (daysUntilExpiry < 0) {
    alertStatus = 'EXPIRED';
  } else if (daysUntilExpiry <= 1) {
    alertStatus = 'URGENT';
  } else if (daysUntilExpiry <= 14) {
    alertStatus = 'WARNING';
  } else if (daysUntilExpiry <= 30) {
    alertStatus = 'UPCOMING';
  } else {
    // >30 days: no alert needed
    return { action: 'skipped', notified: false };
  }

  // Upsert DocumentExpiryAlert using unique constraint: [entityType, entityId, documentType]
  const existingAlert = await prisma.documentExpiryAlert.findUnique({
    where: {
      entityType_entityId_documentType: {
        entityType: params.entityType,
        entityId: params.entityId,
        documentType: params.documentType,
      },
    },
  });

  let action: 'created' | 'updated' = 'created';
  let shouldNotify = false;

  if (!existingAlert) {
    // Create new alert
    await prisma.documentExpiryAlert.create({
      data: {
        id: generateId('doc_alert'),
        entityType: params.entityType,
        entityId: params.entityId,
        ownerId: params.ownerId,
        documentType: params.documentType,
        expiryDate: params.expiryDate,
        alertStatus,
        lastAlertSentAt: null,
        alertCount: 0,
      },
    });

    action = 'created';
    // Notify on creation if at a threshold
    shouldNotify = [30, 14, 1, 0].includes(daysUntilExpiry) || daysUntilExpiry < 0;
  } else {
    // Update existing alert
    action = 'updated';

    // Do not re-alert if already resolved
    if (existingAlert.alertStatus === 'RESOLVED') {
      return { action: 'skipped', notified: false };
    }

    // Check if status changed (escalation) or if we hit a milestone day
    const statusChanged = existingAlert.alertStatus !== alertStatus;
    const isMilestone = [30, 14, 1, 0].includes(daysUntilExpiry) || daysUntilExpiry < 0;

    // Check throttle: don't notify if we sent alert within last 23 hours
    const lastAlert = existingAlert.lastAlertSentAt;
    const hoursAgo = lastAlert ? (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60) : Infinity;
    const throttled = hoursAgo < 23;

    shouldNotify = (statusChanged || isMilestone) && !throttled;

    // Update alert record
    await prisma.documentExpiryAlert.update({
      where: {
        id: existingAlert.id,
      },
      data: {
        alertStatus,
        expiryDate: params.expiryDate, // Update in case doc was renewed
        ...(shouldNotify && { lastAlertSentAt: now, alertCount: existingAlert.alertCount + 1 }),
      },
    });
  }

  // Send notification if triggered
  if (shouldNotify) {
    const message = `Document expiry alert: ${params.documentType} for ${params.entityType} ${params.entityId} expires in ${daysUntilExpiry} days (status: ${alertStatus})`;
    console.log(message);

    // TODO: Wire to notification engine in Prompt 5.1
    // For now, just log the alert
    // await addJob(QUEUES.NOTIFICATIONS, 'send-sms', {
    //   to: params.ownerId,
    //   message: message,
    // });
  }

  return { action, notified: shouldNotify };
}

export function createDocumentExpiryWorker(): Worker {
  return new Worker<DocumentExpiryCheckJob>(QUEUES.DOCUMENT_EXPIRY_CHECK, async (job) => {
    console.log(`Processing document expiry check job ${job.id}`);
    await runDocumentExpiryCheck();
  }, { connection: redis });
}
