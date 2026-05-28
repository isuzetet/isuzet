import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';

interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function creditAgentWallet(
  agentUserId: string,
  amountCents: number,
  type: string,
): Promise<ServiceResult> {
  try {
    const wallet = await prisma.agentWallet.findUnique({
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

    const result = await prisma.$transaction(async (tx) => {
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
          id: generateId('els'),
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
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CREDIT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function settleAgentWallet(
  agentUserId: string,
): Promise<ServiceResult> {
  try {
    const wallet = await prisma.agentWallet.findUnique({
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

    const result = await prisma.$transaction(async (tx) => {
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
          id: generateId('els'),
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
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SETTLEMENT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function holdAgentCommission(
  agentUserId: string,
  amountCents: number,
  reason: string,
): Promise<ServiceResult> {
  try {
    const wallet = await prisma.agentWallet.findUnique({
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

    const result = await prisma.$transaction(async (tx) => {
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
          id: generateId('els'),
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
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'HOLD_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function getCashSettlementSummary(
  agentUserId: string,
): Promise<ServiceResult> {
  try {
    const wallet = await prisma.agentWallet.findUnique({
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

    const recentCommissions = await prisma.escrowLedgerEntry.aggregate({
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
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SUMMARY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
