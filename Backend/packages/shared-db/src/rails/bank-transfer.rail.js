"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankTransferRail = void 0;
require("dotenv/config");
const index_1 = require("../index");
/**
 * Bank Transfer Payment Rail
 * Institutional/bank transfer with longer settlement: 48 hours
 * Creates ledger entries and tracks payment status
 */
class BankTransferRail {
    constructor() {
        this.id = 'bank_transfer';
        this.name = 'Bank Transfer (2-day settlement)';
        this.expectedSettlementHours = 48;
    }
    async initiatePayment(params) {
        const entry = await index_1.prisma.escrowLedgerEntry.create({
            data: {
                id: (0, index_1.generateId)('els'),
                fromUserId: params.metadata?.from_user_id,
                toUserId: params.metadata?.to_user_id,
                amountCents: params.amountCents,
                type: 'BANK_TRANSFER_INITIATE',
                paymentRailId: this.id,
                providerReference: `bnk_${params.reference}_${Date.now()}`,
                status: 'PENDING',
                notes: `Bank transfer (48h settlement) for ${params.description}`,
            },
        });
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
                type: 'BANK_TRANSFER_REFUND',
                paymentRailId: this.id,
                providerReference: `bnk_refund_${providerReference}_${Date.now()}`,
                status: 'PENDING',
                notes: `Bank refund (48h settlement) against payment ${providerReference}`,
            },
        });
        return {
            success: true,
            status: 'PENDING',
            providerReference: refund.id,
        };
    }
}
exports.BankTransferRail = BankTransferRail;
//# sourceMappingURL=bank-transfer.rail.js.map