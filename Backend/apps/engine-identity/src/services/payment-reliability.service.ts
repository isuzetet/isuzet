/**
 * RUIT CBE - Payment Reliability Score Calculator
 */
import { prisma } from '@ruit/shared-db';

/**
 * Update payment reliability score
 * Called on PAYMENT_DELAYED and PAYMENT_RELEASED events
 */
export async function updatePaymentReliabilityScore(
  entityId: string,
  entityType: 'FLEET_OWNER' | 'ORDERER'
): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get payment events for this entity
  const paymentEvents = await prisma.event.findMany({
    where: {
      aggregateId: entityId,
      eventType: 'PAYMENT_DELAYED',
      createdAt: { gte: ninetyDaysAgo }
    },
    select: {
      createdAt: true,
      payload: true
    }
  });

  const delayedCount = paymentEvents.length;
  let totalDaysOverdue = 0;

  for (const event of paymentEvents) {
    const payload = event.payload as any;
    if (payload?.days_overdue) {
      totalDaysOverdue += payload.days_overdue;
    }
  }

  const avgDaysOverdue = delayedCount > 0 ? totalDaysOverdue / delayedCount : 0;

  // Formula: MAX(0, 100 - (delayed_count * 12) - (avg_days_overdue * 2))
  const score = Math.max(0, 100 - (delayedCount * 12) - (avgDaysOverdue * 2));

  // Update entity record
  if (entityType === 'FLEET_OWNER') {
    await prisma.fleetOwner.update({
      where: { id: entityId },
      data: { paymentReliabilityScore: score }
    });
  } else if (entityType === 'ORDERER') {
    await prisma.orderer.update({
      where: { id: entityId },
      data: { paymentReliabilityScore: score }
    });
  }
}
