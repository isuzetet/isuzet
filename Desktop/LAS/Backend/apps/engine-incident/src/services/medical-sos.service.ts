import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { EARTH_RADIUS_KM } from '@ruit/shared-types';

/**
 * Calculate distance between two GPS points using Haversine formula
 */
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const a = sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Trigger a medical emergency SOS for a driver
 * Finds the nearest clinic/zone and notifies emergency contact
 */
export async function triggerMedicalSOS(
  driverId: string,
  lat: number,
  lng: number
): Promise<{
  incidentId: string;
  nearestZoneName: string;
  emergencyContactNotified: boolean;
}> {
  // Validate driver exists
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: true },
  });

  if (!driver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  // Find nearest zone by haversine distance
  const zones = await prisma.zone.findMany({
    select: { id: true, name: true, centerLat: true, centerLng: true },
  });

  let nearestZone = zones[0];
  let minDistance = Infinity;

  for (const zone of zones) {
    const distance = calculateHaversineDistance(
      lat,
      lng,
      Number(zone.centerLat),
      Number(zone.centerLng)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestZone = zone;
    }
  }

  // Create incident
  const incidentId = generateId('inc');
  const incident = await prisma.incident.create({
    data: {
      id: incidentId,
      tripId: '', // Medical SOS may not be on a trip - set empty for now, could be updated if on active trip
      incidentType: 'DRIVER_MEDICAL_EMERGENCY',
      reportedBy: driverId,
      reporterRole: 'DRIVER',
      status: 'OPEN',
      severity: 'CRITICAL',
      description: `Medical emergency reported by driver ${driver.user.phone} at GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      geoLat: lat,
      geoLng: lng,
      assignedTo: null,
    },
  });

  // Check if emergency contact exists
  const hasEmergencyContact = !!(driver.emergencyContactName && driver.emergencyContactPhone);

  // Emit event for emergency contact notification and OPS alert
  if (hasEmergencyContact) {
    await prisma.event.create({
      data: {
        id: generateId('evt'),
        eventType: 'DRIVER_MEDICAL_SOS_TRIGGERED',
        aggregateId: driverId,
        aggregateType: 'Driver',
        actorId: driverId,
        actorRole: 'DRIVER',
        strategyVersionId: 'default',
        payload: {
          incidentId,
          emergencyContactName: driver.emergencyContactName,
          emergencyContactPhone: driver.emergencyContactPhone,
          nearestZone: nearestZone.name,
          gpsCoordinates: { lat, lng },
        },
      },
    });
  }

  return {
    incidentId,
    nearestZoneName: nearestZone.name,
    emergencyContactNotified: hasEmergencyContact,
  };
}

/**
 * Get medical SOS incident details
 */
export async function getMedicalSOSIncident(
  incidentId: string
): Promise<Record<string, unknown> | null> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });

  if (!incident || incident.incidentType !== 'DRIVER_MEDICAL_EMERGENCY') {
    return null;
  }

  return incident;
}
