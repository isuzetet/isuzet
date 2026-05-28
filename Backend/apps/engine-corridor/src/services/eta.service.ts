import { prisma } from "@ruit/shared-db";

interface EtaParams {
  corridorId: string;
  currentLat: number;
  currentLng: number;
  destinationLat: number;
  destinationLng: number;
}

// Haversine formula to calculate distance between two lat/lng points in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calculateEta(params: EtaParams): Promise<{ etaMinutes: number; etaTimestamp: string; distanceKm: number }> {
  const { corridorId, currentLat, currentLng, destinationLat, destinationLng } = params;

  // 1. Calculate remaining distance
  const remainingDistanceKm = haversineDistance(currentLat, currentLng, destinationLat, destinationLng);

  // 2. Get corridor average speed
  const corridor = await prisma.corridor.findUnique({
    where: { id: corridorId },
    select: { id: true, name: true, distanceKm: true }, // Add other relevant fields for calculation if needed
  });

  const averageSpeedKmh = 60; // Default average speed

  // 3. Adjust for time of day (simplified: night driving is slower)
  const currentHour = new Date().getHours();
  let speedMultiplier = 1;
  if (currentHour >= 20 || currentHour < 6) { // 8 PM to 6 AM
    speedMultiplier = 0.8; // 20% slower at night
  }

  // 4. Consider any active incidents on this corridor (simplified: major incident halves speed)
  const activeIncidents = await prisma.incident.count({
    where: {
      trip: { load: { corridorId } },
      status: { in: ["OPEN", "UNDER_INVESTIGATION", "ESCALATED"] },
      severity: { in: ["HIGH", "CRITICAL"] },
    },
  });

  if (activeIncidents > 0) {
    speedMultiplier *= 0.5; // Halve speed due to severe incident
  }

  const effectiveSpeedKmh = averageSpeedKmh * speedMultiplier;
  const etaHours = remainingDistanceKm / effectiveSpeedKmh;
  const etaMinutes = Math.round(etaHours * 60);

  const etaDate = new Date(Date.now() + etaMinutes * 60 * 1000);

  return {
    etaMinutes,
    etaTimestamp: etaDate.toISOString(),
    distanceKm: parseFloat(remainingDistanceKm.toFixed(2)),
  };
}

export async function getCorridorPerformanceStats(corridorId: string) {
  // Placeholder for advanced stats, this will need TimescaleDB queries ideally
  const trips = await prisma.trip.findMany({
    where: { load: { corridorId }, status: "COMPLETED" },
    select: { actualPickupAt: true, actualDeliveryAt: true },
    take: 100, // Recent trips
  });

  let totalDurationMinutes = 0;
  let onTimeDeliveries = 0;

  for (const trip of trips) {
    if (trip.actualPickupAt && trip.actualDeliveryAt) {
      totalDurationMinutes += (trip.actualDeliveryAt.getTime() - trip.actualPickupAt.getTime()) / (1000 * 60);
      // Simplified on-time check
      // if (trip.actualDeliveryAt <= trip.load.deliveryDeadline) { // Need load.deliveryDeadline in trip
      //   onTimeDeliveries++;
      // }
    }
  }

  const averageTripDurationMinutes = trips.length > 0 ? totalDurationMinutes / trips.length : 0;
  const onTimeDeliveryRate = trips.length > 0 ? (onTimeDeliveries / trips.length) * 100 : 0;

  // Mock data for common checkpoint locations and current demand
  const commonCheckpointLocations = ["Checkpoint A", "Checkpoint B"];
  const currentDemandLevel = "MEDIUM";

  return {
    averageTripDurationMinutes: parseFloat(averageTripDurationMinutes.toFixed(2)),
    onTimeDeliveryRate: parseFloat(onTimeDeliveryRate.toFixed(2)),
    commonCheckpointLocations,
    currentDemandLevel,
  };
}
