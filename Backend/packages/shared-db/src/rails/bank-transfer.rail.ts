import 'dotenv/config';
import {
  PaymentRail,
  InitiatePaymentParams,
  PaymentResult,
  PaymentRailId,
} from '@ruit/shared-types';
import { prisma, generateId } from '../index';

/**
 * Bank Transfer Payment Rail
 * Institutional/bank transfer with longer settlement: 48 hours
 * Creates ledger entries and tracks payment status
 */
export class BankTransferRail implements PaymentRail {
  id: PaymentRailId = 'bank_transfer';
  name = 'Bank Transfer (2-day settlement)';
  expectedSettlementHours = 48;

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    const entry = await prisma.escrowLedgerEntry.create({
      data: {
        id: generateId('els'),
        fromUserId: params.metadata?.from_user_id as string | undefined,
        toUserId: params.metadata?.to_user_id as string | undefined,
        amountCents: params.amountCents,
        type: 'BANK_TRANSFER_INITIATE',
        paymentRailId: this.id,
        providerReference: `bnk_${params.reference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Bank transfer (48h settlement) for ${params.description}`,
      },
    });

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
        failureReason: 'Payment not found',
      };
    }

    const statusMap: Record<string, PaymentResult['status']> = {
      PENDING: 'PENDING',
      COMPLETED: 'COMPLETED',
      PAYOUT_FAILED: 'FAILED',
    };

    return {
      success: entry.status === 'COMPLETED',
      status: statusMap[entry.status] || 'FAILED',
      providerReference: entry.id,
      failureReason: entry.failureReason || undefined,
    };
  }

  async initiateRefund(
    providerReference: string,
    amountCents: number
  ): Promise<PaymentResult> {
    const original = await prisma.escrowLedgerEntry.findUnique({
      where: { id: providerReference },
    });

    if (!original) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Original payment not found for refund',
      };
    }

    const refund = await prisma.escrowLedgerEntry.create({
      data: {
        id: generateId('els'),
        fromUserId: original.toUserId,
        toUserId: original.fromUserId,
        amountCents: amountCents,
        type: 'BANK_TRANSFER_REFUND',
        paymentRailId: this.id,
        providerReference: `bnk_refund_${providerReference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Bank refund (48h settlement) against payment ${providerReference}`,
      },
    });

    return {
      success: true,
      status: 'PENDING',
      providerReference: refund.id,
    };
  }
}
