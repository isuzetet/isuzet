/**
 * RUIT CBE - Engine 4: Escrow Service
 * Manages escrow holds, releases, and related transactions
 */

import { prisma as db } from '@ruit/shared-db';
import { incrementExposure, decrementExposure } from './exposure.service.js';

interface HoldEscrowParams {
  loadId: string;
  ordererId: string;
  fleetOwnerId: string;
  amountEtb: number;
  paymentModel: string;
  actorId: string;
}

interface ReleaseEscrowParams {
  loadId: string;
  tripId: string;
  actorId: string;
  actorRole: string;
}

/**
 * Emit an event (placeholder - should call event service)
 */
async function emitEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
  // In a real implementation, this would enqueue to BullMQ or call event service
  console.log(`Event emitted: ${eventType}`, payload);
}

/**
 * Hold escrow for a load
 * Idempotent - returns existing transaction if already exists
 */
export async function holdEscrow(params: HoldEscrowParams): Promise<{ transactionId: string }> {
  return await db.$transaction(async (tx: any) => {
    // Check idempotency - existing ESCROW_HOLD for this load
    const existing = await tx.financialTransaction.findFirst({
      where: {
        loadId: params.loadId,
        txType: 'ESCROW_HOLD'
      }
    });

    if (existing) {
      return { transactionId: existing.id };
    }

    // Generate ULID-like ID
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionId = `ftx${timestamp}${random}`;

    // Create financial transaction record
    await tx.financialTransaction.create({
      data: {
        id: transactionId,
        loadId: params.loadId,
        ordererId: params.ordererId,
        fleetOwnerId: params.fleetOwnerId,
        txType: 'ESCROW_HOLD',
        amountEtb: params.amountEtb,
        direction: 'IN',
        status: 'PENDING',
        paymentModel: params.paymentModel
      }
    });

    // Increment exposure for orderer, fleet_owner, and SYSTEM scopes
    await incrementExposure('CLIENT', params.ordererId, params.amountEtb);
    await incrementExposure('FLEET', params.fleetOwnerId, params.amountEtb);
    await incrementExposure('SYSTEM', null, params.amountEtb);

    // Emit ESCROW_HELD event
    await emitEvent('ESCROW_HELD', {
      loadId: params.loadId,
      transactionId,
      amountEtb: params.amountEtb,
      actorId: params.actorId
    });

    return { transactionId };
  });
}

/**
 * Release escrow for a completed trip
 * Checks for blocking incidents before release
 */
export async function releaseEscrow(params: ReleaseEscrowParams): Promise<void> {
  return await db.$transaction(async (tx: any) => {
    // Verify no open incidents blocking release
    const blockingIncidents = await tx.incident.findMany({
      where: {
        tripId: params.tripId,
        status: { notIn: ['RESOLVED', 'CLOSED', 'DISMISSED'] },
        severity: { not: 'LOW' }
      }
    });

    if (blockingIncidents.length > 0) {
      throw new Error('INCIDENT_BLOCKING_PAYOUT');
    }

    // Get the ESCROW_HOLD transaction for this load
    const escrowHold = await tx.financialTransaction.findFirst({
      where: {
        loadId: params.loadId,
        txType: 'ESCROW_HOLD'
      }
    });

    if (!escrowHold) {
      throw new Error('ESCROW_HOLD_NOT_FOUND');
    }

    // Generate ULID-like ID for release transaction
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const releaseTransactionId = `ftx${timestamp}${random}`;

    // Create ESCROW_RELEASE transaction
    await tx.financialTransaction.create({
      data: {
        id: releaseTransactionId,
        tripId: params.tripId,
        loadId: params.loadId,
        ordererId: escrowHold.ordererId,
        fleetOwnerId: escrowHold.fleetOwnerId,
        txType: 'ESCROW_RELEASE',
        amountEtb: Number(escrowHold.amountEtb),
        direction: 'OUT',
        status: 'PENDING',
        paymentModel: escrowHold.paymentModel
      }
    });

    // Update ESCROW_HOLD status to COMPLETED
    await tx.financialTransaction.update({
      where: { id: escrowHold.id },
      data: { status: 'COMPLETED' }
    });

    // Decrement exposure for orderer, fleet_owner, SYSTEM
    await decrementExposure('CLIENT', escrowHold.ordererId, Number(escrowHold.amountEtb));
    await decrementExposure('FLEET', escrowHold.fleetOwnerId, Number(escrowHold.amountEtb));
    await decrementExposure('SYSTEM', null, Number(escrowHold.amountEtb));

    // Emit PAYMENT_RELEASED event
    await emitEvent('PAYMENT_RELEASED', {
      tripId: params.tripId,
      loadId: params.loadId,
      releaseTransactionId,
      amountEtb: Number(escrowHold.amountEtb),
      actorId: params.actorId,
      actorRole: params.actorRole
    });
  });
}



