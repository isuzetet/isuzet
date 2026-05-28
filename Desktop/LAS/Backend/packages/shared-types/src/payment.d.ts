import 'dotenv/config';
export type PaymentRailId = string;
export interface InitiatePaymentParams {
    railId: PaymentRailId;
    amountCents: number;
    currency: 'ETB';
    reference: string;
    description: string;
    payerAccountRef?: string;
    payeeAccountRef?: string;
    metadata?: Record<string, unknown>;
}
export interface PaymentResult {
    success: boolean;
    providerReference?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REQUIRES_ACTION';
    checkoutUrl?: string;
    failureReason?: string;
}
export interface PaymentRail {
    id: PaymentRailId;
    name: string;
    initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult>;
    checkStatus(providerReference: string): Promise<PaymentResult>;
    initiateRefund(providerReference: string, amountCents: number): Promise<PaymentResult>;
}
declare class _PaymentRailRegistry {
    private rails;
    register(rail: PaymentRail): void;
    get(railId: PaymentRailId): PaymentRail;
    list(): PaymentRailId[];
}
export declare const PaymentRailRegistry: _PaymentRailRegistry;
export declare const CASH_AGENT_RAIL_ID: PaymentRailId;
export interface CashAgentPaymentMetadata {
    agentUserId: string;
    farmerUserId: string;
    settlementDeadlineIso: string;
    zoneId: string;
}
export {};
//# sourceMappingURL=payment.d.ts.map