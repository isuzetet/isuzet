import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma } from '@ruit/shared-db';
import { QueueNames } from '@ruit/shared-types/src/queues';
import { redis } from '@ruit/shared-queue';
import { Queue } from 'bullmq';

interface DirectBookingExpiryJob {
  bookingId: string;
}

export async function expireDirectBooking(bookingId: string): Promise<{
  success: boolean;
  loadId?: string;
  requeuedToWdm?: boolean;
  error?: { code: string; message: string };
}> {
  const booking = await (prisma as any).directBooking.findUnique({
    where: { id: bookingId },
    include: { load: true },
  });

  if (!booking) {
    return { success: false, error: { code: 'BOOKING_NOT_FOUND', message: `Direct booking ${bookingId} not found` } };
  }

  if (booking.status !== 'PENDING') {
    console.log(`Direct booking ${bookingId} is ${booking.status}, not PENDING, no action needed`);
    return { success: true, loadId: booking.loadId, requeuedToWdm: false };
  }

  // Update booking status to EXPIRED
  await (prisma as any).directBooking.update({
    where: { id: bookingId },
    data: { status: 'EXPIRED', respondedAt: new Date() },
  });

  // Update load status to make it available for WDM matching
  await (prisma as any).load.update({
    where: { id: booking.loadId },
    data: { status: 'PENDING' },
  });

  // Enqueue load for WDM matching via optimizer service
  const optimizerQueue = new Queue('ruit:optimizer', { connection: redis as any });
  await optimizerQueue.add('optimize-load', { loadId: booking.loadId }, { priority: 5 });

  console.log(`Direct booking ${bookingId} expired, load ${booking.loadId} requeued to WDM`);

  return { success: true, loadId: booking.loadId, requeuedToWdm: true };
}

export function createDirectBookingWorker(): Worker {
  return new Worker<DirectBookingExpiryJob>(
    QueueNames.DIRECT_BOOKING_EXPIRY,
    async (job: Job<DirectBookingExpiryJob>) => {
      const { bookingId } = job.data;
      console.log(`Processing direct booking expiry for ${bookingId}`);

      const result = await expireDirectBooking(bookingId);

      if (!result.success) {
        throw new Error(result.error?.message || 'Unknown error');
      }

      return result;
    },
    { connection: redis, concurrency: 10 }
  );
}

export { redis };
