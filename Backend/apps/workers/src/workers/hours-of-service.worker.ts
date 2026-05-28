import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface HoSJob {
  // Periodic job - scans all drivers for hours of service threshold
}

export function createHoursOfServiceWorker(): Worker {
  return new Worker<HoSJob>(
    QUEUES.HOURS_OF_SERVICE,
    async (job: Job<HoSJob>) => {
      const config = await getConfig();

      // Get all active drivers
      const drivers = await prisma.driver.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      for (const driver of drivers) {
        // Calculate hours since last confirmed rest (6h stationary between 9pm-5am)
        // For simplicity, use: hours since last actual rest (actualPickupAt = null or no active trip > X hours)

        const activeTrip = await prisma.trip.findFirst({
          where: {
            driverId: driver.id,
            status: { in: ['IN_TRANSIT', 'ACTIVE', 'PENDING'] },
          },
          orderBy: { actualPickupAt: 'desc' },
        });

        let hoursActive = 0;

        if (activeTrip && activeTrip.actualPickupAt) {
          hoursActive = (Date.now() - activeTrip.actualPickupAt.getTime()) / (1000 * 60 * 60);
        } else {
          // No active trip - driver is resting
          continue;
        }

        // Determine action based on HoS thresholds
        let action = 'NONE';

        if (hoursActive >= config.hosBlockHours) {
          action = 'HARD_BLOCK';
        } else if (hoursActive >= config.hoursServiceHardBlock) {
          action = 'HARD_BLOCK';
        } else if (hoursActive >= config.hoursServiceSoftBlock) {
          action = 'SOFT_BLOCK';
        } else if (hoursActive > config.hoursServiceWarning) {
          action = 'ADVISORY';
        }

        // Check if driver has an active trip (IN_TRANSIT)
        const hasActivePendingTrip = await prisma.trip.findFirst({
          where: {
            driverId: driver.id,
            status: { in: ['IN_TRANSIT'] },
          },
        });

        // Apply actions
        if (action === 'ADVISORY') {
          // Send notification only
          await prisma.event.create({
            data: {
              id: generateId('evt'),
              eventType: 'HOS_ADVISORY',
              aggregateId: driver.id,
              aggregateType: 'Driver',
              actorId: driver.id,
              actorRole: 'DRIVER',
              strategyVersionId: 'default',
              payload: {
                hoursActive: Math.round(hoursActive),
                thresholdHours: config.hosAdvisoryHours,
                message: `You have been driving ${Math.round(hoursActive)} hours. Consider taking rest.`,
              },
            },
          });
        } else if (action === 'SOFT_BLOCK') {
          // Soft block - require acknowledgment before load offer
          await prisma.driver.update({
            where: { id: driver.id },
            data: {
              availabilityStatus: 'HOS_SOFT_BLOCK',
            },
          });

          await prisma.event.create({
            data: {
              id: generateId('evt'),
              eventType: 'HOS_SOFT_BLOCK',
              aggregateId: driver.id,
              aggregateType: 'Driver',
              actorId: driver.id,
              actorRole: 'DRIVER',
              strategyVersionId: 'default',
              payload: {
                hoursActive: Math.round(hoursActive),
                thresholdHours: config.hosBlockHours,
                message: `You have been driving ${Math.round(hoursActive)} hours. Single tap acknowledgment required to accept next load.`,
              },
            },
          });
        } else if (action === 'HARD_BLOCK') {
          // Hard block - unless driver has active trip
          if (hasActivePendingTrip) {
            // Don't block active trips - just send warning
            await prisma.event.create({
              data: {
                id: generateId('evt'),
                eventType: 'HOS_WARNING_ACTIVE_TRIP',
                aggregateId: driver.id,
                aggregateType: 'Driver',
                actorId: driver.id,
                actorRole: 'DRIVER',
                strategyVersionId: 'default',
                payload: {
                  hoursActive: Math.round(hoursActive),
                  thresholdHours: config.hosBlockHours,
                  activeTrip: true,
                  message: `You have been driving ${Math.round(hoursActive)} hours. Complete your current trip and rest before accepting new loads.`,
                },
              },
            });
          } else {
            // No active trip - apply hard block
            await prisma.driver.update({
              where: { id: driver.id },
              data: {
                availabilityStatus: 'HOS_RESTRICTED',
              },
            });

            await prisma.event.create({
              data: {
                id: generateId('evt'),
                eventType: 'HOS_BLOCKED',
                aggregateId: driver.id,
                aggregateType: 'Driver',
                actorId: driver.id,
                actorRole: 'DRIVER',
                strategyVersionId: 'default',
                payload: {
                  hoursActive: Math.round(hoursActive),
                  thresholdHours: config.hosBlockHours,
                  message: `You have been driving ${Math.round(hoursActive)} hours. Load acceptance blocked. You must rest for 6 hours before resuming.`,
                },
              },
            });
          }
        }
      }

      return { processed: drivers.length };
    },
    {
      connection: redis,
    }
  );
}
