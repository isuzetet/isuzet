"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashAgentRail = void 0;
require("dotenv/config");
const shared_types_1 = require("@ruit/shared-types");
const index_1 = require("../index");
const config_1 = require("../config");
/**
 * Cash Agent Payment Rail
 * Settles payments via community agents who collect cash
 * Creates ledger entries with a settlement deadline
 */
class CashAgentRail {
    constructor() {
        this.id = shared_types_1.CASH_AGENT_RAIL_ID;
        this.name = 'Cash Agent Settlement';
    }
    async initiatePayment(params) {
        const config = await (0, config_1.getConfig)();
        const metadata = params.metadata;
        // Create EscrowLedgerEntry with PENDING status
        const entry = await index_1.prisma.escrowLedgerEntry.create({
            data: {
                id: (0, index_1.generateId)('els'),
                fromUserId: metadata.farmerUserId,
                toUserId: metadata.agentUserId,
                amountCents: params.amountCents,
                type: 'CASH_AGENT_COLLECTION',
                paymentRailId: this.id,
                providerReference: `ca_${params.reference}_${Date.now()}`,
                status: 'PENDING',
                notes: `Cash collection by agent. Settlement window: ${config.agentCashSettlementWindowMin} minutes`,
            },
        });
        // Enqueue AGENT_CASH_SETTLEMENT job
        // (In production, this would be done by the job scheduler)
        // For now, we just record it in the ledger entry
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
                failureReason: 'Ledger entry not found',
            };
        }
        const statusMap = {
            PENDING: 'PENDING',
            COMPLETED: 'COMPLETED',
            PAYOUT_FAILED: 'FAILED',
        };
        return {
            success: entry.status === 'COMPLETED' || entry.status === 'PENDING',
            status: statusMap[entry.status] || 'FAILED',
            providerReference: entry.id,
            failureReason: entry.status === 'PAYOUT_FAILED' ? entry.failureReason || undefined : undefined,
        };
    }
    async initiateRefund(providerReference, amountCents) {
        const originalEntry = await index_1.prisma.escrowLedgerEntry.findUnique({
            where: { id: providerReference },
        });
        if (!originalEntry) {
            return {
                success: false,
                status: 'FAILED',
                failureReason: 'Original entry not found for refund',
            };
        }
        // Create refund entry (reverse direction)
        const refundEntry = await index_1.prisma.escrowLedgerEntry.create({
            data: {
                id: (0, index_1.generateId)('els'),
                fromUserId: originalEntry.toUserId,
                toUserId: originalEntry.fromUserId,
                amountCents: amountCents,
                type: 'CASH_AGENT_REFUND',
                paymentRailId: this.id,
                providerReference: `ca_refund_${providerReference}_${Date.now()}`,
                status: 'PENDING',
                notes: `Refund via cash agent against entry ${providerReference}`,
            },
        });
        return {
            success: true,
            status: 'PENDING',
            providerReference: refundEntry.id,
        };
    }
}
exports.CashAgentRail = CashAgentRail;
//# sourceMappingURL=cash-agent.rail.js.map