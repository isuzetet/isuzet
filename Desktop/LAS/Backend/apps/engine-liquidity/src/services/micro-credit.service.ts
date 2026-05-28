import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { createEscrowEntry } from './escrow-ledger.service';

export interface IssueLoanParams {
  borrowerUserId: string;
  agentGuarantorId?: string;
  amountCents: number;
  purpose: string;
}

export interface RepayLoanParams {
  loanId: string;
  amountCents: number;
}

/**
 * Ye Gara Neger (Village Microfinance) Model Service
 * Small trader micro-credit with agent guarantor
 */

/**
 * Check if borrower is eligible for micro-credit
 */
export async function issueLoan(data: IssueLoanParams): Promise<any> {
  const config = await getConfig();

  // Validate amount
  if (data.amountCents <= 0 || data.amountCents > config.creditMaxAmountCents) {
    throw new Error(
      `Loan amount must be between 1 and ${config.creditMaxAmountCents} cents`
    );
  }

  // Check for active loans
  const existingLoans = await prisma.microCreditLoan.findMany({
    where: {
      borrowerUserId: data.borrowerUserId,
      status: {
        in: ['ACTIVE', 'OVERDUE'],
      },
    },
  });

  if (existingLoans.length > 0) {
    throw new Error('Borrower has active or overdue loans');
  }

  // Check monthly absorption cap
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthAbsorptions = await prisma.microCreditLoan.findMany({
    where: {
      status: 'DEFAULTED',
      createdAt: {
        gte: monthStart,
      },
    },
  });

  let monthlyAbsorbed = 0;
  for (const loan of monthAbsorptions) {
    monthlyAbsorbed += loan.amountCents;
  }

  if (
    monthlyAbsorbed + data.amountCents >
    config.monthlyMicroCreditAbsorptionCapCents
  ) {
    throw new Error(
      `Monthly micro-credit absorption cap (${config.monthlyMicroCreditAbsorptionCapCents}) exceeded for zone`
    );
  }

  // Check agent guarantee if provided
  if (data.agentGuarantorId) {
    const agentUser = await prisma.user.findUnique({
      where: { id: data.agentGuarantorId },
    });
    if (!agentUser || agentUser.role !== 'FIELD_AGENT') {
      throw new Error('Guarantor must be a registered FIELD_AGENT');
    }

    // Check agent's default rate
    const agentGuaranteedLoans = await prisma.microCreditLoan.findMany({
      where: {
        guarantorAgentId: data.agentGuarantorId,
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const defaultedCount = agentGuaranteedLoans.filter(
      (l) => l.status === 'DEFAULTED'
    ).length;
    const defaultRate = agentGuaranteedLoans.length
      ? (defaultedCount / agentGuaranteedLoans.length) * 100
      : 0;

    if (defaultRate > config.creditAgentBanThresholdPct) {
      throw new Error('Agent is permanently banned from credit vouching');
    }

    if (defaultRate > config.creditAgentSuspendThresholdPct) {
      throw new Error(
        'Agent credit vouching suspended due to high default rate'
      );
    }
  }

  // Create the loan in transaction
  return await prisma.$transaction(async (tx) => {
    const dueDateAt = new Date();
    dueDateAt.setDate(
      dueDateAt.getDate() + config.creditPaymentDueDays
    );

    const loan = await tx.microCreditLoan.create({
      data: {
        id: generateId('mcl'),
        borrowerUserId: data.borrowerUserId,
        guarantorAgentId: data.agentGuarantorId,
        loadId: undefined,
        amountCents: data.amountCents,
        dueDateAt,
        status: 'ACTIVE',
        repaidCents: 0,
      },
    });

    // Create escrow entry: platform funds on behalf of borrower
    await createEscrowEntry({
      fromUserId: 'PLATFORM',
      toUserId: data.borrowerUserId,
      amountCents: data.amountCents,
      type: 'MICRO_CREDIT_DISBURSEMENT',
      notes: `Micro-credit loan ${loan.id} for ${data.purpose}. Due: ${dueDateAt.toISOString()}`,
    });

    return loan;
  });
}

/**
 * Repay loan in full or partial
 */
export async function repayLoan(data: RepayLoanParams): Promise<any> {
  const loan = await prisma.microCreditLoan.findUnique({
    where: { id: data.loanId },
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
    throw new Error(`Cannot repay loan with status: ${loan.status}`);
  }

  const newRepaidCents = loan.repaidCents + data.amountCents;
  const isFullRepayment = newRepaidCents >= loan.amountCents;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.microCreditLoan.update({
      where: { id: data.loanId },
      data: {
        repaidCents: newRepaidCents,
        status: isFullRepayment ? 'REPAID' : loan.status,
        repaidAt: isFullRepayment ? new Date() : undefined,
      },
    });

    // Create repayment entry
    await createEscrowEntry({
      fromUserId: loan.borrowerUserId,
      toUserId: 'PLATFORM',
      amountCents: data.amountCents,
      type: 'MICRO_CREDIT_REPAYMENT',
      notes: `Micro-credit repayment: ${
        isFullRepayment ? 'FULL' : 'PARTIAL'
      }. Outstanding: ${loan.amountCents - newRepaidCents}`,
    });

    return updated;
  });
}

/**
 * Process overdue loan
 * Called by MICRO_CREDIT_DUE worker on due date
 */
export async function handleDefault(loanId: string): Promise<any> {
  const config = await getConfig();

  const loan = await prisma.microCreditLoan.findUnique({
    where: { id: loanId },
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.status === 'DEFAULTED' || loan.status === 'REPAID') {
    return loan;
  }

  return await prisma.$transaction(async (tx) => {
    // Mark as defaulted
    const defaulted = await tx.microCreditLoan.update({
      where: { id: loanId },
      data: {
        status: 'DEFAULTED',
      },
    });

    // Check monthly absorption cap
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthAbsorptions = await tx.microCreditLoan.findMany({
      where: {
        status: 'DEFAULTED',
        createdAt: {
          gte: monthStart,
        },
      },
    });

    let monthlyAbsorbed = 0;
    for (const absLoan of monthAbsorptions) {
      monthlyAbsorbed += absLoan.amountCents;
    }

    // If under cap, platform absorbs loss
    if (
      monthlyAbsorbed + loan.amountCents <=
      config.monthlyMicroCreditAbsorptionCapCents
    ) {
      await createEscrowEntry({
        fromUserId: 'PLATFORM',
        toUserId: 'PLATFORM',
        amountCents: loan.amountCents,
        type: 'MICRO_CREDIT_PLATFORM_ABSORPTION',
        notes: `Platform absorbs default for loan ${loanId}`,
      });
    }

    // Apply agent penalty if guarantor exists
    if (loan.guarantorAgentId) {
      const agentWallet = await tx.agentWallet.findUnique({
        where: { agentUserId: loan.guarantorAgentId },
      });

      if (agentWallet) {
        // Hold next 3 commissions
        await tx.agentWallet.update({
          where: { id: agentWallet.id },
          data: {
            pendingSettlementCents: {
              decrement: Math.min(
                config.creditAgentDefaultHoldPayments *
                  30000, // Rough avg commission
                agentWallet.balanceCents
              ),
            },
          },
        });
      }

      // Check if should be suspended or banned
      await checkAndSuspendAgentCreditVouching(loan.guarantorAgentId, tx);
    }

    return defaulted;
  });
}

/**
 * Check and suspend/ban agent from credit vouching
 */
export async function checkAndSuspendAgentCreditVouching(
  agentId: string,
  tx?: any
): Promise<void> {
  const config = await getConfig();
  const txClient = tx || prisma;

  // Count agent's guaranteed loans in last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const guaranteedLoans = await txClient.microCreditLoan.findMany({
    where: {
      guarantorAgentId: agentId,
      createdAt: {
        gte: ninetyDaysAgo,
      },
    },
  });

  if (guaranteedLoans.length === 0) {
    return;
  }

  const defaultedCount = guaranteedLoans.filter(
    (l: any) => l.status === 'DEFAULTED'
  ).length;
  const defaultRate = (defaultedCount / guaranteedLoans.length) * 100;

  if (defaultRate > config.creditAgentBanThresholdPct) {
    // Permanent ban
    await txClient.user.update({
      where: { id: agentId },
      data: {
        isActive: false,
      },
    });
  } else if (defaultRate > config.creditAgentSuspendThresholdPct) {
    // Temporary suspension (60 days)
    const suspendUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const user = await txClient.user.findUnique({
      where: { id: agentId },
    });

    if (user) {
      const metadata = (user.metadata as any) || {};
      metadata.creditSuspendedUntil = suspendUntil.toISOString();

      await txClient.user.update({
        where: { id: agentId },
        data: {
          metadata: metadata,
        },
      });
    }
  }
}
