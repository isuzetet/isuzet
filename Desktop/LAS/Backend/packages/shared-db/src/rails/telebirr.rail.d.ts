import 'dotenv/config';
import { PaymentRail, InitiatePaymentParams, PaymentResult, PaymentRailId } from '@ruit/shared-types';
/**
 * Telebirr Payment Rail (Ethiopian fintech)
 * T0 payout: same-day settlement (expectedSettlementHours: 0)
 * Creates ledger entries and tracks payment status
 */
export declare class TelebirrRail implements PaymentRail {
    id: PaymentRailId;
    name: string;
    expectedSettlementHours: number;
    initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
    checkStatus(providerReference: string): Promise<PaymentResult>;
    initiateRefund(providerReference: string, amountCents: number): Promise<PaymentResult>;
}
//# sourceMappingURL=telebirr.rail.d.ts.map