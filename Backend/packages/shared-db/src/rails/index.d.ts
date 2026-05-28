import 'dotenv/config';
import { StubRail } from './stub.rail';
import { CashAgentRail } from './cash-agent.rail';
import { ChapaRail } from './chapa.rail';
import { TelebirrRail } from './telebirr.rail';
import { BankTransferRail } from './bank-transfer.rail';
/**
 * Register all payment rails at startup
 * Called from packages/shared-db/src/index.ts
 */
export declare function registerPaymentRails(): void;
export declare const registeredRails: (CashAgentRail | ChapaRail | TelebirrRail | BankTransferRail | StubRail)[];
//# sourceMappingURL=index.d.ts.map