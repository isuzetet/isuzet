import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { PaymentRailRegistry } from '@ruit/shared-types';

export interface CreateEscrowEntryParams {
  loadId?: string;
  tripId?: string;
  fromUserId?: string;
  toUserId?: string;
  amountCents: number;
  type: string;
  paymentRailId?: string;
  externalRef?: string;
  notes?: string;
}

/**
 * Centralized Escrow Ledger Service
 * Tracks all financial movements in the platform
 */
export async function createEscrowEntry(
  data: CreateEscrowEntryParams
): Promise<any> {
  if (data.amountCents <= 0) {
    throw new Error('Amount must be positive');
  }

  const entry = await prisma.escrowLedgerEntry.create({
    data: {
      id: generateId('els'),
      loadId: data.loadId,
      tripId: data.tripId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amountCents: data.amountCents,
      type: data.type,
      paymentRailId: data.paymentRailId,
      providerReference: data.externalRef,
      status: 'PENDING',
      notes: data.notes,
    },
  });

  return entry;
}

/**
 * Get escrow balance for a user
 * Sums all PENDING and FUNDED entries where user is recipient
 */
export async function getEscrowBalance(userId: string): Promise<number> {
  const result = await prisma.escrowLedgerEntry.aggregate({
    where: {
      toUserId: userId,
      status: {
        in: ['PENDING', 'COMPLETED'],
      },
    },
    _sum: {
      amountCents: true,
    },
  });

  return result._sum.amountCents || 0;
}

/**
 * Release escrow
 * Transitions entry from PENDING to COMPLETED
 * Executes in transaction
 */
export async function releaseEscrow(
  ledgerEntryId: string,
  releasedByUserId: string
): Promise<any> {
  const entry = await prisma.escrowLedgerEntry.findUnique({
    where: { id: ledgerEntryId },
  });

  if (!entry) {
    throw new Error('Escrow entry not found');
  }

  if (entry.status !== 'PENDING') {
    throw new Error(`Cannot release escrow with status: ${entry.status}`);
  }

  return await prisma.$transaction(async (tx) => {
    const released = await tx.escrowLedgerEntry.update({
      where: { id: ledgerEntryId },
      data: {
        status: 'COMPLETED',
        settledAt: new Date(),
      },
    });

    // Emit event (for logging/analytics)
    await tx.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'ESCROW_RELEASED',
        aggregateId: ledgerEntryId,
        aggregateType: 'ESCROW_LEDGER_ENTRY',
        actorId: releasedByUserId,
        actorRole: 'SYSTEM',
        strategyVersionId: 'default',
        payload: {
          ledgerEntryId,
          toUserId: entry.toUserId,
          amountCents: entry.amountCents,
          releasedAt: new Date().toISOString(),
        },
      },
    });

    return released;
  });
}

/**
 * Reconcile ledger entry against payment rail
 * Checks if ledger status matches rail status
 * Updates ledger if mismatch found
 */
export async function reconcileEntry(ledgerEntryId: string): Promise<any> {
  const entry = await prisma.escrowLedgerEntry.findUnique({
    where: { id: ledgerEntryId },
  });

  if (!entry) {
    throw new Error('Entry not found');
  }

  if (!entry.paymentRailId || !entry.providerReference) {
    // No rail to reconcile against
    return entry;
  }

  try {
    const rail = PaymentRailRegistry.get(entry.paymentRailId);
    const railStatus = await rail.checkStatus(entry.providerReference);

    // Check for mismatch
    const ledgerStatusCompleted = entry.status === 'COMPLETED';
    const railStatusCompleted = railStatus.status === 'COMPLETED';

    if (ledgerStatusCompleted !== railStatusCompleted) {
      // Mismatch detected - log and potentially correct
      const note = `RECONCILIATION: Ledger status=${entry.status}, Rail status=${railStatus.status}. ${
        railStatusCompleted ? 'Marking COMPLETED' : 'Marking PENDING'
      }`;

      const updated = await prisma.escrowLedgerEntry.update({
        where: { id: ledgerEntryId },
        data: {
          status: railStatusCompleted ? 'COMPLETED' : entry.status,
          notes:
            entry.notes && entry.notes.length > 0
              ? `${entry.notes}\n${note}`
              : note,
        },
      });

      return updated;
    }

    return entry;
  } catch (err) {
    throw new Error(`Reconciliation failed for entry ${ledgerEntryId}: ${err}`);
  }
}

/**
 * Get all ledger entries for a load
 */
export async function getLedgerForLoad(loadId: string): Promise<any> {
  return await prisma.escrowLedgerEntry.findMany({
    where: { loadId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get all failed payout entries
 * For OPS Finance review
 */
export async function getPayoutFailures(): Promise<any> {
  return await prisma.escrowLedgerEntry.findMany({
    where: { status: 'PAYOUT_FAILED' },
    orderBy: { createdAt: 'desc' },
  });
}
