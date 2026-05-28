import 'dotenv/config';
import { PaymentRail, InitiatePaymentParams, PaymentResult, PaymentRailId } from '@ruit/shared-types';
/**
 * Chapa Payment Rail (Ethiopian fintech)
 * Creates ledger entries and tracks payment status
 * In production, would integrate with Chapa API
 */
export declare class ChapaRail implements PaymentRail {
    id: PaymentRailId;
    name: string;
    initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
    checkStatus(providerReference: string): Promise<PaymentResult>;
    initiateRefund(providerReference: string, amountCents: number): Promise<PaymentResult>;
}
//# sourceMappingURL=chapa.rail.d.ts.map