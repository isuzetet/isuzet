import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';
import { getQueue } from '@ruit/shared-queue';

interface EscrowReleaseJob {
  assignmentId: string;
  releaseType: 'TRIP_COMPLETED' | 'INCIDENT_RESOLVED' | 'MANUAL_OVERRIDE';
  resolvedBy?: string;
  penaltyEtb?: number;
  compensationEtb?: number;
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
      metadata: { source: 'ESCROW_WORKER', timestamp: new Date().toISOString() } as any,
    },
  });
}

export function createEscrowWorker(): Worker {
  return new Worker<EscrowReleaseJob>(
    QUEUES.ESCROW_RELEASE,
    async (job: Job<EscrowReleaseJob>) => {
      const { assignmentId, releaseType, resolvedBy, penaltyEtb = 0, compensationEtb = 0 } = job.data;

      return await prisma.$transaction(async (tx: any) => {
        // Get assignment
        const assignment = await tx.assignment.findUnique({
          where: { id: assignmentId },
        });

        if (!assignment) {
          throw new Error(`Assignment not found: ${assignmentId}`);
        }

        // Get load
        const load = await tx.load.findUnique({
          where: { id: assignment.loadId },
        });

        if (!load) {
          throw new Error(`Load not found: ${assignment.loadId}`);
        }

        // Get trip for orderer info
        const trip = await tx.trip.findFirst({
          where: { loadId: load.id },
        });

        // Verify escrow state - load must be in COMPLETED or DISPUTED state
        if (!['COMPLETED', 'DISPUTED', 'VERIFIED'].includes(load.status)) {
          throw new Error(`Load is not in a releasable state: ${load.status}`);
        }

        // Use ruitCommissionEtb as escrow amount if available
        const escrowAmount = load.ruitCommissionEtb ? Number(load.ruitCommissionEtb) : 0;

        // Get commission config for this corridor
        const commissionConfig = await tx.commissionConfig.findFirst({
          where: { corridorId: load.corridorId, isActive: true },
        });

        // Calculate platform commission - use flatRatePct if available
        let platformCommission = 0;
        if (commissionConfig?.flatRatePct) {
          platformCommission = escrowAmount * Number(commissionConfig.flatRatePct) / 100;
        } else if (commissionConfig?.fixedAmountEtb) {
          platformCommission = Number(commissionConfig.fixedAmountEtb);
        } else {
          platformCommission = escrowAmount * 0.05; // Default 5%
        }
        platformCommission = Math.min(platformCommission, escrowAmount * 0.10); // Cap at 10%

        // Calculate final amounts
        const driverPayout = escrowAmount - penaltyEtb + compensationEtb;
        const ordererRefund = escrowAmount - driverPayout - platformCommission;

        // Create financial transaction records
        const transactions = [];

        // Driver payout
        if (driverPayout > 0) {
          const driverTx = await tx.financialTransaction.create({
            data: {
              id: generateId('trns'),
              loadId: load.id,
              fleetOwnerId: assignment.fleetOwnerId,
              ordererId: trip?.ordererId || load.ordererId,
              txType: 'DRIVER_PAYOUT',
              amountEtb: driverPayout,
              direction: 'OUT',
              paymentModel: load.paymentModel,
              status: 'COMPLETED',
            },
          });
          transactions.push(driverTx);
        }

        // Platform commission
        if (platformCommission > 0) {
          const platformTx = await tx.financialTransaction.create({
            data: {
              id: generateId('trns'),
              loadId: load.id,
              ordererId: trip?.ordererId || load.ordererId,
              txType: 'PLATFORM_COMMISSION',
              amountEtb: platformCommission,
              direction: 'IN',
              paymentModel: load.paymentModel,
              status: 'COMPLETED',
            },
          });
          transactions.push(platformTx);
        }

        // Orderer refund (if any)
        if (ordererRefund > 0) {
          const refundTx = await tx.financialTransaction.create({
            data: {
              id: generateId('trns'),
              loadId: load.id,
              ordererId: trip?.ordererId || load.ordererId,
              txType: 'ORDERER_REFUND',
              amountEtb: ordererRefund,
              direction: 'OUT',
              paymentModel: load.paymentModel,
              status: 'COMPLETED',
            },
          });
          transactions.push(refundTx);
        }

        // Update load status to SETTLED
        await tx.load.update({
          where: { id: load.id },
          data: {
            status: 'SETTLED',
          },
        });

        // Update assignment with completion
        await tx.assignment.update({
          where: { id: assignmentId },
          data: {
            status: 'COMPLETED',
          },
        });

        // Decrement fleet owner exposure if exists
        if (assignment.fleetOwnerId) {
          const exposureCap = await tx.exposureCap.findFirst({
            where: { scopeId: assignment.fleetOwnerId },
          });

          if (exposureCap) {
            // Calculate value reduction
            const currentExposure = Number(exposureCap.currentExposureEtb);
            const valueReduction = Number(load.systemQuoteEtb || 0);
            const newExposure = Math.max(0, currentExposure - valueReduction);
            await tx.exposureCap.update({
              where: { id: exposureCap.id },
              data: { currentExposureEtb: newExposure },
            });
          }
        }

        // Emit ESCROW_RELEASED event
        await emitEvent({
          eventType: 'ESCROW_RELEASED',
          aggregateId: assignmentId,
          aggregateType: 'ASSIGNMENT',
          actorId: resolvedBy || 'SYSTEM',
          actorRole: resolvedBy ? 'OPS_ADMIN' : 'SYSTEM',
          payload: {
            assignment_id: assignmentId,
            load_id: load.id,
            release_type: releaseType,
            escrow_amount: escrowAmount,
            penalty_etb: penaltyEtb,
            compensation_etb: compensationEtb,
            driver_payout: driverPayout,
            platform_commission: platformCommission,
            orderer_refund: ordererRefund,
            transaction_ids: transactions.map((t) => t.id),
          },
        });

        // Enqueue TRUST_SCORE_UPDATE jobs for driver and fleet owner
        try {
          const trustQueue = getQueue(QUEUES.TRUST_SCORE_UPDATE);
          await trustQueue.add('trust-update-driver', {
            entityId: assignment.driverId,
            entityType: 'DRIVER',
            triggerEvent: 'ESCROW_RELEASED',
            eventPayload: { assignmentId, loadId: load.id },
          });

          if (assignment.fleetOwnerId) {
            await trustQueue.add('trust-update-fleet-owner', {
              entityId: assignment.fleetOwnerId,
              entityType: 'FLEET_OWNER',
              triggerEvent: 'ESCROW_RELEASED',
              eventPayload: { assignmentId, loadId: load.id },
            });
          }
        } catch (err) {
          // Log but don't fail - trust updates can be queued later
          // Using global console
        }

        return {
          success: true,
          assignmentId,
          transactions: transactions.map((t) => t.id),
          driverPayout,
          platformCommission,
          ordererRefund,
        };
      });
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };

