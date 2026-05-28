import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma as db, generateId, getConfig } from '@ruit/shared-db';
import { ROLES, VOUCHER_STATUS, LIQUIDITY_INCENTIVE_TYPE, 
  type VoucherStatus, type LiquidityIncentiveType } from '@ruit/shared-types';
import { holdEscrow, releaseEscrow } from '../services/escrow.service.js';
import { verifyCOD, initiateCod, confirmCod } from '../services/cod.service.js';
import {
  createVoucher,
  validateVoucher,
  redeemVoucher,
  listVouchers,
} from '../services/voucher.service';
import { createIncentive, getActiveIncentives } from '../services/incentive.service';
import {
  getDriverEarnings,
  markEarningsPaid,
  getFleetPayoutSummary,
} from '../services/earnings.service';
import {
  createEscrowEntry,
  getEscrowBalance,
  releaseEscrow as releaseEscrowEntry,
  getLedgerForLoad,
  getPayoutFailures,
} from '../services/escrow-ledger.service.js';
import {
  issueLoan,
  repayLoan,
  handleDefault as handleMicroCreditDefault,
} from '../services/micro-credit.service.js';
import {
  calculatePlatformCommission,
  calculateBrokerCommission,
  settleCommission,
  getCommissionBreakdown,
} from '../services/commission.service.js';
import { addJob, QUEUES } from '../../../../packages/shared-queue/dist/index.js';
import { AccessTokenPayload } from '@ruit/shared-auth';

// Internal secret check for system calls
function checkInternalSecret(request: FastifyRequest): boolean {
  const internalSecret = request.headers['x-internal-secret'] as string | undefined;
  const expectedSecret = process.env.INTERNAL_SECRET;
  // Skip auth if INTERNAL_SECRET not set (dev mode)
  if (!expectedSecret) {
    return true;
  }
  return internalSecret === expectedSecret;
}

export default async function liquidityRoutes(app: FastifyInstance) {
  // Escrow hold endpoint (internal/system only)
  app.post('/escrow/hold', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check internal auth
    if (!checkInternalSecret(request)) {
      return reply.status(403).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' } });
    }
    const schema = z.object({
      loadId: z.string(),
      ordererId: z.string(),
      fleetOwnerId: z.string(),
      amountEtb: z.number().positive(),
      paymentModel: z.enum(['ESCROW', 'ROLLING_CREDIT', 'PARTIAL_ADVANCE'])
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error } });
    }
    const { loadId, ordererId, fleetOwnerId, amountEtb, paymentModel } = result.data;
    try {
      const { transactionId } = await holdEscrow({ loadId, ordererId, fleetOwnerId, amountEtb, paymentModel, actorId: 'system' });
      return reply.send({ success: true, data: { transactionId } });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'ESCROW_HOLD_FAILED', message: error instanceof Error ? error.message : 'Failed to hold escrow' } });
    }
  });

  // Escrow release endpoint
  app.post('/escrow/release', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check internal auth or ops admin
    if (!checkInternalSecret(request)) {
      return reply.status(403).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const schema = z.object({
      loadId: z.string(),
      tripId: z.string()
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } });
    }
    const { loadId, tripId } = result.data;
    try {
      await releaseEscrow({ loadId, tripId, actorId: 'system', actorRole: 'SYSTEM_SERVICE' });
      return reply.send({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to release escrow';
      const statusCode = message === 'INCIDENT_BLOCKING_PAYOUT' ? 409 : 500;
      return reply.status(statusCode).send({ success: false, error: { code: message === 'INCIDENT_BLOCKING_PAYOUT' ? 'INCIDENT_BLOCKING' : 'ESCROW_RELEASE_FAILED', message } });
    }
  });

  // POST /api/v1/liquidity/escrow/fund-stop
  app.post('/escrow/fund-stop', {
    preHandler: (app as any).requireRole([ROLES.ORDERER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      stopId: z.string(),
      paymentMethod: z.enum(['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER']),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error } });
    }
    const { stopId, paymentMethod } = result.data;
    const ordererId = request.user?.entity_id; // Assumes requireRole sets user
    if (!ordererId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Orderer ID not found' } });
    }
    const loadStop = await db.loadStop.findUnique({ where: { id: stopId } });
    if (!loadStop || loadStop.ordererId !== ordererId) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Load stop not found or unauthorized' } });
    }
    if (loadStop.escrowFunded) {
      return reply.status(409).send({ success: false, error: { code: 'ESCROW_ALREADY_FUNDED', message: 'Escrow for this stop is already funded' } });
    }
    try {
      await db.$transaction(async (tx: any) => {
        await tx.loadStop.update({
          where: { id: stopId },
          data: { escrowFunded: true, updatedAt: new Date(), },
        });
        await tx.financialTransaction.create({
          data: {
            id: generateId('ftx'),
            loadId: loadStop.loadId,
            ordererId: ordererId,
            txType: 'ESCROW_FUNDING',
            amountEtb: loadStop.escrowAmountEtb,
            direction: 'IN',
            paymentModel: 'ESCROW',
            status: 'SETTLED',
            paymentMethod: paymentMethod,
            settledAt: new Date(),
          },
        });
        // Check if all stops for the load are funded
        const allStops = await tx.loadStop.findMany({ where: { loadId: loadStop.loadId } });
        const allFunded = allStops.every((stop: any) => stop.escrowFunded);
        if (allFunded) {
          await tx.load.update({
            where: { id: loadStop.loadId },
            data: { status: 'READY_TO_MATCH' },
          });
          // Trigger webhook for load.ready_to_match
          await addJob(QUEUES.WEBHOOK_DELIVERY, 'webhook-event', {
            ordererId: loadStop.ordererId,
            event: 'load.ready_to_match',
            payload: { loadId: loadStop.loadId }
          });
        }
        // Trigger webhook for load.stop_funded
        await addJob(QUEUES.WEBHOOK_DELIVERY, 'webhook-event', {
          ordererId: loadStop.ordererId,
          event: 'load.stop_funded',
          payload: { stopId: loadStop.id, loadId: loadStop.loadId, paymentMethod, amount: loadStop.escrowAmountEtb }
        });
      });
      return reply.send({ success: true, data: { stopId, status: 'FUNDED' } });
    } catch (error) {
      console.error('Error funding escrow for stop:', error);
      return reply.status(500).send({ success: false, error: { code: 'ESCROW_FUNDING_FAILED', message: error instanceof Error ? error.message : 'Failed to fund escrow for stop' } });
    }
  });

  // GET /api/v1/liquidity/exposure/:entityType/:entityId
  app.get('/exposure/:entityType/:entityId', async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({
      entityType: z.enum(['orderer', 'fleet_owner', 'corridor']),
      entityId: z.string()
    });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters' } });
    }
    const { entityType, entityId } = paramsResult.data;
    try {
      const scopeType = entityType === 'orderer' ? 'CLIENT' : entityType === 'fleet_owner' ? 'FLEET' : 'CORRIDOR';
      const caps = await db.exposureCap.findMany({
        where: { scopeType, scopeId: entityId, isActive: true }
      });
      return reply.send({
        success: true, data: caps.map((cap: any) => ({
          id: cap.id,
          scopeType: cap.scopeType,
          scopeId: cap.scopeId,
          capEtb: Number(cap.capEtb),
          currentExposureEtb: Number(cap.currentExposureEtb),
          pctUsed: (Number(cap.currentExposureEtb) / Number(cap.capEtb)) * 100
        }))
      });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message: error instanceof Error ? error.message : 'Failed to fetch exposure' } });
    }
  });

  // POST /api/v1/liquidity/fuel-advance/request
  app.post('/fuel-advance/request', {
    preHandler: (app as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      loadId: z.string(),
      requestedAmountEtb: z.number().int().positive(),
      reason: z.string().optional()
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error } });
    }
    const { loadId, requestedAmountEtb, reason } = result.data;
    const userId = request.user?.sub;
    const userRole = request.user?.role;
    if (!userId || !userRole) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }
    const load = await db.load.findUnique({ where: { id: loadId } });
    if (!load || load.status !== 'MATCHED' && load.status !== 'DEPARTED') {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_LOAD_STATUS', message: 'Load must be matched or departed to request fuel advance' } });
    }
    // In a real system, total escrow would be more complex to calculate
    const totalEscrow = load.fuelAdvanceAmount; // Simplified, assuming existing field for total escrow
    const maxAdvancePct = 0.30; // 30% of total escrow
    const maxAdvance = Math.floor(Number(totalEscrow) * maxAdvancePct);
    if (requestedAmountEtb > maxAdvance) {
      return reply.status(400).send({ success: false, error: { code: 'AMOUNT_TOO_HIGH', message: `Requested amount exceeds ${maxAdvancePct * 100}% of total escrow (${maxAdvance} ETB)` } });
    }
    // Create a pending financial transaction for the advance request
    const advanceId = generateId('ftx');
    await db.financialTransaction.create({
      data: {
        id: advanceId,
        loadId,
        ordererId: load.ordererId,
        fleetOwnerId: load.fleetPayoutEtb ? load.ordererId : null, // Simplified: needs to be actual fleet owner
        txType: 'FUEL_ADVANCE_REQUEST',
        amountEtb: requestedAmountEtb,
        direction: 'OUT',
        paymentModel: 'ESCROW',
        status: 'PENDING',
        codHandler: userRole,
      },
    });
    // Notify OPS for approval (enqueue a notification job)
    await addJob(QUEUES.NOTIFICATIONS, 'ops-fuel-advance-request', {
      type: 'FUEL_ADVANCE_REQUEST',
      entityId: advanceId,
      message: `Fuel advance request for Load ${loadId} by ${userRole}. Amount: ${requestedAmountEtb} ETB.`
    });
    return reply.send({ success: true, data: { advanceId, status: 'PENDING' } });
  });

  // POST /api/v1/liquidity/fuel-advance/approve/:advanceId
  app.post('/fuel-advance/approve/:advanceId', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.FINANCE_OPS]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ advanceId: z.string() });
    const result = paramsSchema.safeParse(request.params);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: result.error } });
    }
    const { advanceId } = result.data;
    const approverId = request.user?.sub;
    const advanceTx = await db.financialTransaction.findUnique({ where: { id: advanceId } });
    if (!advanceTx || advanceTx.txType !== 'FUEL_ADVANCE_REQUEST' || advanceTx.status !== 'PENDING') {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Pending fuel advance request not found' } });
    }
    if (!advanceTx.loadId) {
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Fuel advance request missing loadId' } });
    }
    await db.$transaction(async (tx: any) => {
      await tx.financialTransaction.update({
        where: { id: advanceId },
        data: { status: 'SETTLED', settledAt: new Date(), codCollectedByUserId: approverId, },
      });
      await tx.load.update({
        where: { id: advanceTx.loadId! },
        data: { fuelAdvanceApproved: true, fuelAdvanceAmount: Number(advanceTx.amountEtb), },
      });
      // Notify fleet owner/driver of approval
      await addJob(QUEUES.NOTIFICATIONS, 'fuel-advance-approved', {
        type: 'FUEL_ADVANCE_APPROVED',
        entityId: advanceTx.loadId,
        message: `Your fuel advance for Load ${advanceTx.loadId} (${advanceTx.amountEtb.toString()} ETB) has been approved.`
      });
    });
    return reply.send({ success: true, data: { advanceId, status: 'APPROVED' } });
  });

  // POST /api/v1/liquidity/fuel-advance/reject/:advanceId
  app.post('/fuel-advance/reject/:advanceId', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.FINANCE_OPS]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ advanceId: z.string() });
    const result = paramsSchema.safeParse(request.params);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: result.error } });
    }
    const { advanceId } = result.data;
    const rejecterId = request.user?.sub;
    const advanceTx = await db.financialTransaction.findUnique({ where: { id: advanceId } });
    if (!advanceTx || advanceTx.txType !== 'FUEL_ADVANCE_REQUEST' || advanceTx.status !== 'PENDING') {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Pending fuel advance request not found' } });
    }
    await db.$transaction(async (tx: any) => {
      await tx.financialTransaction.update({
        where: { id: advanceId },
        data: { status: 'REJECTED', settledAt: new Date(), codCollectedByUserId: rejecterId, },  // Using settledAt to mark rejection date
      });
      // Notify fleet owner/driver of rejection
      await addJob(QUEUES.NOTIFICATIONS, 'fuel-advance-rejected', {
        type: 'FUEL_ADVANCE_REJECTED',
        entityId: advanceTx.loadId,
        message: `Your fuel advance for Load ${advanceTx.loadId} (${advanceTx.amountEtb} ETB) has been rejected.`
      });
    });
    return reply.send({ success: true, data: { advanceId, status: 'REJECTED' } });
  });

  // POST /api/v1/liquidity/cancellation/compensate
  app.post('/cancellation/compensate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!checkInternalSecret(request)) {
      return reply.status(403).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' } });
    }
    const schema = z.object({
      cancellationRecordId: z.string(),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error } });
    }
    const { cancellationRecordId } = result.data;
    const cancellationRecord = await db.cancellationRecord.findUnique({ where: { id: cancellationRecordId } });
    if (!cancellationRecord) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Cancellation record not found' } });
    }
    if (cancellationRecord.compensationPaid) {
      return reply.status(409).send({ success: false, error: { code: 'COMPENSATION_ALREADY_PAID', message: 'Compensation for this record already paid' } });
    }
    // Assume orderer is the cancelling party and fleet owner is compensated, or vice-versa.
    // This needs more robust logic based on who cancelled and roles.
    const load = await db.load.findUnique({ where: { id: cancellationRecord.loadId } });
    if (!load) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Load not found' } });
    }
    // For simplicity, let's assume the orderer is the source of funds for compensation.
    // In a real system, this would be determined by the cancellation logic in the incident engine.
    const compensatingPartyId = load.ordererId;
    const compensatedPartyId = load.fleetPayoutEtb ? 'some_fleet_owner_id' : 'some_driver_id'; // Placeholder
    const compensationAmount = cancellationRecord.compensationOwedEtb;
    await db.$transaction(async (tx: any) => {
      // Mark cancellation record as paid
      await tx.cancellationRecord.update({ where: { id: cancellationRecordId }, data: { compensationPaid: true } });
      // Create financial transaction for compensation IN
      await tx.financialTransaction.create({
        data: {
          id: generateId('ftx'),
          loadId: cancellationRecord.loadId,
          ordererId: compensatingPartyId,
          txType: 'CANCELLATION_COMPENSATION',
          amountEtb: -compensationAmount, // Negative amount to reflect deduction from cancelling party
          direction: 'OUT',
          paymentModel: 'ESCROW',
          status: 'SETTLED',
          settledAt: new Date(),
        },
      });
      // Create financial transaction for compensation OUT
      // This assumes the compensated party is a fleet owner. Adjust if it's a driver.
      const txData: any = {
        id: generateId('ftx'),
        loadId: cancellationRecord.loadId,
        txType: 'CANCELLATION_COMPENSATION_PAYOUT',
        amountEtb: compensationAmount,
        direction: 'IN',
        paymentModel: 'ESCROW',
        status: 'SETTLED',
        settledAt: new Date(),
      };
      if (compensatedPartyId.startsWith('flt_')) {
        txData.fleetOwnerId = compensatedPartyId;
      } else if (compensatedPartyId.startsWith('ord_')) {
        txData.ordererId = compensatedPartyId;
      }
      await tx.financialTransaction.create({ data: txData });
      // Notify compensated party
      await addJob(QUEUES.NOTIFICATIONS, 'cancellation-compensation', {
        type: 'CANCELLATION_COMPENSATION',
        entityId: compensatedPartyId,
        message: `You have received ${compensationAmount} ETB compensation for load ${cancellationRecord.loadId} cancellation.`
      });
    });
    return reply.send({ success: true, data: { cancellationRecordId, compensationPaid: true } });
  });

  // COD reconciliation endpoint
  app.get('/cod-reconciliation', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      status: z.enum(['unverified', 'verified', 'all']).default('unverified')
    });
    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
    }
    const { from, to, status } = queryResult.data;
    try {
      const where: Record<string, unknown> = { txType: 'COD_LOG' };
      if (status === 'unverified') {
        where.codVerified = null;
        where.status = 'PENDING';
      } else if (status === 'verified') {
        where.codVerified = true;
      }
      if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
      }
      const codTransactions = await db.financialTransaction.findMany({ where });
      // Calculate totals
      const unverifiedTotalEtb = codTransactions
        .filter((t: any) => t.codVerified === null)
        .reduce((sum: number, t: any) => sum + Number(t.amountEtb), 0);
      const byHandler: Record<string, number> = {};
      codTransactions.forEach((t: any) => {
        const handler = t.codHandler || 'UNKNOWN';
        byHandler[handler] = (byHandler[handler] || 0) + 1;
      });
      // Overdue 48h
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const overdueTransactions = codTransactions.filter((t: any) =>
        t.codVerified === null && t.createdAt < fortyEightHoursAgo
      );
      return reply.send({
        success: true, data: {
          unverifiedTotalEtb,
          unverifiedCount: codTransactions.filter((t: any) => t.codVerified === null).length,
          byHandler,
          overdue48h: overdueTransactions.length
        }
      });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message: error instanceof Error ? error.message : 'Failed to fetch COD reconciliation' } });
    }
  });

  // COD verify endpoint
  app.post('/cod/:txId/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ txId: z.string() });
    const bodySchema = z.object({
      verified: z.boolean(),
      collectedEtb: z.number().nonnegative(),
      notes: z.string().optional()
    });
    const paramsResult = paramsSchema.safeParse(request.params);
    const bodyResult = bodySchema.safeParse(request.body);
    if (!paramsResult.success || !bodyResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } });
    }
    const { txId } = paramsResult.data;
    const { verified, collectedEtb, notes } = bodyResult.data;
    try {
      await verifyCOD({ transactionId: txId, verified, collectedEtb, actorId: 'system', notes });
      return reply.send({ success: true });
    } catch (error) {
      console.error('Error confirming delivery stop:', error);
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm delivery stop' } });
    }
  });

  // POST /api/v1/liquidity/delivery/confirm-stop
  app.post('/delivery/confirm-stop', {
    preHandler: (app as any).requireAuth,
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      stopId: z.string(),
      confirmationType: z.enum(['DRIVER', 'ORDERER']),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error } });
    }
    const { stopId, confirmationType } = result.data;
    const userId = request.user?.sub;
    const role = request.user?.role;
    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }
    const stop = await db.loadStop.findUnique({
      where: { id: stopId },
      include: { load: true }
    });
    if (!stop) {
      return reply.status(404).send({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Stop not found' } });
    }
    if (stop.stopType !== 'DELIVERY') {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Only delivery stops can be confirmed' } });
    }
    try {
      if (confirmationType === 'DRIVER') {
        // Verify requesting user is the driver assigned to this load's trip
        const assignment = await db.assignment.findFirst({
          where: { loadId: stop.loadId },
          orderBy: { createdAt: 'desc' }
        });
        if (!assignment || assignment.driverId !== userId) {
          return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to confirm this stop' } });
        }
        // Store driver confirmation in notes field
        await db.loadStop.update({
          where: { id: stopId },
          data: {
            notes: `Driver confirmed: ${new Date().toISOString()}`,
            updatedAt: new Date(),
          },
        });
        return reply.send({ success: true, data: { stopId, status: 'DRIVER_CONFIRMED' } });
      }
      if (confirmationType === 'ORDERER') {
        // Verify requesting user is the orderer for this stop
        if (stop.ordererId !== userId && role !== ROLES.OPS_ADMIN) {
          return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to confirm this stop' } });
        }
        await db.$transaction(async (tx: any) => {
          // Confirm stop
          await tx.loadStop.update({
            where: { id: stopId },
            data: {
              confirmedAt: new Date(),
              confirmedBy: userId,
              updatedAt: new Date(),
            },
          });
          // Trigger proportional escrow release for this stop
          await addJob('escrow-release', 'partial-stop-release', {
            loadId: stop.loadId,
            stopId: stop.id,
            releaseType: 'PARTIAL_STOP',
            amountEtb: stop.escrowAmountEtb
          });
        });
        // Check if ALL delivery stops are now confirmed
        const allDeliveryStops = await db.loadStop.findMany({
          where: { loadId: stop.loadId, stopType: 'DELIVERY' }
        });
        const allConfirmed = allDeliveryStops.every((s: any) => s.confirmedAt !== null);
        if (allConfirmed) {
          // Trigger POD generation
          await addJob('pod-generator', 'generate-pod', { loadId: stop.loadId });
          // Update load status to COMPLETED
          await db.load.update({ where: { id: stop.loadId }, data: { status: 'COMPLETED' } });
          // Update driver availability back to AVAILABLE
          const assignment = await db.assignment.findFirst({
            where: { loadId: stop.loadId },
            orderBy: { createdAt: 'desc' }
          });
          if (assignment) {
            await db.driver.update({
              where: { id: assignment.driverId },
              data: { availabilityStatus: 'AVAILABLE' }
            });
          }
          // Fire webhook for load.completed
          await addJob(QUEUES.WEBHOOK_DELIVERY, 'webhook-event', {
            ordererId: stop.ordererId,
            event: 'load.completed',
            payload: { loadId: stop.loadId, status: 'COMPLETED', timestamp: new Date().toISOString() }
          });
        }
        return reply.send({ success: true, data: { stopId, status: 'CONFIRMED', allDeliveryStopsConfirmed: allConfirmed } });
      }
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid confirmation type' } });
    } catch (error) {
      console.error('Error confirming delivery stop:', error);
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm delivery stop' } });
    }
  });

  // ========================================
  // VOUCHER ROUTES (CHANGES 1-4)
  // ========================================

  // CHANGE 1: POST /api/v1/liquidity/vouchers
  app.post('/vouchers', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.FLEET_OWNER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      recipientUserId: z.string(),
      voucherType: z.string(),
      amountEtb: z.number().int().positive(),
      expiresAt: z.string().datetime(),
      corridorId: z.string().optional(),
      notes: z.string().optional(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error },
      });
    }

    const userId = request.user?.sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    try {
      const voucher = await createVoucher({
        ...result.data,
        expiresAt: new Date(result.data.expiresAt),
        issuedByUserId: userId,
      });
      return reply.send({ success: true, data: voucher });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create voucher';
      return reply.status(400).send({ success: false, error: { code: 'CREATE_FAILED', message } });
    }
  });

  // CHANGE 2: GET /api/v1/liquidity/vouchers/:code/validate
  app.get('/vouchers/:code/validate', {
    preHandler: (app as any).requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ code: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid code parameter' },
      });
    }

    try {
      const result = await validateVoucher(paramsResult.data.code);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to validate voucher';
      return reply.status(500).send({ success: false, error: { code: 'VALIDATION_FAILED', message } });
    }
  });

  // CHANGE 3: POST /api/v1/liquidity/vouchers/:code/redeem
  app.post('/vouchers/:code/redeem', {
    preHandler: (app as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER, ROLES.ORDERER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ code: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid code parameter' },
      });
    }

    const userId = request.user?.sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    try {
      const voucher = await redeemVoucher(paramsResult.data.code, userId);
      return reply.send({ success: true, data: voucher });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to redeem voucher';
      const statusCode = message.includes('not found') ? 404 : 403;
      return reply.status(statusCode).send({ success: false, error: { code: 'REDEEM_FAILED', message } });
    }
  });

  // CHANGE 4: GET /api/v1/liquidity/vouchers
  app.get('/vouchers', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN, ROLES.FINANCE_OPS]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      status: z.nativeEnum(VOUCHER_STATUS).optional(),
      recipientUserId: z.string().optional(),
      corridorId: z.string().optional(),
    });

    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: queryResult.error },
      });
    }

    try {
      // build typed filters object to satisfy service signature
      const filters: {
        status?: any; // will match VoucherStatus from shared-db
        recipientUserId?: string;
        corridorId?: string;
      } = {};
      if (queryResult.data.status) filters.status = queryResult.data.status;
      if (typeof queryResult.data.recipientUserId === 'string') {
        filters.recipientUserId = queryResult.data.recipientUserId;
      }
      if (typeof queryResult.data.corridorId === 'string') {
        filters.corridorId = queryResult.data.corridorId;
      }

      const vouchers = await listVouchers(filters);
      return reply.send({ success: true, data: vouchers });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list vouchers';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // ========================================
  // INCENTIVE ROUTES (CHANGES 5-6)
  // ========================================

  // CHANGE 5: POST /api/v1/liquidity/incentives
  app.post('/incentives', {
    preHandler: (app as any).requireRole([ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      targetType: z.enum(['DRIVER', 'FLEET_OWNER', 'CORRIDOR']),
      targetId: z.string(),
      incentiveType: z.nativeEnum(LIQUIDITY_INCENTIVE_TYPE),
      amountEtb: z.number().int().positive(),
      validFrom: z.string().datetime(),
      validUntil: z.string().datetime(),
      corridorId: z.string().optional(),
      description: z.string().optional(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error },
      });
    }

    try {
      // directly use any to satisfy types after validation
      const data: any = result.data;
      const incentive = await createIncentive({
        targetType: data.targetType,
        targetId: data.targetId,
        incentiveType: data.incentiveType,
        amountEtb: data.amountEtb,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        corridorId: data.corridorId,
        description: data.description,
      });
      return reply.send({ success: true, data: incentive });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create incentive';
      return reply.status(400).send({ success: false, error: { code: 'CREATE_FAILED', message } });
    }
  });

  // CHANGE 6: GET /api/v1/liquidity/incentives/active
  app.get('/incentives/active', {
    preHandler: (app as any).requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      corridorId: z.string().optional(),
      targetType: z.enum(['DRIVER', 'FLEET_OWNER', 'CORRIDOR']).optional(),
    });

    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: queryResult.error },
      });
    }

    try {
      const incentives = await getActiveIncentives(queryResult.data);
      return reply.send({ success: true, data: incentives });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch incentives';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // ========================================
  // EARNINGS & PAYOUT ROUTES (CHANGES 7-9)
  // ========================================

  // CHANGE 7: GET /api/v1/liquidity/drivers/:id/earnings
  app.get('/drivers/:id/earnings', {
    preHandler: (app as any).requireRole([ROLES.DRIVER, ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid driver ID' },
      });
    }

    const driverId = paramsResult.data.id;
    const userId = request.user?.sub;
    const userRole = request.user?.role;

    // DRIVER role check: can only view own earnings
    if (userRole === ROLES.DRIVER && userId !== driverId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only view own earnings' },
      });
    }

    const querySchema = z.object({
      status: z.enum(['PENDING', 'PAID']).optional(),
      earningType: z.enum(['TRIP_FEE', 'CHECKPOINT_BONUS', 'CANCELLATION_COMPENSATION', 'INCENTIVE']).optional(),
      limit: z.string().optional().transform((s) => parseInt(s as string, 10) || 50),
    });

    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: queryResult.error },
      });
    }

    try {
      const filters: { status?: any; earningType?: any; limit?: number } = {};
      if (queryResult.data.status) filters.status = queryResult.data.status;
      if (queryResult.data.earningType) filters.earningType = queryResult.data.earningType;
      filters.limit = queryResult.data.limit;
      const result = await getDriverEarnings(driverId, filters);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch earnings';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // CHANGE 8: POST /api/v1/liquidity/drivers/:id/earnings/mark-paid
  app.post('/drivers/:id/earnings/mark-paid', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FLEET_MANAGER, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid driver ID' },
      });
    }

    const bodySchema = z.object({
      earningIds: z.array(z.string()).min(1),
    });

    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: bodyResult.error },
      });
    }

    const driverId = paramsResult.data.id;

    try {
      const result = await markEarningsPaid(driverId, bodyResult.data.earningIds);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark earnings as paid';
      const statusCode = message.includes('not found') ? 404 : 400;
      return reply.status(statusCode).send({ success: false, error: { code: 'UPDATE_FAILED', message } });
    }
  });

  // CHANGE 9: GET /api/v1/liquidity/fleet/:fleetOwnerId/payout-summary
  app.get('/fleet/:fleetOwnerId/payout-summary', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.FINANCE_OPS, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ fleetOwnerId: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid fleet owner ID' },
      });
    }

    const fleetOwnerId = paramsResult.data.fleetOwnerId;
    const userId = request.user?.sub;
    const userRole = request.user?.role;

    // FLEET_OWNER check: can only view own summary
    if (userRole === ROLES.FLEET_OWNER && userId !== fleetOwnerId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Can only view own payout summary' },
      });
    }

    try {
      const result = await getFleetPayoutSummary(fleetOwnerId);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch payout summary';
      const statusCode = message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // ========================================
  // PHASE 11: FINANCIAL SYSTEM EXPANSION
  // ========================================

  // POST /api/v1/liquidity/escrow/entries
  app.post('/escrow/entries', {
    preHandler: (app as any).requireRole([ROLES.FINANCE_OPS, ROLES.OPS_ADMIN, ROLES.SYSTEM_SERVICE]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      loadId: z.string().optional(),
      tripId: z.string().optional(),
      fromUserId: z.string().optional(),
      toUserId: z.string().optional(),
      amountCents: z.number().int().positive(),
      type: z.string(),
      paymentRailId: z.string().optional(),
      notes: z.string().optional(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    try {
      const entry = await createEscrowEntry(result.data);
      return reply.send({ success: true, data: entry });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create escrow entry';
      return reply.status(400).send({ success: false, error: { code: 'CREATE_FAILED', message } });
    }
  });

  // GET /api/v1/liquidity/escrow/balance/:userId
  app.get('/escrow/balance/:userId', {
    preHandler: (app as any).requireAuth,
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const paramsSchema = z.object({ userId: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' },
      });
    }

    try {
      const balance = await getEscrowBalance(paramsResult.data.userId);
      return reply.send({ success: true, data: { userId: paramsResult.data.userId, balanceCents: balance } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch balance';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // GET /api/v1/liquidity/loads/:loadId/ledger
  app.get('/loads/:loadId/ledger', {
    preHandler: (app as any).requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ loadId: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid load ID' },
      });
    }

    try {
      const entries = await getLedgerForLoad(paramsResult.data.loadId);
      return reply.send({ success: true, data: entries });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch ledger entries';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });

  // POST /api/v1/liquidity/micro-credit/loans
  app.post('/micro-credit/loans', {
    preHandler: (app as any).requireRole([ROLES.FIELD_AGENT, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      borrowerUserId: z.string(),
      agentGuarantorId: z.string().optional(),
      amountCents: z.number().int().positive(),
      zoneId: z.string(),
      purpose: z.string(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    try {
      const loan = await issueLoan(result.data);
      return reply.send({ success: true, data: loan });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to issue loan';
      return reply.status(400).send({ success: false, error: { code: 'LOAN_ISSUE_FAILED', message } });
    }
  });

  // POST /api/v1/liquidity/micro-credit/loans/:id/repay
  app.post('/micro-credit/loans/:id/repay', {
    preHandler: (app as any).requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string() });
    const paramsResult = paramsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid loan ID' },
      });
    }

    const bodySchema = z.object({
      amountCents: z.number().int().positive(),
    });

    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    try {
      const updated = await repayLoan({
        loanId: paramsResult.data.id,
        amountCents: bodyResult.data.amountCents,
      });
      return reply.send({ success: true, data: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to repay loan';
      return reply.status(400).send({ success: false, error: { code: 'REPAY_FAILED', message } });
    }
  });

  // POST /api/v1/liquidity/cod/initiate
  app.post('/cod/initiate', {
    preHandler: (app as any).requireRole([ROLES.DRIVER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      loadId: z.string(),
      amountCents: z.number().int().positive(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    const ordererId = request.user?.entity_id || 'unknown';

    try {
      const codResult = await initiateCod({
        loadId: result.data.loadId,
        amountCents: result.data.amountCents,
        ordererId,
      });

      if (!codResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'COD_INITIATE_FAILED', message: codResult.error },
        });
      }

      return reply.send({ success: true, data: codResult });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initiate COD';
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message } });
    }
  });

  // POST /api/v1/liquidity/cod/confirm
  app.post('/cod/confirm', {
    preHandler: (app as any).requireRole([ROLES.DRIVER]),
  }, async (request: FastifyRequest & { user?: AccessTokenPayload }, reply: FastifyReply) => {
    const schema = z.object({
      loadId: z.string(),
      otp: z.string(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    const driverId = request.user?.entity_id || 'unknown';

    try {
      const confirmResult = await confirmCod({
        loadId: result.data.loadId,
        otp: result.data.otp,
        driverId,
      });

      return reply.send(confirmResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm COD';
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message } });
    }
  });

  // GET /api/v1/liquidity/commission/calculate
  app.get('/commission/calculate', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      loadValueCents: z.number().int().positive(),
      includeBroker: z.boolean().default(false),
    });

    const queryResult = querySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
      });
    }

    try {
      const breakdown = await getCommissionBreakdown(queryResult.data);
      return reply.send({ success: true, data: breakdown });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate commission';
      return reply.status(500).send({ success: false, error: { code: 'CALCULATION_FAILED', message } });
    }
  });

  // GET /api/v1/liquidity/payout-failures (OPS Finance queue)
  app.get('/payout-failures', {
    preHandler: (app as any).requireRole([ROLES.FINANCE_OPS, ROLES.OPS_ADMIN]),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const failures = await getPayoutFailures();
      return reply.send({ success: true, data: failures });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch payout failures';
      return reply.status(500).send({ success: false, error: { code: 'FETCH_FAILED', message } });
    }
  });
}




