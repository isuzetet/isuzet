import 'dotenv/config';
import { PaymentRail, InitiatePaymentParams, PaymentResult, PaymentRailId } from '@ruit/shared-types';
/**
 * Stub Payment Rail for Development/Testing
 * Always returns COMPLETED status immediately
 * Used for development environments
 */
export declare class StubRail implements PaymentRail {
    id: PaymentRailId;
    name: string;
    initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
    checkStatus(providerReference: string): Promise<PaymentResult>;
    initiateRefund(providerReference: string, amountCents: number): Promise<PaymentResult>;
}
//# sourceMappingURL=stub.rail.d.ts.map