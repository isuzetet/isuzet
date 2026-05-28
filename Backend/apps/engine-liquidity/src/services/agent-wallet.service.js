"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditAgentWallet = creditAgentWallet;
exports.settleAgentWallet = settleAgentWallet;
exports.holdAgentCommission = holdAgentCommission;
exports.getCashSettlementSummary = getCashSettlementSummary;
require("dotenv/config");
const shared_db_1 = require("@ruit/shared-db");
async function creditAgentWallet(agentUserId, amountCents, type) {
    try {
        const wallet = await shared_db_1.prisma.agentWallet.findUnique({
            where: { agentUserId },
        });
        if (!wallet) {
            return {
                success: false,
                error: {
                    code: 'WALLET_NOT_FOUND',
                    message: 'Agent wallet not found',
                },
            };
        }
        const result = await shared_db_1.prisma.$transaction(async (tx) => {
            const updatedWallet = await tx.agentWallet.update({
                where: { agentUserId },
                data: {
                    pendingSettlementCents: {
                        increment: amountCents,
                    },
                },
            });
            await tx.escrowLedgerEntry.create({
                data: {
                    id: (0, shared_db_1.generateId)('els'),
                    type,
                    amountCents,
                    toUserId: agentUserId,
                    status: 'COMPLETED',
                    notes: `Credit to agent wallet: ${type}`,
                },
            });
            return updatedWallet;
        });
        return { success: true, data: result };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'CREDIT_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
}
async function settleAgentWallet(agentUserId) {
    try {
        const wallet = await shared_db_1.prisma.agentWallet.findUnique({
            where: { agentUserId },
        });
        if (!wallet) {
            return {
                success: false,
                error: {
                    code: 'WALLET_NOT_FOUND',
                    message: 'Agent wallet not found',
                },
            };
        }
        if (wallet.balanceCents < wallet.pendingSettlementCents) {
            return {
                success: false,
                error: {
                    code: 'INSUFFICIENT_BALANCE',
                    message: 'Insufficient balance for settlement',
                },
            };
        }
        const result = await shared_db_1.prisma.$transaction(async (tx) => {
            const updatedWallet = await tx.agentWallet.update({
                where: { agentUserId },
                data: {
                    balanceCents: {
                        increment: wallet.pendingSettlementCents,
                    },
                    pendingSettlementCents: 0,
                    lastSettledAt: new Date(),
                    totalSettledCents: {
                        increment: wallet.pendingSettlementCents,
                    },
                },
            });
            await tx.escrowLedgerEntry.create({
                data: {
                    id: (0, shared_db_1.generateId)('els'),
                    type: 'AGENT_SETTLEMENT',
                    amountCents: wallet.pendingSettlementCents,
                    toUserId: agentUserId,
                    status: 'COMPLETED',
                    notes: `Agent wallet settlement`,
                },
            });
            return updatedWallet;
        });
        return { success: true, data: result };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'SETTLEMENT_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
}
async function holdAgentCommission(agentUserId, amountCents, reason) {
    try {
        const wallet = await shared_db_1.prisma.agentWallet.findUnique({
            where: { agentUserId },
        });
        if (!wallet) {
            return {
                success: false,
                error: {
                    code: 'WALLET_NOT_FOUND',
                    message: 'Agent wallet not found',
                },
            };
        }
        if (wallet.balanceCents < amountCents) {
            return {
                success: false,
                error: {
                    code: 'INSUFFICIENT_BALANCE',
                    message: 'Insufficient balance to hold commission',
                },
            };
        }
        const result = await shared_db_1.prisma.$transaction(async (tx) => {
            const updatedWallet = await tx.agentWallet.update({
                where: { agentUserId },
                data: {
                    balanceCents: {
                        decrement: amountCents,
                    },
                },
            });
            await tx.escrowLedgerEntry.create({
                data: {
                    id: (0, shared_db_1.generateId)('els'),
                    type: 'AGENT_COMMISSION_HOLD',
                    amountCents: -amountCents,
                    toUserId: agentUserId,
                    status: 'COMPLETED',
                    notes: `Hold commission: ${reason}`,
                },
            });
            return updatedWallet;
        });
        return { success: true, data: result };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'HOLD_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
}
async function getCashSettlementSummary(agentUserId) {
    try {
        const wallet = await shared_db_1.prisma.agentWallet.findUnique({
            where: { agentUserId },
        });
        if (!wallet) {
            return {
                success: false,
                error: {
                    code: 'WALLET_NOT_FOUND',
                    message: 'Agent wallet not found',
                },
            };
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCommissions = await shared_db_1.prisma.escrowLedgerEntry.aggregate({
            where: {
                toUserId: agentUserId,
                type: 'AGENT_COMMISSION',
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            _sum: {
                amountCents: true,
            },
        });
        const summary = {
            agentUserId,
            availableBalance: wallet.balanceCents,
            pendingSettlement: wallet.pendingSettlementCents,
            lastSettledAt: wallet.lastSettledAt,
            last30DaysCommission: recentCommissions._sum.amountCents ?? 0,
            totalCollected: wallet.totalCollectedCents,
            totalSettled: wallet.totalSettledCents,
        };
        return { success: true, data: summary };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'SUMMARY_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
}
//# sourceMappingURL=agent-wallet.service.js.map