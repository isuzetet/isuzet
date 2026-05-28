import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface ZoneDemandJob {
  // No data needed - scans all zones
}

export function createZoneDemandWorker(): Worker {
  return new Worker<ZoneDemandJob>(
    QUEUES.ZONE_DEMAND_UPDATE,
    async (job: Job<ZoneDemandJob>) => {
      const startTime = Date.now();

      // Find all Zones
      const zones = await prisma.zone.findMany();

      console.log(`Processing zone demand for ${zones.length} zones...`);

      // Process zones in parallel
      const results = await Promise.all(
        zones.map(async (zone: any) => {
          // a. Count Drivers where currentZoneId = zone.id -> availableTrucks
          const availableTrucksCount = await prisma.driver.count({
            where: {
              currentZoneId: zone.id,
              status: { in: ['AVAILABLE', 'LOADED', 'EN_ROUTE', 'WAITING_AT_TERMINAL'] },
              // Only count active drivers who could take loads
            },
          });

          // b. Count Loads where pickupZoneId = zone.id AND status IN ['OPEN', 'READY_TO_MATCH'] -> openLoads
          const openLoadsCount = await prisma.load.count({
            where: {
              pickupZoneId: zone.id,
              status: { in: ['OPEN', 'READY_TO_MATCH'] },
              deletedAt: null,
            },
          });

          // c. Calculate demandPressure = openLoads / Math.max(availableTrucks, 1)
          const demandPressure = openLoadsCount / Math.max(availableTrucksCount, 1);

          // d. Calculate newTruckDemandIndex:
          // if demandPressure > 2.0: 1.0 (high demand)
          // if demandPressure > 1.0: 0.7
          // if demandPressure > 0.5: 0.4
          // else: 0.2 (oversupply)
          let newTruckDemandIndex: number;
          if (demandPressure > 2.0) {
            newTruckDemandIndex = 1.0;
          } else if (demandPressure > 1.0) {
            newTruckDemandIndex = 0.7;
          } else if (demandPressure > 0.5) {
            newTruckDemandIndex = 0.4;
          } else {
            newTruckDemandIndex = 0.2;
          }

          // e. Create ZoneDemandSnapshot
          const snapshot = await prisma.zoneDemandSnapshot.create({
            data: {
              zoneId: zone.id,
              availableTrucks: availableTrucksCount,
              openLoads: openLoadsCount,
              demandIndex: demandPressure, // Use demandIndex as the field name in ZoneDemandSnapshot
              terminalQueueCount: 0, // Not calculated in this logic
              snapshotAt: new Date(),
            },
          });

          // f. Update Zone.truckDemandIndex (field exists in Zone model)
          await prisma.zone.update({
            where: { id: zone.id },
            data: {
              truckDemandIndex: newTruckDemandIndex,
            },
          });

          return {
            zoneId: zone.id,
            availableTrucks: availableTrucksCount,
            openLoads: openLoadsCount,
            demandPressure,
            truckDemandIndex: newTruckDemandIndex,
            snapshotId: snapshot.id,
          };
        })
      );

      const totalTime = Date.now() - startTime;
      const zonesUpdated = results.length;

      console.log(`Zone demand update completed: ${zonesUpdated} zones updated in ${totalTime}ms`);

      return {
        success: true,
        zonesUpdated,
        totalTimeMs: totalTime,
        zones: results.map((r: any) => ({
          zoneId: r.zoneId,
          availableTrucks: r.availableTrucks,
          openLoads: r.openLoads,
          demandIndex: r.truckDemandIndex,
        })),
      };
    },
    { connection: redis, concurrency: 1 }
  );
}

export { redis };

