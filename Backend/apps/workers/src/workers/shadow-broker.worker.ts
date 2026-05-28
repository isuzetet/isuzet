import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface ShadowBrokerJob {
  // Periodic job - no specific input
}

/**
 * Shadow Broker Detection Worker
 * 
 * Detects users (brokers/agents/orderers) with low load completion rates.
 * A shadow broker consistently receives loads but routes drivers off-platform.
 * 
 * Detection logic over last 30 days:
 *   - platformLoadsAssigned: count of loads assigned
 *   - platformLoadsCompleted: count of loads with DELIVERED status
 *   - completionRate = platformLoadsCompleted / platformLoadsAssigned
 * 
 * If completionRate < 0.85 AND platformLoadsAssigned >= 5:
 *   → Create investigation incident for OPS Admin review
 *   → Do NOT auto-ban, only flag for investigation
 *   → Don't flag same user again within 14 days (cooldown)
 */
async function shadowBrokerScan(): Promise<void> {
  const config = await getConfig();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all orderers (brokers/agents who receive loads)
  const orderers = await prisma.orderer.findMany({
    where: {
      user: {
        deletedAt: null,
        status: { not: 'DELETED' },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
    },
  });

  for (const orderer of orderers) {
    // Check if orderer was recently flagged (cooldown period)
    const recentFlag = await prisma.incident.findFirst({
      where: {
        reportedBy: orderer.user.id,
        incidentType: 'SHADOW_BROKER_SUSPICION',
        createdAt: { gte: new Date(now.getTime() - config.shadowBrokerFlagCooldownDays * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentFlag) {
      console.log(`Orderer ${orderer.id} recently flagged - cooldown active`);
      continue;
    }

    // Count loads assigned (created) in last 30 days
    const platformLoadsAssigned = await prisma.load.count({
      where: {
        ordererId: orderer.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Need minimum load count to analyze
    if (platformLoadsAssigned < config.shadowBrokerMinLoadsForDetection) {
      continue;
    }

    // Count loads delivered in last 30 days
    const platformLoadsCompleted = await prisma.load.count({
      where: {
        ordererId: orderer.id,
        createdAt: { gte: thirtyDaysAgo },
        status: 'DELIVERED',
      },
    });

    // Calculate completion rate
    const completionRate = platformLoadsAssigned > 0 ? platformLoadsCompleted / platformLoadsAssigned : 0;

    // Flag if below threshold
    if (completionRate < config.shadowBrokerSuspicionThreshold) {
      console.log(
        `Orderer ${orderer.id} flagged: completion rate ${(completionRate * 100).toFixed(1)}% (threshold: ${(config.shadowBrokerSuspicionThreshold * 100).toFixed(1)}%) - loads assigned: ${platformLoadsAssigned}, completed: ${platformLoadsCompleted}`
      );

      // Create investigation incident
      const incident = await prisma.incident.create({
        data: {
          id: generateId('inc'),
          tripId: '', // We don't have a specific trip, but field is required
          incidentType: 'SHADOW_BROKER_SUSPICION',
          reportedBy: orderer.user.id,
          reporterRole: 'ORDERER',
          status: 'OPEN',
          severity: 'HIGH',
          description: `Suspected shadow broker activity: Low completion rate (${(completionRate * 100).toFixed(1)}%) over 30 days. Loads assigned: ${platformLoadsAssigned}, completed: ${platformLoadsCompleted}. Orderer: ${orderer.user.fullName}`,
        },
      });

      // Notify OPS Admin via event
      const strategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { activatedAt: 'desc' },
      });

      await prisma.event.create({
        data: {
          id: generateId('evt'),
          eventType: 'SHADOW_BROKER_INVESTIGATION_CREATED',
          aggregateId: orderer.id,
          aggregateType: 'Orderer',
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          strategyVersionId: strategy?.id ?? 'str_default',
          payload: {
            incidentId: incident.id,
            completionRate: parseFloat(completionRate.toFixed(4)),
            platformLoadsAssigned,
            platformLoadsCompleted,
            threshold: config.shadowBrokerSuspicionThreshold,
            message: `OPS ALERT: Orderer ${orderer.user.fullName} flagged for shadow broker investigation (${(completionRate * 100).toFixed(1)}% completion rate)`,
          } as any,
        },
      });
    }
  }
}

export function createShadowBrokerWorker(): Worker {
  return new Worker<ShadowBrokerJob>(
    QUEUES.SHADOW_BROKER_DETECTION,
    async (job: Job<ShadowBrokerJob>) => {
      await shadowBrokerScan();
      return { processed: 1 };
    },
    {
      connection: redis,
    }
  );
}
