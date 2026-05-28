import 'dotenv/config';
import {
  PaymentRail,
  InitiatePaymentParams,
  PaymentResult,
  PaymentRailId,
} from '@ruit/shared-types';
import { prisma, generateId } from '../index';

/**
 * Chapa Payment Rail (Ethiopian fintech)
 * Creates ledger entries and tracks payment status
 * In production, would integrate with Chapa API
 */
export class ChapaRail implements PaymentRail {
  id: PaymentRailId = 'chapa';
  name = 'Chapa Payment Gateway';

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    // Create EscrowLedgerEntry to track the payment
    const entry = await prisma.escrowLedgerEntry.create({
      data: {
        id: generateId('els'),
        fromUserId: params.metadata?.from_user_id as string | undefined,
        toUserId: params.metadata?.to_user_id as string | undefined,
        amountCents: params.amountCents,
        type: 'CHAPA_INITIATE',
        paymentRailId: this.id,
        providerReference: `chp_${params.reference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Chapa payment for ${params.description}`,
      },
    });

    // In production: call Chapa API
    // For now: stub implementation
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      // Development: auto-complete after short delay (stubbed)
      return {
        success: true,
        status: 'PENDING',
        providerReference: entry.id,
      };
    }

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
        type: 'CHAPA_REFUND',
        paymentRailId: this.id,
        providerReference: `chp_refund_${providerReference}_${Date.now()}`,
        status: 'PENDING',
        notes: `Refund via Chapa against payment ${providerReference}`,
      },
    });

    return {
      success: true,
      status: 'PENDING',
      providerReference: refund.id,
    };
  }
}
