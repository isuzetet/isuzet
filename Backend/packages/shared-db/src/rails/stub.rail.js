"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StubRail = void 0;
require("dotenv/config");
/**
 * Stub Payment Rail for Development/Testing
 * Always returns COMPLETED status immediately
 * Used for development environments
 */
class StubRail {
    constructor() {
        this.id = 'stub';
        this.name = 'Stub Payment Rail (Development)';
    }
    async initiatePayment(params) {
        return {
            success: true,
            status: 'COMPLETED',
            providerReference: `stub_${params.reference}_${Date.now()}`,
        };
    }
    async checkStatus(providerReference) {
        return {
            success: true,
            status: 'COMPLETED',
            providerReference,
        };
    }
    async initiateRefund(providerReference, amountCents) {
        return {
            success: true,
            status: 'COMPLETED',
            providerReference: `stub_refund_${providerReference}`,
        };
    }
}
exports.StubRail = StubRail;
//# sourceMappingURL=stub.rail.js.map