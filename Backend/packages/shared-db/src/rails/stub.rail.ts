import 'dotenv/config';
import {
  PaymentRail,
  InitiatePaymentParams,
  PaymentResult,
  PaymentRailId,
} from '@ruit/shared-types';

/**
 * Stub Payment Rail for Development/Testing
 * Always returns COMPLETED status immediately
 * Used for development environments
 */
export class StubRail implements PaymentRail {
  id: PaymentRailId = 'stub';
  name = 'Stub Payment Rail (Development)';

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
    return {
      success: true,
      status: 'COMPLETED',
      providerReference: `stub_${params.reference}_${Date.now()}`,
    };
  }

  async checkStatus(providerReference: string): Promise<PaymentResult> {
    return {
      success: true,
      status: 'COMPLETED',
      providerReference,
    };
  }

  async initiateRefund(
    providerReference: string,
    amountCents: number
  ): Promise<PaymentResult> {
    return {
      success: true,
      status: 'COMPLETED',
      providerReference: `stub_refund_${providerReference}`,
    };
  }
}
