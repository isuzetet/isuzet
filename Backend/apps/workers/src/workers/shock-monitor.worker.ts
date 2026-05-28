import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, getQueue, redis } from '@ruit/shared-queue';
import { EVENT_TYPES } from '@ruit/shared-types';

interface ShockMonitorJob {
  // No input needed - scans globally
}

async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}) {
  const strategy = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  await prisma.event.create({
    data: {
      id: generateId('evt'),
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategy?.id ?? 'str_default',
      corridorId: null,
      payload: params.payload as any,
      metadata: { source: 'SHOCK_MONITOR_WORKER', timestamp: new Date().toISOString() } as any,
    },
  });
}

export function createShockMonitorWorker(): Worker {
  return new Worker<ShockMonitorJob>(
    QUEUES.SHOCK_MONITOR,
    async (job) => {
      // Get active strategy for shock thresholds
      const strategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        select: { thresholdSet: true },
      });

      const thresholdSet = (strategy?.thresholdSet as any) || {};
      const shockThresholds = thresholdSet.shockAutoTriggers || {
        incident_spike_threshold: 5,
        fuel_queue_hours: 4,
        payment_failure_rate: 0.15,
      };

      const fourHoursAgo = new Date();
      fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Check incident spike in last 2 hours
      const recentIncidents = await prisma.event.count({
        where: {
          eventType: { contains: 'INCIDENT' },
          createdAt: { gte: twoHoursAgo },
        },
      });
      const incidentSpike = recentIncidents >= (shockThresholds.incident_spike_threshold || 5);

      // Check payment failure rate in last 24 hours
      const paymentEvents = await prisma.event.count({
        where: {
          eventType: { in: ['PAYMENT_SUCCESS', 'PAYMENT_FAILURE'] },
          createdAt: { gte: twentyFourHoursAgo },
        },
      });
      const paymentFailures = await prisma.event.count({
        where: {
          eventType: 'PAYMENT_FAILURE',
          createdAt: { gte: twentyFourHoursAgo },
        },
      });
      const failureRate = paymentEvents > 0 ? paymentFailures / paymentEvents : 0;
      const paymentShock = failureRate >= (shockThresholds.payment_failure_rate || 0.15);

      // Check for active shock events
      const activeShockEvents = await prisma.shockEvent.findMany({
        where: { isActive: true },
        orderBy: { severity: 'desc' },
      });
      const hasActiveShock = activeShockEvents.length > 0;
      const highestSeverity = hasActiveShock ? activeShockEvents[0].severity : 0;

      // Determine if shock should be activated
      let shockActivated = false;
      let shockDeactivated = false;
      let severity = 0;
      const conditions: string[] = [];

      if (incidentSpike) {
        conditions.push('incident_spike');
        severity = Math.max(severity, 2);
      }
      if (paymentShock) {
        conditions.push('payment_failure_spike');
        severity = Math.max(severity, 3);
      }

      if (!hasActiveShock && conditions.length > 0) {
        // Create shock event
        const newShockEvent = await prisma.shockEvent.create({
          data: {
            id: generateId('shock'),
            shockType: conditions.join(','),
            severity,
            isActive: true,
            startedAt: new Date(),
            triggeredBy: 'AUTO',
            affectedCorridors: [],
          },
        });
        shockActivated = true;

        // Emit SHOCK_MODE_ACTIVATED event
        await emitEvent({
          eventType: EVENT_TYPES.SHOCK_MODE_ACTIVATED,
          aggregateId: newShockEvent.id,
          aggregateType: 'SHOCK_EVENT',
          actorId: 'SYSTEM',
          actorRole: 'SHOCK_MONITOR',
          payload: {
            shock_event_id: newShockEvent.id,
            triggers: conditions,
            severity,
            active_events: activeShockEvents.length + 1,
            thresholds: shockThresholds,
          },
        });

        // Notify OPS team
        try {
          const notificationQueue = getQueue(QUEUES.NOTIFICATION);
          await notificationQueue.add('shock-alert', {
            userId: 'OPS_TEAM',
            channel: 'PUSH',
            templateId: 'SHOCK_MODE_ACTIVATED',
            templateData: {
              severity,
              triggers: conditions.join(', '),
              eventId: newShockEvent.id,
            },
            priority: 'HIGH',
          });
        } catch (err) {
          console.error('Failed to queue shock notification:', err);
        }
      }

      // If active shock event AND conditions resolved
      // Auto-deactivate if severity <= 2 and conditions clear
      // Do NOT auto-deactivate severity 3 or 4 (manual only)
      if (hasActiveShock && highestSeverity <= 2 && conditions.length === 0) {
        // Conditions resolved, auto-deactivate
        for (const shock of activeShockEvents) {
          if (shock.severity <= 2) {
            await prisma.shockEvent.update({
              where: { id: shock.id },
              data: {
                isActive: false,
                endedAt: new Date(),
              },
            });

            // Emit SHOCK_MODE_DEACTIVATED event
            await emitEvent({
              eventType: 'SHOCK_MODE_DEACTIVATED',
              aggregateId: shock.id,
              aggregateType: 'SHOCK_EVENT',
              actorId: 'SYSTEM',
              actorRole: 'SHOCK_MONITOR',
              payload: {
                shock_event_id: shock.id,
                resolution: 'AUTO',
                severity: shock.severity,
                reason: 'Conditions resolved',
              },
            });
            shockDeactivated = true;
          }
        }
      }

      return {
        success: true,
        shock_activated: shockActivated,
        shock_deactivated: shockDeactivated,
        active_shocks: hasActiveShock ? activeShockEvents.length : 0,
        conditions_detected: conditions,
        incident_spike: incidentSpike,
        payment_failure_rate: failureRate,
        severity,
      };
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };
