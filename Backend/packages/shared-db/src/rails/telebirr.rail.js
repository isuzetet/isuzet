"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelebirrRail = void 0;
require("dotenv/config");
const index_1 = require("../index");
/**
 * Telebirr Payment Rail (Ethiopian fintech)
 * T0 payout: same-day settlement (expectedSettlementHours: 0)
 * Creates ledger entries and tracks payment status
 */
class TelebirrRail {
    constructor() {
        this.id = 'telebirr';
        this.name = 'Telebirr Payment Gateway';
        this.expectedSettlementHours = 0; // T0 same-day settlement
    }
    async initiatePayment(params) {
        const entry = await index_1.prisma.escrowLedgerEntry.create({
            data: {
                id: (0, index_1.generateId)('els'),
                fromUserId: params.metadata?.from_user_id,
                toUserId: params.metadata?.to_user_id,
                amountCents: params.amountCents,
                type: 'TELEBIRR_INITIATE',
                paymentRailId: this.id,
                providerReference: `tbr_${params.reference}_${Date.now()}`,
                status: 'PENDING',
                notes: `Telebirr payment (T0 settlement) for ${params.description}`,
            },
        });
        // In production: integrate with Telebirr API for same-day settlement
        return {
            success: true,
            status: 'PENDING',
            providerReference: entry.id,
        };
    }
    async checkStatus(providerReference) {
        const entry = await index_1.prisma.escrowLedgerEntry.findUnique({
            where: { id: providerReference },
        });
        if (!entry) {
            return {
                success: false,
                status: 'FAILED',
                failureReason: 'Payment not found',
            };
        }
        const statusMap = {
            PENDING: 'PENDING',
            COMPLETED: 'COMPLETED',
            PAYOUT_FAILED: 'FAILED',
        };
        return {
            success: entry.status === 'COMPLETED',
            status: statusMap[entry.status] || 'FAILED',
            providerReference: entry.id,
            failureReason: entry.failureReason || undefined,
        };
    }
    async initiateRefund(providerReference, amountCents) {
        const original = await index_1.prisma.escrowLedgerEntry.findUnique({
            where: { id: providerReference },
        });
        if (!original) {
            return {
                success: false,
                status: 'FAILED',
                failureReason: 'Original payment not found for refund',
            };
        }
        const refund = await index_1.prisma.escrowLedgerEntry.create({
            data: {
                id: (0, index_1.generateId)('els'),
                fromUserId: original.toUserId,
                toUserId: original.fromUserId,
                amountCents: amountCents,
                type: 'TELEBIRR_REFUND',
                paymentRailId: this.id,
                providerReference: `tbr_refund_${providerReference}_${Date.now()}`,
                status: 'PENDING',
                notes: `T0 Refund via Telebirr against payment ${providerReference}`,
            },
        });
        return {
            success: true,
            status: 'PENDING',
            providerReference: refund.id,
        };
    }
}
exports.TelebirrRail = TelebirrRail;
//# sourceMappingURL=telebirr.rail.js.map