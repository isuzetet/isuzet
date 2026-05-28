import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma, generateId } from '@ruit/shared-db';
import { QUEUES, redis } from '@ruit/shared-queue';

interface WeighbridgeIntelJob {
  weighbridgeLogId: string;
}

export function createWeighbridgeIntelligenceWorker(): Worker {
  return new Worker<WeighbridgeIntelJob>(
    QUEUES.WEIGHBRIDGE_INTEL,
    async (job: Job<WeighbridgeIntelJob>) => {
      const { weighbridgeLogId } = job.data;

      // Find WeighbridgeLog by id
      const weighbridgeLog = await prisma.weighbridgeLog.findUnique({
        where: { id: weighbridgeLogId },
      });

      if (!weighbridgeLog) {
        throw new Error(`WeighbridgeLog not found: ${weighbridgeLogId}`);
      }

      const lat = weighbridgeLog.lat?.toNumber() ?? 0;
      const lng = weighbridgeLog.lng?.toNumber() ?? 0;
      const feeEtb = weighbridgeLog.fineAmountEtb ?? 0;
      const corridorId = weighbridgeLog.corridorId;

      // Find existing CheckpointIntelligence within 0.01 degree bounding box
      // AND same corridorId (if exists)
      const boundingBoxLatMin = lat - 0.01;
      const boundingBoxLatMax = lat + 0.01;
      const boundingBoxLngMin = lng - 0.01;
      const boundingBoxLngMax = lng + 0.01;

      const existingCheckpoint = await prisma.checkpointIntelligence.findFirst({
        where: {
          lat: {
            gte: boundingBoxLatMin,
            lte: boundingBoxLatMax,
          },
          lng: {
            gte: boundingBoxLngMin,
            lte: boundingBoxLngMax,
          },
          ...(corridorId ? { corridorId } : {}),
          checkpointType: 'WEIGHBRIDGE',
        },
      });

      let checkpoint;

      if (existingCheckpoint) {
        // Rolling average update (80/20 as in engine-incident)
        // 80% old average + 20% new value
        const oldReportCount = existingCheckpoint.reportCount;
        const oldAvgFee = existingCheckpoint.averageFeeEtb;
        const oldMaxFee = existingCheckpoint.maxFeeEtb;

        const newReportCount = oldReportCount + 1;
        const newAvgFee = Math.round(oldAvgFee * 0.8 + feeEtb * 0.2);
        const newMaxFee = Math.max(oldMaxFee, feeEtb);

        checkpoint = await prisma.checkpointIntelligence.update({
          where: { id: existingCheckpoint.id },
          data: {
            reportCount: newReportCount,
            averageFeeEtb: newAvgFee,
            maxFeeEtb: newMaxFee,
            lastReportedAt: new Date(),
          },
        });
      } else {
        // Create new CheckpointIntelligence
        checkpoint = await prisma.checkpointIntelligence.create({
          data: {
            corridorId: corridorId ?? null,
            lat: lat,
            lng: lng,
            checkpointType: 'WEIGHBRIDGE',
            locationName: weighbridgeLog.locationName ?? 'Unknown Weighbridge',
            averageFeeEtb: feeEtb,
            maxFeeEtb: feeEtb,
            reportCount: 1,
            isOfficialToll: true,
            lastReportedAt: new Date(),
          },
        });
      }

      // Recalculate corridor.expectedCheckpointFeeEtb (sum all for corridor)
      if (corridorId) {
        const checkpoints = await prisma.checkpointIntelligence.findMany({
          where: {
            corridorId: corridorId,
            // Only count checkpoints that are relevant: WEIGHBRIDGE and toll booths
            checkpointType: { in: ['WEIGHBRIDGE', 'TOLL_BOOTH'] },
          },
        });

        // Sum average fees for all checkpoints
        const totalFee = checkpoints.reduce((sum: number, cp: any) => {
          return sum + cp.averageFeeEtb;
        }, 0);

        // Update corridor with new expected checkpoint fee
        await prisma.corridor.update({
          where: { id: corridorId },
          data: {
            expectedCheckpointFeeEtb: totalFee,
          },
        });

        console.log(
          `Updated corridor ${corridorId} expectedCheckpointFeeEtb to ${totalFee} ETB based on ${checkpoints.length} checkpoints`
        );
      }

      return {
        success: true,
        weighbridgeLogId,
        checkpointId: checkpoint.id,
        isNewCheckpoint: !existingCheckpoint,
      };
    },
    { connection: redis, concurrency: 3 }
  );
}

export { redis };

