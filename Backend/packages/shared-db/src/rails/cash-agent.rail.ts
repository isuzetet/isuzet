import 'dotenv/config';
import {
  PaymentRail,
  InitiatePaymentParams,
  PaymentResult,
  PaymentRailId,
  CASH_AGENT_RAIL_ID,
  CashAgentPaymentMetadata,
} from '@ruit/shared-types';
import { prisma, generateId } from '../index';
import { getConfig } from '../config';

/**
 * Cash Agent Payment Rail
 * Settles payments via community agents who collect cash
 * Creates ledger entries with a settlement deadline
 */
export class CashAgentRail implements PaymentRail {
  id: PaymentRailId = CASH_AGENT_RAIL_ID;
  name = 'Cash Agent Settlement';

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    const config = await getConfig();
    const metadata = params.metadata as any as CashAgentPaymentMetadata;

    // Create EscrowLedgerEntry with PENDING status
    const entry = await prisma.escrowLedgerEntry.create({
      data: {
        id: generateId('els'),
        fromUserId: metadata.farmerUserId,
        toUserId: metadata.agentUserId,
        amountCents: params.amountCents,
        type: 'CASH_AGENT_COLLECTION',
        paymentRailId: this.id,
        providerReference: `ca_${params.reference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Cash collection by agent. Settlement window: ${config.agentCashSettlementWindowMin} minutes`,
      },
    });

    // Enqueue AGENT_CASH_SETTLEMENT job
    // (In production, this would be done by the job scheduler)
    // For now, we just record it in the ledger entry

    return {
      success: true,
      status: 'PENDING',
      providerReference: entry.id,
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentResult> {
    const entry = await prisma.escrowLedgerEntry.findUnique({
      where: { id: providerReference },
    });

    if (!entry) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Ledger entry not found',
      };
    }

    const statusMap: Record<string, PaymentResult['status']> = {
      PENDING: 'PENDING',
      COMPLETED: 'COMPLETED',
      PAYOUT_FAILED: 'FAILED',
    };

    return {
      success: entry.status === 'COMPLETED' || entry.status === 'PENDING',
      status: statusMap[entry.status] || 'FAILED',
      providerReference: entry.id,
      failureReason:
        entry.status === 'PAYOUT_FAILED' ? entry.failureReason || undefined : undefined,
    };
  }

  async initiateRefund(
    providerReference: string,
    amountCents: number
  ): Promise<PaymentResult> {
    const originalEntry = await prisma.escrowLedgerEntry.findUnique({
      where: { id: providerReference },
    });

    if (!originalEntry) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Original entry not found for refund',
      };
    }

    // Create refund entry (reverse direction)
    const refundEntry = await prisma.escrowLedgerEntry.create({
      data: {
        id: generateId('els'),
        fromUserId: originalEntry.toUserId,
        toUserId: originalEntry.fromUserId,
        amountCents: amountCents,
        type: 'CASH_AGENT_REFUND',
        paymentRailId: this.id,
        providerReference: `ca_refund_${providerReference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Refund via cash agent against entry ${providerReference}`,
      },
    });

    return {
      success: true,
      status: 'PENDING',
      providerReference: refundEntry.id,
    };
  }
}
