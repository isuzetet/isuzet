import 'dotenv/config';
import {
  PaymentRail,
  InitiatePaymentParams,
  PaymentResult,
  PaymentRailId,
} from '@ruit/shared-types';
import { prisma, generateId } from '../index';

/**
 * Telebirr Payment Rail (Ethiopian fintech)
 * T0 payout: same-day settlement (expectedSettlementHours: 0)
 * Creates ledger entries and tracks payment status
 */
export class TelebirrRail implements PaymentRail {
  id: PaymentRailId = 'telebirr';
  name = 'Telebirr Payment Gateway';
  expectedSettlementHours = 0; // T0 same-day settlement

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    const entry = await prisma.escrowLedgerEntry.create({
      data: {
        id: generateId('els'),
        fromUserId: params.metadata?.from_user_id as string | undefined,
        toUserId: params.metadata?.to_user_id as string | undefined,
        amountCents: params.amountCents,
        type: 'TELEBIRR_INITIATE',
        paymentRailId: this.id,
        providerReference: `tbr_${params.reference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Telebirr payment (T0 settlement) for ${params.description}`,
      },
    });

    // In production: integrate with Telebirr API for same-day settlement
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
        type: 'TELEBIRR_REFUND',
        paymentRailId: this.id,
        providerReference: `tbr_refund_${providerReference}_${Date.now()}`,
        status: 'PENDING',
        notes: `T0 Refund via Telebirr against payment ${providerReference}`,
      },
    });

    return {
      success: true,
      status: 'PENDING',
      providerReference: refund.id,
    };
  }
}
