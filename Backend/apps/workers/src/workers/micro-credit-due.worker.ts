import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId, getConfig } from '@ruit/shared-db';
import { QUEUES, redis, addJob } from '@ruit/shared-queue';

interface MicroCreditDueJob {
  loanId?: string; // If provided, process only this loan; otherwise scan all due
}

/**
 * Micro-Credit Due Worker
 * 
 * Processes overdue micro-credit loans with SMS reminders:
 *   Day 0 (due): "Your ISUZET credit of ETB X is due today. Pay via [link]"
 *   Day 2: "REMINDER: ETB X overdue on ISUZET credit. Load creation paused at Day 8."
 *   Day 5: "FINAL NOTICE: ETB X overdue. Pay today to avoid account restriction."
 *   Day 7+: Mark as DEFAULTED, apply agent hold
 */

async function processOverdueMicroCredits(): Promise<void> {
  const config = await getConfig();
  const now = new Date();

  // Find all active micro-credit loans that are overdue
  const overdueLoans = await prisma.microCreditLoan.findMany({
    where: {
      status: 'ACTIVE',
      dueDateAt: { lt: now },
    },
  });

  for (const loan of overdueLoans) {
    // Query borrower separately
    const borrower = await prisma.user.findUnique({
      where: { id: loan.borrowerUserId },
      select: { phone: true, fullName: true },
    });

    if (!borrower) continue;
    const daysOverdue = Math.floor(
      (now.getTime() - loan.dueDateAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const amountEtb = loan.amountCents / 100;

    // Determine which reminder to send
    let reminderMessage: string | null = null;

    if (daysOverdue === 0) {
      reminderMessage = `Your ISUZET credit of ETB ${amountEtb.toFixed(0)} is due today. Pay via app to maintain your account status.`;
    } else if (daysOverdue === 2) {
      reminderMessage = `REMINDER: ETB ${amountEtb.toFixed(0)} overdue on ISUZET credit. Load creation paused starting Day 8 of overdue status.`;
    } else if (daysOverdue === 5) {
      reminderMessage = `FINAL NOTICE: ETB ${amountEtb.toFixed(0)} overdue. Pay today to avoid account restriction and loan default.`;
    }

    if (reminderMessage && borrower?.phone) {
      // Send SMS reminder
      await addJob(QUEUES.NOTIFICATIONS, 'send-sms', {
        to: borrower.phone,
        message: reminderMessage,
      });
    }

    // If grace period exceeded, mark as OVERDUE or DEFAULTED
    const gracePeriodMs = config.microCreditGracePeriodDays * 24 * 60 * 60 * 1000;

    if (daysOverdue >= 7 && daysOverdue * 1000 * 60 * 60 * 24 >= gracePeriodMs) {
      // Mark loan as DEFAULTED
      await prisma.microCreditLoan.update({
        where: { id: loan.id },
        data: {
          status: 'DEFAULTED',
        },
      });

      // Apply agent hold if guarantor exists
      if (loan.guarantorAgentId) {
        await prisma.microCreditLoan.update({
          where: { id: loan.id },
          data: {
            agentHoldApplied: true,
          },
        });

        // Send SMS to guarantor/agent
        const guarantor = await prisma.user.findUnique({
          where: { id: loan.guarantorAgentId },
          select: { phone: true, fullName: true },
        });

        if (guarantor?.phone) {
          await addJob(QUEUES.NOTIFICATIONS, 'send-sms', {
            to: guarantor.phone,
            message: `ALERT: Micro-credit loan ETB ${amountEtb.toFixed(0)} for borrower (guaranteed by you) has defaulted. Your account may be restricted.`,
          });
        }
      }

      // Restrict borrower from creating new loads
      await prisma.user.update({
        where: { id: loan.borrowerUserId },
        data: {
          status: 'PENDING_REVIEW', // or use a specific restriction status
        },
      });

      // Log incident
      const strategy = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { activatedAt: 'desc' },
      });

      await prisma.event.create({
        data: {
          id: generateId('evt'),
          eventType: 'MICRO_CREDIT_DEFAULTED',
          aggregateId: loan.borrowerUserId,
          aggregateType: 'User',
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          strategyVersionId: strategy?.id ?? 'str_default',
          payload: {
            loanId: loan.id,
            amountCents: loan.amountCents,
            daysOverdue,
            message: `Micro-credit loan ETB ${amountEtb.toFixed(0)} defaulted after ${daysOverdue} days overdue`,
          } as any,
        },
      });
    }
  }
}

export function createMicroCreditDueWorker(): Worker {
  return new Worker<MicroCreditDueJob>(
    QUEUES.MICRO_CREDIT_DUE,
    async (job: Job<MicroCreditDueJob>) => {
      await processOverdueMicroCredits();
      return { processed: 1 };
    },
    {
      connection: redis,
    }
  );
}
