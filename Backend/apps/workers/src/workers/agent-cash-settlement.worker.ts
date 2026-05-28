import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import { redis } from '@ruit/shared-queue';
import { prisma } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';
import { generateId } from '@ruit/shared-utils';
import { QueueNames } from '@ruit/shared-types/src/queues';

const QUEUE_NAME = QueueNames.AGENT_CASH_SETTLEMENT || 'AGENT_CASH_SETTLEMENT';

export async function startAgentCashSettlementWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      try {
        const config = await getConfig();

        const agentsWithPending = await prisma.agentWallet.findMany({
          where: {
            pendingSettlementCents: {
              gt: 0,
            },
          },
          select: {
            agentUserId: true,
            balanceCents: true,
            pendingSettlementCents: true,
          },
        });

        const results = [];
        for (const agent of agentsWithPending) {
          try {
            if (agent.balanceCents < agent.pendingSettlementCents) {
              results.push({
                agentUserId: agent.agentUserId,
                success: false,
                reason: 'INSUFFICIENT_BALANCE',
              });
              continue;
            }

            await prisma.$transaction(async (tx) => {
              await tx.agentWallet.update({
                where: { agentUserId: agent.agentUserId },
                data: {
                  balanceCents: {
                    increment: agent.pendingSettlementCents,
                  },
                  pendingSettlementCents: 0,
                  lastSettledAt: new Date(),
                  totalSettledCents: {
                    increment: agent.pendingSettlementCents,
                  },
                },
              });

              await tx.escrowLedgerEntry.create({
                data: {
                  id: generateId('els'),
                  type: 'AGENT_SETTLEMENT',
                  amountCents: agent.pendingSettlementCents,
                  toUserId: agent.agentUserId,
                  status: 'COMPLETED',
                  notes: `Scheduled agent wallet settlement`,
                },
              });
            });

            results.push({
              agentUserId: agent.agentUserId,
              success: true,
              settledAmount: agent.pendingSettlementCents,
            });
          } catch (error) {
            results.push({
              agentUserId: agent.agentUserId,
              success: false,
              reason: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return {
          processedAgents: results.length,
          results,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    console.log(`Agent cash settlement job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Agent cash settlement job ${job?.id} failed:`, error);
  });

  return worker;
}

export async function scheduleAgentCashSettlement() {
  const config = await getConfig();
  const cycleDays = config.agentCashSettlementCycleDays || 7;
  const delayMs = cycleDays * 24 * 60 * 60 * 1000;

  const queue = new Queue(QUEUE_NAME, { connection: redis });

  await queue.add(
    'agent_cash_settlement_cycle',
    {
      jobId: generateId('csj'),
      cycleNumber: Math.floor(Date.now() / delayMs),
    },
    {
      repeat: {
        every: delayMs,
      },
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  );

  await queue.close();
}
