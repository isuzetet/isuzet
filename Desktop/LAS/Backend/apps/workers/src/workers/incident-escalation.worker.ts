import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, getQueue, redis } from '@ruit/shared-queue';

interface IncidentEscalationJob {
  incidentId: string;
  escalationReason: string;
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
      metadata: { source: 'INCIDENT_ESCALATION_WORKER', timestamp: new Date().toISOString() } as any,
    },
  });
}

function calculateSlaHours(severity: string): number {
  switch (severity) {
    case 'LOW': return 5 * 24; // 5 days
    case 'MEDIUM': return 3 * 24; // 3 days
    case 'HIGH': return 24; // 1 day
    case 'CRITICAL': return 0; // same day
    default: return 3 * 24;
  }
}

export function createIncidentEscalationWorker(): Worker {
  return new Worker<IncidentEscalationJob>(
    QUEUES.INCIDENT_ESCALATION,
    async (job) => {
      const { incidentId, escalationReason } = job.data;

      // Get incident
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      // If already CLOSED or RESOLVED, skip
      if (['CLOSED', 'RESOLVED'].includes(incident.status)) {
        console.log(`Incident ${incidentId} already ${incident.status}, skipping escalation`);
        return { success: true, escalated: false, reason: 'ALREADY_RESOLVED' };
      }

      // If OPEN and no assignedTo, auto-transition to ESCALATED
      if (incident.status === 'OPEN' && !incident.assignedTo) {
        // Update incident to ESCALATED
        await prisma.incident.update({
          where: { id: incidentId },
          data: {
            status: 'ESCALATED',
            escalationReason: escalationReason || 'SLA_BREACH_UNASSIGNED',
          },
        });

        // Emit DISPUTE_ESCALATED event
        await emitEvent({
          eventType: 'DISPUTE_ESCALATED',
          aggregateId: incidentId,
          aggregateType: 'INCIDENT',
          actorId: 'SYSTEM',
          actorRole: 'SLA_ENFORCEMENT',
          payload: {
            incident_id: incidentId,
            escalation_reason: escalationReason || 'SLA_BREACH_UNASSIGNED',
            previous_status: incident.status,
            severity: incident.severity,
          },
        });

        // Enqueue NOTIFICATION job for OPS team
        try {
          const notificationQueue = getQueue(QUEUES.NOTIFICATION);
          await notificationQueue.add('ops-notification', {
            userId: 'OPS_TEAM',
            channel: 'PUSH',
            templateId: 'INCIDENT_ESCALATED',
            templateData: {
              tripId: incident.tripId,
              incidentId,
              reason: escalationReason || 'SLA_BREACH_UNASSIGNED',
            },
            priority: 'HIGH',
          });
        } catch (err) {
          console.error('Failed to queue OPS notification:', err);
        }
      }

      // Calculate SLA breach
      const slaHours = calculateSlaHours(incident.severity);
      const openedAt = incident.createdAt;
      const deadline = new Date(openedAt.getTime() + slaHours * 60 * 60 * 1000);
      const now = new Date();

      if (now > deadline) {
        // SLA breached
        await emitEvent({
          eventType: 'MANUAL_OVERRIDE_ISSUED',
          aggregateId: incidentId,
          aggregateType: 'INCIDENT',
          actorId: 'SYSTEM',
          actorRole: 'SLA_ENFORCEMENT',
          payload: {
            is_manual_override: false,
            source: 'SLA_ENFORCEMENT',
            incident_id: incidentId,
            sla_breach_hours: Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60)),
            severity: incident.severity,
            original_deadline: deadline.toISOString(),
          },
        });
      }

      return {
        success: true,
        escalated: incident.status === 'OPEN' && !incident.assignedTo,
        sla_breached: now > deadline,
        status: incident.status,
      };
    },
    { connection: redis, concurrency: 5 }
  );
}

export { redis };
