// Generates Proof of Delivery after dual confirmation
// Queue: QUEUES.POD_GENERATOR
// Job data: { loadId }

import { Worker } from "bullmq";
import { prisma, generateId } from "@ruit/shared-db";
import { QUEUES, addJob, redis } from "@ruit/shared-queue";

interface PodGeneratorJobData {
  loadId: string;
}

export function createPodGeneratorWorker() {
  return new Worker<PodGeneratorJobData>(QUEUES.POD_GENERATOR, async (job) => {
    const { loadId } = job.data;
    console.log(`Generating POD for load ${loadId}`);

    // 1. Verify both driver and orderer have confirmed
    const loadStops = await prisma.loadStop.findMany({
      where: { loadId },
      select: { confirmedAt: true, stopType: true, ordererId: true },
    });

    const allStopsConfirmed = loadStops.every((stop: any) => stop.confirmedAt !== null);

    // For a real POD, we need to check if *both* driver and orderer have confirmed.
    // In this simplified worker, we assume all stops being confirmed implies dual confirmation.
    // More robust logic would involve checking events or specific flags on the load.

    if (!allStopsConfirmed) {
      console.warn(`POD for load ${loadId} not generated: Not all stops confirmed.`);
      // Re-add job with a delay if not confirmed, or handle as a failed job
      await job.moveToDelayed(Date.now() + 60 * 60 * 1000);
      return;
    }

    // 2. Fetch complete trip data (load, stops, driver, truck, orderer)
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      include: {
        stops: {
          include: {
            orderer: { select: { companyName: true } }
          }
        },
        orderer: { select: { companyName: true } },
      },
    });

    if (!load) {
      console.error(`Load ${loadId} not found for POD generation.`);
      return;
    }

    // Fetch driver and truck from an associated trip, if available
    const trip = await prisma.trip.findFirst({
      where: { loadId, status: "COMPLETED" },
      include: {
        driver: { select: { userId: true, licenseNumber: true } },
        truck: { select: { plateNumber: true, truckType: true } },
      },
    });

    // 3. Build POD summary JSON
    let driverName = "N/A";
    if (trip?.driver?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: trip.driver.userId },
        select: { fullName: true }
      });
      driverName = user?.fullName || "N/A";
    }
    
    const tripSummary = {
      loadId: load.id,
      ordererName: load.orderer?.companyName || "N/A",
      driverName: driverName,
      truckPlate: trip?.truck?.plateNumber || "N/A",
      loadType: load.loadType,
      totalStops: load.totalStops,
      stops: load.stops.map((s: any) => ({
        stopSequence: s.stopSequence,
        stopType: s.stopType,
        address: s.address,
        actualArrival: s.actualArrival?.toISOString(),
        cargoDescription: s.cargoDescription,
        weightQuintals: Number(s.weightQuintals),
        confirmedAt: s.confirmedAt?.toISOString(),
      })),
      // Add more details as needed
      generatedAt: new Date().toISOString(),
    };

    // 4. Create ProofOfDelivery record with tripSummary
    const podRecord = await prisma.proofOfDelivery.upsert({
      where: { loadId },
      update: {
        generatedAt: new Date(),
        tripSummary,
        pdfReference: `pod_${loadId}.pdf`, // Mock PDF reference
      },
      create: {
        id: generateId("pod"),
        loadId,
        generatedAt: new Date(),
        tripSummary,
        pdfReference: `pod_${loadId}.pdf`,
      },
    });

    // 5. Mark load as fully COMPLETED
    await prisma.load.update({
      where: { id: loadId },
      data: { status: "COMPLETED" },
    });

    // 6. Trigger escrow release for any remaining stops (this would be handled by liquidity engine)
    // For this worker, we assume liquidity engine handles full escrow release upon load status change to COMPLETED.

    // 7. Notify all parties that POD is available
    await addJob(QUEUES.NOTIFICATIONS, "send-notification", {
      to: load.ordererId,
      message: `Proof of Delivery for load ${loadId} is now available for download.`,
      type: "POD_AVAILABLE"
    });

    // Also notify fleet owner (if applicable)
    // This requires finding the fleet owner linked to the driver/truck of the load.
    if (trip?.driver?.userId) {
      const driverUser = await prisma.user.findUnique({ where: { id: trip.driver.userId }, select: { fleetOwner: { select: { userId: true } } } });
      if (driverUser?.fleetOwner?.userId) {
        await addJob(QUEUES.NOTIFICATIONS, "send-notification", {
          to: driverUser.fleetOwner.userId,
          message: `Proof of Delivery for load ${loadId} is now available.`,
          type: "POD_AVAILABLE"
        });
      }
    }

    console.log(`POD generation for load ${loadId} completed. POD ID: ${podRecord.id}`);
  }, { connection: redis });
}

