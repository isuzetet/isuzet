/**
 * RUIT CBE - Document and License Expiry Monitoring
 */
import { prisma } from '@ruit/shared-db';
import { EVENT_TYPES } from '@ruit/shared-types';

const NOTIFICATION_TIMEOUT_MS = 5000; // 5 second timeout

/**
 * Helper to notify notification engine with timeout and error handling
 */
async function notifyViaSms(phone: string, message: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT_MS);

    const response = await fetch('http://localhost:3013/internal/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        message,
        template: null
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[EXPIRY] SMS notification failed: ${response.status} for phone ${phone}`);
    }
  } catch (error) {
    console.error(`[EXPIRY] SMS notification error for ${phone}:`, error);
    // Log error but don't crash - notifications are non-critical
  }
}

/**
 * Check expiring documents and licenses
 * Run daily via BullMQ scheduled job
 */
export async function checkExpiringDocuments(): Promise<void> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Check truck documents
  const trucksWithExpiringDocs = await prisma.truck.findMany({
    where: {
      OR: [
        { insuranceExpiry: { lt: thirtyDaysFromNow, gt: new Date() } },
        { annualInspectionExpiry: { lt: thirtyDaysFromNow, gt: new Date() } },
        { roadWorthinessExpiry: { lt: thirtyDaysFromNow, gt: new Date() } }
      ],
      status: 'ACTIVE',
      deletedAt: null
    },
  });

  // Batch fetch all unique fleet owners (not per-truck)
  const uniqueTruckOwnerIds = [...new Set(
    trucksWithExpiringDocs
      .map(t => t.fleetOwnerId)
      .filter((id): id is string => id !== null)
  )];
  
  const truckOwnersMap = new Map(
    (await prisma.fleetOwner.findMany({
      where: { id: { in: uniqueTruckOwnerIds } },
      include: { user: true }
    })).map(owner => [owner.id, owner])
  );

  for (const truck of trucksWithExpiringDocs) {
    await emitEvent({
      eventType: EVENT_TYPES.INSURANCE_EXPIRY_WARNING,
      aggregateId: truck.id,
      aggregateType: 'TRUCK',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      payload: {
        truck_id: truck.id,
        plate_number: truck.plateNumber,
        fleetOwnerId: truck.fleetOwnerId,
        insurance_expiry: truck.insuranceExpiry?.toISOString(),
        annual_inspection_expiry: truck.annualInspectionExpiry?.toISOString(),
        road_worthiness_expiry: truck.roadWorthinessExpiry?.toISOString()
      }
    });

    // Notify fleet owner
    if (truck.fleetOwnerId) {
      const owner = truckOwnersMap.get(truck.fleetOwnerId);
      if (owner?.user?.phone) {
        await notifyViaSms(
          owner.user.phone,
          `Reminder: Truck ${truck.plateNumber} has documents expiring soon. Please renew to avoid service disruption.`
        );
      }
    }
  }

  // Check driver licenses
  const driversWithExpiringLicenses = await prisma.driver.findMany({
    where: {
      licenseExpiry: { lt: thirtyDaysFromNow, gt: new Date() }
    },
    include: { user: true }
  });

  // Batch fetch all unique fleet owners for drivers (not per-driver)
  const uniqueDriverOwnerIds = [...new Set(
    driversWithExpiringLicenses
      .map(d => d.fleetOwnerId)
      .filter((id): id is string => id !== null)
  )];
  
  const driverOwnersMap = new Map(
    (await prisma.fleetOwner.findMany({
      where: { id: { in: uniqueDriverOwnerIds } },
      include: { user: true }
    })).map(owner => [owner.id, owner])
  );

  for (const driver of driversWithExpiringLicenses) {
    await emitEvent({
      eventType: EVENT_TYPES.LICENSE_EXPIRY_WARNING,
      aggregateId: driver.id,
      aggregateType: 'DRIVER',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      payload: {
        driverId: driver.id,
        license_expiry: driver.licenseExpiry?.toISOString()
      }
    });

    // Notify driver
    if (driver.user?.phone) {
      await notifyViaSms(
        driver.user.phone,
        `Reminder: Your driver's license expires soon. Please renew to continue using Ruit services.`
      );
    }

    // Notify fleet owner
    if (driver.fleetOwnerId) {
      const owner = driverOwnersMap.get(driver.fleetOwnerId);
      if (owner?.user?.phone) {
        await notifyViaSms(
          owner.user.phone,
          `Reminder: Driver ${driver.user?.fullName} has a license expiring soon.`
        );
      }
    }
  }
}

async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { ulid } = await import('ulid');
  const strategyId = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  }).then((s: { id?: string } | null) => s?.id ?? 'str_default');

  await prisma.event.create({
    data: {
      id: `evt_${ulid()}`,
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategyId,
      corridorId: null,
      payload: params.payload as any,
      metadata: { source: 'EXPIRY_SERVICE', timestamp: new Date().toISOString() } as any
    }
  });
}

