import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface DuplicateAccountJob {
  // Periodic job - no specific input
}

/**
 * Duplicate Account Detection Worker
 * 
 * Prevents bonus gaming by detecting:
 * 1. Same phone number on multiple accounts
 * 2. Edit distance <= 1 on phone numbers (typos)
 * 3. Same deviceFingerprint (if available)
 * 
 * Action:
 * - Create DUPLICATE_ACCOUNT_SUSPECTED incident
 * - Set newer account status to PENDING_REVIEW
 * - Hold for config.duplicateSimHoldHours (48)
 * - OPS Admin reviews
 */

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function createDuplicateAccountWorker(): Worker {
  return new Worker<DuplicateAccountJob>(
    QUEUES.DUPLICATE_ACCOUNT_DETECTION,
    async (job: Job<DuplicateAccountJob>) => {
      const config = await getConfig();
      const now = new Date();

      // Get all active users
      const allUsers = await prisma.user.findMany({
        where: {
          deletedAt: null,
          status: { not: 'DELETED' },
        },
        select: {
          id: true,
          phone: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Check for exact phone matches
      const phoneMap: Record<string, typeof allUsers> = {};
      for (const user of allUsers) {
        if (!phoneMap[user.phone]) {
          phoneMap[user.phone] = [];
        }
        phoneMap[user.phone].push(user);
      }

      // Process exact duplicates
      for (const [phone, users] of Object.entries(phoneMap)) {
        if (users.length > 1) {
          // Sort by creation date - newer ones get flagged
          users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          for (let i = 1; i < users.length; i++) {
            const newerUser = users[i];

            // Create incident
            const incident = await prisma.incident.create({
              data: {
                id: generateId('inc'),
                tripId: newerUser.id, // Using tripId as aggregateId proxy
                incidentType: 'DUPLICATE_ACCOUNT_SUSPECTED',
                reportedBy: 'SYSTEM',
                reporterRole: 'SYSTEM',
                status: 'OPEN',
                severity: 'HIGH',
                description: `Multiple accounts with same phone number: ${phone}. Possible bonus gaming. User IDs: ${users.map((u) => u.id).join(', ')}`,
              },
            });

            // Set newer account to PENDING_REVIEW
            await prisma.user.update({
              where: { id: newerUser.id },
              data: {
                status: 'PENDING_REVIEW',
              },
            });

            console.log(
              `Duplicate phone detected: ${phone}. Flagged user ${newerUser.id} for review (incident ${incident.id})`
            );
          }
        }
      }

      // Check for similar phone numbers (edit distance <= 1)
      const phoneArray = Array.from(new Set(allUsers.map((u) => u.phone)));
      for (let i = 0; i < phoneArray.length; i++) {
        for (let j = i + 1; j < phoneArray.length; j++) {
          const distance = levenshteinDistance(phoneArray[i], phoneArray[j]);

          if (distance <= 1 && distance > 0) {
            // Similar phones - flag both
            const user1 = allUsers.find((u) => u.phone === phoneArray[i]);
            const user2 = allUsers.find((u) => u.phone === phoneArray[j]);

            if (user1 && user2) {
              const newerUser = user1.createdAt > user2.createdAt ? user1 : user2;

              const incident = await prisma.incident.create({
                data: {
                  id: generateId('inc'),
                  tripId: newerUser.id,
                  incidentType: 'DUPLICATE_ACCOUNT_SUSPECTED',
                  reportedBy: 'SYSTEM',
                  reporterRole: 'SYSTEM',
                  status: 'OPEN',
                  severity: 'MEDIUM',
                  description: `Similar phone numbers detected (distance ${distance}): ${phoneArray[i]} vs ${phoneArray[j]}. Possible typo or bonus gaming. User IDs: ${user1.id}, ${user2.id}`,
                },
              });

              // Flag newer account
              await prisma.user.update({
                where: { id: newerUser.id },
                data: {
                  status: 'PENDING_REVIEW',
                },
              });

              console.log(
                `Similar phone numbers detected: ${phoneArray[i]} vs ${phoneArray[j]} (distance ${distance}). Flagged user ${newerUser.id}`
              );
            }
          }
        }
      }

      // Check for duplicate device fingerprints (if field exists)
      try {
        const deviceFingerprintMap: Record<string, string[]> = {};

        const driversWithFingerprints = await prisma.driver.findMany({
          where: {
            deviceFingerprint: { not: null },
            user: {
              deletedAt: null,
            },
          },
          select: {
            id: true,
            userId: true,
            deviceFingerprint: true,
            user: {
              select: {
                createdAt: true,
              },
            },
          },
        });

        for (const driver of driversWithFingerprints) {
          if (driver.deviceFingerprint) {
            if (!deviceFingerprintMap[driver.deviceFingerprint]) {
              deviceFingerprintMap[driver.deviceFingerprint] = [];
            }
            deviceFingerprintMap[driver.deviceFingerprint].push(driver.userId);
          }
        }

        for (const [fingerprint, userIds] of Object.entries(deviceFingerprintMap)) {
          if (userIds.length > 1) {
            // Multiple users with same device fingerprint
            const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            });

            for (let i = 1; i < users.length; i++) {
              const newerUser = users[i];

              await prisma.incident.create({
                data: {
                  id: generateId('inc'),
                  tripId: newerUser.id,
                  incidentType: 'DUPLICATE_ACCOUNT_SUSPECTED',
                  reportedBy: 'SYSTEM',
                  reporterRole: 'SYSTEM',
                  status: 'OPEN',
                  severity: 'HIGH',
                  description: `Multiple accounts with same device fingerprint. Possible bonus gaming. User IDs: ${userIds.join(', ')}`,
                },
              });

              await prisma.user.update({
                where: { id: newerUser.id },
                data: {
                  status: 'PENDING_REVIEW',
                },
              });

              console.log(
                `Duplicate device fingerprint detected. Flagged users: ${userIds.join(', ')}`
              );
            }
          }
        }
      } catch (err) {
        console.log('Device fingerprint check skipped (field may not exist)');
      }

      return { processed: 1 };
    },
    {
      connection: redis,
    }
  );
}
