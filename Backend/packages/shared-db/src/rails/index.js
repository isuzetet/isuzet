"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registeredRails = void 0;
exports.registerPaymentRails = registerPaymentRails;
require("dotenv/config");
const shared_types_1 = require("@ruit/shared-types");
const stub_rail_1 = require("./stub.rail");
const cash_agent_rail_1 = require("./cash-agent.rail");
const chapa_rail_1 = require("./chapa.rail");
const telebirr_rail_1 = require("./telebirr.rail");
const bank_transfer_rail_1 = require("./bank-transfer.rail");
/**
 * Register all payment rails at startup
 * Called from packages/shared-db/src/index.ts
 */
function registerPaymentRails() {
    shared_types_1.PaymentRailRegistry.register(new stub_rail_1.StubRail());
    shared_types_1.PaymentRailRegistry.register(new cash_agent_rail_1.CashAgentRail());
    shared_types_1.PaymentRailRegistry.register(new chapa_rail_1.ChapaRail());
    shared_types_1.PaymentRailRegistry.register(new telebirr_rail_1.TelebirrRail());
    shared_types_1.PaymentRailRegistry.register(new bank_transfer_rail_1.BankTransferRail());
}
exports.registeredRails = [
    new stub_rail_1.StubRail(),
    new cash_agent_rail_1.CashAgentRail(),
    new chapa_rail_1.ChapaRail(),
    new telebirr_rail_1.TelebirrRail(),
    new bank_transfer_rail_1.BankTransferRail(),
];
//# sourceMappingURL=index.js.map