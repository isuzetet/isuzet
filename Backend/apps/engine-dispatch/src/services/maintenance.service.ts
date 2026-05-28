import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';

type MaintenanceType = string;

export interface CreateMaintenanceLogInput {
  fleetOwnerId: string;
  truckId: string;
  serviceType: MaintenanceType;
  description?: string;
  costCents?: number;
  servicedAt: Date;
  nextServiceDue?: Date;
  nextServiceKm?: number;
  mechanic?: string;
  notes?: string;
}

export interface MaintenanceEntry {
  id: string;
  truckId: string;
  serviceType: MaintenanceType;
  description: string | null;
  costCents: number;
  servicedAt: Date;
  nextServiceDue: Date | null;
  nextServiceKm: number | null;
  mechanic: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createMaintenanceLog(
  input: CreateMaintenanceLogInput
): Promise<string> {
  // Verify fleet owner owns the truck
  const truck = await prisma.truck.findUnique({
    where: { id: input.truckId },
  });

  if (!truck || truck.fleetOwnerId !== input.fleetOwnerId) {
    throw new Error('Truck not found or does not belong to this fleet owner');
  }

  const log = await prisma.maintenanceLog.create({
    data: {
      id: generateId('mnt'),
      truckId: input.truckId,
      serviceType: input.serviceType as any,
      description: input.description || null,
      costCents: input.costCents || 0,
      servicedAt: input.servicedAt,
      nextServiceDue: input.nextServiceDue || null,
      nextServiceKm: input.nextServiceKm || null,
      mechanic: input.mechanic || null,
      notes: input.notes || null,
    },
  });

  return log.id;
}

export async function getMaintenanceLogs(truckId: string): Promise<MaintenanceEntry[]> {
  const logs = await prisma.maintenanceLog.findMany({
    where: { truckId },
    orderBy: { servicedAt: 'desc' },
  });

  return logs as MaintenanceEntry[];
}

export async function getOverdueMaintenance(fleetOwnerId: string): Promise<any[]> {
  const now = new Date();

  const trucks = await prisma.truck.findMany({
    where: { fleetOwnerId },
  });

  const overdue = [];

  for (const truck of trucks) {
    const lastLog = await prisma.maintenanceLog.findFirst({
      where: { truckId: truck.id },
      orderBy: { servicedAt: 'desc' },
    });

    if (lastLog && lastLog.nextServiceDue && new Date(lastLog.nextServiceDue) < now) {
      overdue.push({
        truckId: truck.id,
        plateNumber: truck.plateNumber,
        make: truck.make,
        model: truck.model,
        lastServiceDate: lastLog.servicedAt,
        nextServiceDueDate: lastLog.nextServiceDue,
        nextServiceKm: lastLog.nextServiceKm,
      });
    }
  }

  return overdue;
}
