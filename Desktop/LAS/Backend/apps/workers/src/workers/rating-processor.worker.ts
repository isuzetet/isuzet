// Processes new ratings and updates trust scores
// Queue: QUEUES.RATING_PROCESSOR
// Job data: { ratingId, ratedUserId, rating, loadId }

import { Worker } from "bullmq";
import { prisma } from "@ruit/shared-db";
import { QUEUES, addJob, redis } from "@ruit/shared-queue";
import { ROLES, EVENT_TYPES } from "@ruit/shared-types";

interface RatingProcessorJobData {
  ratingId: string;
  loadId: string;
  ratedUserId: string; // The user whose trust score needs to be updated
  rating: number;
  actorId: string;
  actorRole: string;
  bothSubmitted: boolean;
}

// Simplified trust score update logic
function calculateTrustImpact(rating: number): number {
  switch (rating) {
    case 5: return 2;  // +2 trust points
    case 4: return 1;  // +1 trust point
    case 3: return 0;  // 0 impact
    case 2: return -1; // -1 trust point
    case 1: return -3; // -3 trust points
    default: return 0;
  }
}

export function createRatingProcessorWorker() {
  return new Worker<RatingProcessorJobData>(QUEUES.RATING_PROCESSOR, async (job) => {
    const { ratingId, loadId, ratedUserId, rating, actorId, actorRole, bothSubmitted } = job.data;
    console.log(`Processing rating for user ${ratedUserId} on load ${loadId}`);

    const userToUpdate = await prisma.user.findUnique({ where: { id: ratedUserId } });
    if (!userToUpdate) {
      console.error(`Rated user ${ratedUserId} not found.`);
      return;
    }

    // 1. Find the rating event (already handled by behavior engine, this worker processes it)

    // 2. Calculate impact on trust score
    const trustImpact = calculateTrustImpact(rating);
    let currentTrustScore = Number(userToUpdate.kycTier); // Using kycTier as a proxy for trust score

    // Apply decay formula to existing score (simplified: just add/subtract impact)
    let newTrustScore = currentTrustScore + trustImpact;
    newTrustScore = Math.max(0, Math.min(100, newTrustScore)); // Keep score between 0-100

    // 4. Update user trust score
    await prisma.user.update({
      where: { id: ratedUserId },
      data: { kycTier: Math.floor(newTrustScore) }, // Update kycTier as proxy
    });
    console.log(`Updated user ${ratedUserId} trust score from ${currentTrustScore} to ${newTrustScore}`);

    // 5. Check if trust tier should change (simplified: just log)
    // In a real system, this would involve more complex tier logic and maybe different tables.

    // 6. If tier changed: notify user, notify fleet owner if driver
    if (bothSubmitted) {
      // This is where both ratings are revealed and final calculations are made
      await addJob(QUEUES.NOTIFICATIONS, "send-notification", {
        to: actorId, // Notifying the person who submitted the rating
        message: `Both parties have rated load ${loadId}. Your rating: ${rating}. Counterparty rating: (revealed later)`,
        type: "RATING_REVEALED"
      });
    }

    // Emit an event for trust score update (optional, but good for auditing)
    // await addJob(QUEUES.BEHAVIOR, "trust-score-updated", {
    //   userId: ratedUserId,
    //   oldScore: currentTrustScore,
    //   newScore: newTrustScore
    // });
  }, { connection: redis });
}
