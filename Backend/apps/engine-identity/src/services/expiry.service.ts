/**
 * RUIT CBE - Document and License Expiry Monitoring
 */
import { prisma } from '@ruit/shared-db';
import { EVENT_TYPES } from '@ruit/shared-types';

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
      // truck model uses a status column rather than `isActive`.
      // only consider active vehicles (and ignore soft-deleted ones)
      status: 'ACTIVE',
      deletedAt: null
    },
    // we do not load the relation here â€“ the model only exposes
    // `fleetOwnerId`, so fetch the owner when needed below
  });

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
      const owner = await prisma.fleetOwner.findUnique({
        where: { id: truck.fleetOwnerId },
        include: { user: true }
      });

      if (owner?.user?.phone) {
        await fetch('http://localhost:3013/internal/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: owner.user.phone,
            message: `Reminder: Truck ${truck.plateNumber} has documents expiring soon. Please renew to avoid service disruption.`,
            template: null
          })
        }).catch(() => {});
      }
    }
  }

  // Check driver licenses
  const driversWithExpiringLicenses = await prisma.driver.findMany({
    where: {
      licenseExpiry: { lt: thirtyDaysFromNow, gt: new Date() }
      // remove isActive â€“ DriverWhereInput has no such field
    },
    include: { user: true }
  });

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
      await fetch('http://localhost:3013/internal/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: driver.user.phone,
          message: `Reminder: Your driver's license expires soon. Please renew to continue using Ruit services.`,
          template: null
        })
      }).catch(() => {});
    }

    // Notify fleet owner
    if (driver.fleetOwnerId) {
      const owner = await prisma.fleetOwner.findUnique({
        where: { id: driver.fleetOwnerId },
        include: { user: true }
      });

      if (owner?.user?.phone) {
        await fetch('http://localhost:3013/internal/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: owner.user.phone,
            message: `Reminder: Driver ${driver.user?.fullName} has a license expiring soon.`,
            template: null
          })
        }).catch(() => {});
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

