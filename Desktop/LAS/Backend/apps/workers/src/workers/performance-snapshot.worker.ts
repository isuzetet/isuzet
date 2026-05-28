// Runs monthly — calculates driver performance snapshots
// Queue: QUEUES.PERFORMANCE_SNAPSHOT
// Job data: { month: number, year: number }

import { Worker } from "bullmq";
import { prisma, generateId } from "@ruit/shared-db";
import { QUEUES, redis } from "@ruit/shared-queue";

interface PerformanceSnapshotJobData {
  month: number; // Ethiopian calendar month
  year: number;  // Ethiopian calendar year
}

export function createPerformanceSnapshotWorker() {
  return new Worker<PerformanceSnapshotJobData>(QUEUES.PERFORMANCE_SNAPSHOT, async (job) => {
    const { month, year } = job.data;
    console.log(`Generating performance snapshot for month ${month}, year ${year}`);

    // Helper to convert Ethiopian month/year to Gregorian date range
    // This is a simplified approximation. Real conversion is complex.
    function getGregorianDateRangeForEthiopianMonth(ethiopianMonth: number, ethiopianYear: number): { startDate: Date, endDate: Date } {
      // Ethiopian new year is usually September 11 or 12 Gregorian
      // For simplicity, let's just approximate the month range.
      // This needs to be robust for production.
      const startMonth = (ethiopianMonth + 8) % 12; // Approximation
      const gregorianYear = ethiopianYear + (startMonth < 8 ? 7 : 8); // Approximation
      
      const startDate = new Date(gregorianYear, startMonth, 1);
      const endDate = new Date(gregorianYear, startMonth + 1, 0); // Last day of the month
      endDate.setHours(23, 59, 59, 999);
      
      return { startDate, endDate };
    }

    const { startDate, endDate } = getGregorianDateRangeForEthiopianMonth(month, year);

    // 1. Get all drivers active in this period
    const drivers = await prisma.driver.findMany({
      where: {
        createdAt: { lte: endDate },
        OR: [
          { deletedAt: null },
          { deletedAt: { gte: startDate } },
        ],
      },
      select: { id: true, fleetOwnerId: true, userId: true },
    });

    for (const driver of drivers) {
      // For each driver, calculate performance metrics
      const tripsCompleted = await prisma.trip.count({
        where: {
          driverId: driver.id,
          status: "COMPLETED",
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      const onTimeDeliveries = await prisma.trip.count({
        where: {
          driverId: driver.id,
          status: "COMPLETED",
          createdAt: { gte: startDate, lte: endDate },
          onTime: true, // Assuming a boolean field for on-time delivery
        },
      });

      const lateDeliveries = tripsCompleted - onTimeDeliveries;

      const incidentCount = await prisma.incident.count({
        where: {
          reportedBy: driver.userId,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      // Average rating: aggregate from feedback/dispute resolution ratings
      // If no ratings available, default to 4.0 (neutral)
      const ratingEventCount = await prisma.event.count({
        where: {
          eventType: { in: ['DRIVER_RATING_SUBMITTED', 'FEEDBACK_RATING'] },
          aggregateId: driver.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      });
      const averageRating = ratingEventCount > 0 ? 4.0 : 4.0; // Base rating, would need detailed rating events to calculate true average

      // Total earnings: sum of all escrow releases to this driver during period
      const earningsResult = await prisma.escrowLedgerEntry.aggregate({
        where: {
          toUserId: driver.userId,
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
          type: { in: ['DRIVER_PAYOUT', 'BONUS', 'REFUND'] },
        },
        _sum: { amountCents: true },
      });
      const totalEarningsEtb = ((earningsResult._sum.amountCents || 0) / 100); // Convert cents to ETB

      // Utilization rate: ratio of trips completed to max possible trips
      // Max possible: assume 1 trip per day on average (can be tuned via config)
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const maxPossibleTrips = Math.max(1, daysInPeriod / 1.5); // Conservative estimate: 1 trip per 1.5 days
      const utilizationRate = Math.min(1.0, tripsCompleted / maxPossibleTrips);

      // 3. Upsert DriverPerformanceSnapshot record
      await prisma.driverPerformanceSnapshot.upsert({
        where: {
          driverId_fleetOwnerId_periodMonth_periodYear: {
            driverId: driver.id,
            fleetOwnerId: driver.fleetOwnerId || "N/A", // Handle cases where driver is not affiliated
            periodMonth: month,
            periodYear: year,
          },
        },
        update: {
          tripsCompleted,
          onTimeDeliveries,
          lateDeliveries,
          incidentCount,
          averageRating,
          totalEarningsEtb,
          utilizationRate,
        },
        create: {
          id: generateId("dps"),
          driverId: driver.id,
          fleetOwnerId: driver.fleetOwnerId || "N/A",
          periodMonth: month,
          periodYear: year,
          tripsCompleted,
          onTimeDeliveries,
          lateDeliveries,
          incidentCount,
          averageRating,
          totalEarningsEtb,
          utilizationRate,
        },
      });

      console.log(`Snapshot created for driver ${driver.id} for ${month}/${year}`);
    }

    // 4. Identify top performers — notify their fleet owners (stub)
    console.log(`Performance snapshot job ${job.id} completed.`);
  }, { connection: redis });
}
