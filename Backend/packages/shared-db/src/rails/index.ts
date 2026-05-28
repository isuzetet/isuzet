import 'dotenv/config';
import { PaymentRailRegistry } from '@ruit/shared-types';
import { StubRail } from './stub.rail';
import { CashAgentRail } from './cash-agent.rail';
import { ChapaRail } from './chapa.rail';
import { TelebirrRail } from './telebirr.rail';
import { BankTransferRail } from './bank-transfer.rail';

/**
 * Register all payment rails at startup
 * Called from packages/shared-db/src/index.ts
 */
export function registerPaymentRails(): void {
  PaymentRailRegistry.register(new StubRail());
  PaymentRailRegistry.register(new CashAgentRail());
  PaymentRailRegistry.register(new ChapaRail());
  PaymentRailRegistry.register(new TelebirrRail());
  PaymentRailRegistry.register(new BankTransferRail());
}

export const registeredRails = [
  new StubRail(),
  new CashAgentRail(),
  new ChapaRail(),
  new TelebirrRail(),
  new BankTransferRail(),
];
