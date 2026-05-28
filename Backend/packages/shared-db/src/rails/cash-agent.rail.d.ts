import 'dotenv/config';
import { PaymentRail, InitiatePaymentParams, PaymentResult, PaymentRailId } from '@ruit/shared-types';
/**
 * Cash Agent Payment Rail
 * Settles payments via community agents who collect cash
 * Creates ledger entries with a settlement deadline
 */
export declare class CashAgentRail implements PaymentRail {
    id: PaymentRailId;
    name: string;
    initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
    checkStatus(providerReference: string): Promise<PaymentResult>;
    initiateRefund(providerReference: string, amountCents: number): Promise<PaymentResult>;
}
//# sourceMappingURL=cash-agent.rail.d.ts.map