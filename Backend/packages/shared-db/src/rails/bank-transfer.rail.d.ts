import 'dotenv/config';
import { PaymentRail, InitiatePaymentParams, PaymentResult, PaymentRailId } from '@ruit/shared-types';
/**
 * Bank Transfer Payment Rail
 * Institutional/bank transfer with longer settlement: 48 hours
 * Creates ledger entries and tracks payment status
 */
export declare class BankTransferRail implements PaymentRail {
    id: PaymentRailId;
    name: string;
    expectedSettlementHours: number;
    initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
    checkStatus(providerReference: string): Promise<PaymentResult>;
    initiateRefund(providerReference: string, amountCents: number): Promise<PaymentResult>;
}
//# sourceMappingURL=bank-transfer.rail.d.ts.map