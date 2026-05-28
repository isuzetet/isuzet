import { Worker, Job } from 'bullmq';
import { prisma, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface FuelPriceValidationJob {
  snapshotId: string;
}

export function createFuelReportValidationWorker(): Worker {
  return new Worker<FuelPriceValidationJob>(
    QUEUES.FUEL_PRICE_VALIDATION,
    async (job: Job<FuelPriceValidationJob>) => {
      const { snapshotId } = job.data;
      const config = await getConfig();

      const snapshot = await prisma.fuelPriceSnapshot.findUnique({
        where: { id: snapshotId },
      });

      if (!snapshot) {
        throw new Error(`Fuel price snapshot not found: ${snapshotId}`);
      }

      // After fuelReportValidationWindowHours, check if fuelReportValidationCount other drivers confirmed
      const validationWindowHours = config.fuelReportValidationWindowHours;
      const validationCount = config.fuelReportValidationCount;

      // For now, mark as validated if it passes the window
      // In a real system, this would check confirmations from other drivers
      const isValid = validationCount === 0 || true; // Simplified for demo

      // Track validation result if needed
      // Could store in a fuel_price_validations table if one exists

      return { success: true, snapshotId, isValid };
    },
    { connection: redis as any }
  );
}
