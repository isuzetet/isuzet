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

class _PaymentRailRegistry {
  private rails = new Map<PaymentRailId, PaymentRail>();

  register(rail: PaymentRail): void {
    this.rails.set(rail.id, rail);
  }

  get(railId: PaymentRailId): PaymentRail {
    const rail = this.rails.get(railId);
    if (!rail) {
      throw new Error(
        `Payment rail '${railId}' is not registered. ` +
        `Register it at app startup before processing payments.`
      );
    }
    return rail;
  }

  list(): PaymentRailId[] {
    return Array.from(this.rails.keys());
  }
}

export const PaymentRailRegistry = new _PaymentRailRegistry();

export const CASH_AGENT_RAIL_ID: PaymentRailId = 'cash_agent';

export interface CashAgentPaymentMetadata {
  agentUserId: string;
  farmerUserId: string;
  settlementDeadlineIso: string;
  zoneId: string;
}
