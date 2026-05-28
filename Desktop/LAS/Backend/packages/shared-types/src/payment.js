"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CASH_AGENT_RAIL_ID = exports.PaymentRailRegistry = void 0;
require("dotenv/config");
class _PaymentRailRegistry {
    constructor() {
        this.rails = new Map();
    }
    register(rail) {
        this.rails.set(rail.id, rail);
    }
    get(railId) {
        const rail = this.rails.get(railId);
        if (!rail) {
            throw new Error(`Payment rail '${railId}' is not registered. ` +
                `Register it at app startup before processing payments.`);
        }
        return rail;
    }
    list() {
        return Array.from(this.rails.keys());
    }
}
exports.PaymentRailRegistry = new _PaymentRailRegistry();
exports.CASH_AGENT_RAIL_ID = 'cash_agent';
//# sourceMappingURL=payment.js.map