/**
 * Hours of Service (HOS) Enforcement Service
 * 
 * Graduated protocol:
 * - 8 hours: Advisory notification only (no restriction)
 * - 10 hours: Soft prompt (requires acknowledgment tap)
 * - 12 hours: Strong advisory (requires voice-note acknowledgment + fleet owner notified)
 * - 14 hours: New load acceptance blocked (active trips continue uninterrupted)
 * - Active trips NEVER interrupted regardless of hours
 */

import { prisma } from '@ruit/shared-db';

export enum HOSStatus {
  NORMAL = 'NORMAL',                           // < 8 hours
  ADVISORY = 'ADVISORY',                       // 8-10 hours (notification only)
  SOFT_BLOCK = 'SOFT_BLOCK',                   // 10-12 hours (acknowledgment required)
  STRONG_ADVISORY = 'STRONG_ADVISORY',         // 12-14 hours (voice note required)
  NEW_LOAD_BLOCKED = 'NEW_LOAD_BLOCKED',       // >= 14 hours (new load acceptance blocked)
}

interface HOSCheckResult {
  status: HOSStatus;
  hours: number;
  message: string;
  requiresAcknowledgment: boolean;
  requiresVoiceNote: boolean;
  notifyFleetOwner: boolean;
}

/**
 * Get driver's current HOS status based on drivingHoursToday
 */
export async function getDriverHOSStatus(driverId: string): Promise<HOSStatus> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { drivingHoursToday: true }
  });

  if (!driver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  const hours = Number(driver.drivingHoursToday ?? 0);

  if (hours >= 14) return HOSStatus.NEW_LOAD_BLOCKED;
  if (hours >= 12) return HOSStatus.STRONG_ADVISORY;
  if (hours >= 10) return HOSStatus.SOFT_BLOCK;
  if (hours >= 8) return HOSStatus.ADVISORY;
  return HOSStatus.NORMAL;
}

/**
 * Get detailed HOS check result with messages and requirements
 */
export async function checkDriverHOS(driverId: string): Promise<HOSCheckResult> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { drivingHoursToday: true }
  });

  if (!driver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  const hours = Number(driver.drivingHoursToday ?? 0);
  let status: HOSStatus;
  let message: string;
  let requiresAcknowledgment = false;
  let requiresVoiceNote = false;
  let notifyFleetOwner = false;

  if (hours >= 14) {
    status = HOSStatus.NEW_LOAD_BLOCKED;
    message = 'ድራይቭ ሰአት ገደብ ሞክቷል - አዲስ ሸክም አይቀበልም';
  } else if (hours >= 12) {
    status = HOSStatus.STRONG_ADVISORY;
    message = 'ልብ ወለድ - ወደ 14 ሰአት በቀረበ ሰአት። ድምጽ ማስታወሻ ያስፈልጋል';
    requiresVoiceNote = true;
    notifyFleetOwner = true;
  } else if (hours >= 10) {
    status = HOSStatus.SOFT_BLOCK;
    message = 'ልብ ወለድ - 10-12 ሰአት ውስጥ። ታውቅ ያስፈልጋል';
    requiresAcknowledgment = true;
  } else if (hours >= 8) {
    status = HOSStatus.ADVISORY;
    message = 'ልብ ወለድ - 8 ሰአት ድራይቭ። ይሞክሩ ማረቋቀስ';
  } else {
    status = HOSStatus.NORMAL;
    message = 'ሰአት አሰራር መደበኛ';
  }

  return {
    status,
    hours,
    message,
    requiresAcknowledgment,
    requiresVoiceNote,
    notifyFleetOwner
  };
}

/**
 * Check if driver can accept a NEW load
 * Returns true for NORMAL, ADVISORY, SOFT_BLOCK, STRONG_ADVISORY
 * Returns false ONLY for NEW_LOAD_BLOCKED
 * Note: Active trips continue uninterrupted regardless of HOS status
 */
export async function canDriverAcceptNewLoad(driverId: string): Promise<boolean> {
  const status = await getDriverHOSStatus(driverId);
  // Only block acceptance at NEW_LOAD_BLOCKED status
  return status !== HOSStatus.NEW_LOAD_BLOCKED;
}

/**
 * Log HOS acknowledgment when driver acknowledges soft block
 */
export async function logHOSAcknowledgment(
  driverId: string,
  hosStatus: HOSStatus,
  acknowledgmentType: 'TAP' | 'VOICE_NOTE',
  voiceNoteS3Key?: string
): Promise<void> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { userId: true }
  });

  if (!driver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  // Create event record for audit trail
  const { ulid } = await import('ulid');
  const strategyId = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  }).then((s: { id?: string } | null) => s?.id ?? 'str_default');

  await prisma.event.create({
    data: {
      id: `evt_${ulid()}`,
      eventType: 'HOS_ACKNOWLEDGMENT',
      aggregateId: driverId,
      aggregateType: 'DRIVER',
      actorId: driver.userId,
      actorRole: 'DRIVER',
      strategyVersionId: strategyId,
      payload: {
        hosStatus,
        acknowledgmentType,
        voiceNoteS3Key: voiceNoteS3Key || null,
        acknowledgedAt: new Date().toISOString()
      } as any,
      metadata: {
        source: 'HOS_CHECK',
        timestamp: new Date().toISOString()
      } as any
    }
  });
}

/**
 * Reset driver's drivingHoursToday after minimum rest
 * Called by daily reset worker or manual reset endpoint
 */
export async function resetDrivingHours(driverId: string): Promise<void> {
  await prisma.driver.update({
    where: { id: driverId },
    data: {
      drivingHoursToday: 0,
      lastDrivingHoursReset: new Date()
    }
  });
}

/**
 * Increment driving hours when tracking trip progress
 * Called periodically during active trips
 */
export async function incrementDrivingHours(
  driverId: string,
  hoursToAdd: number
): Promise<number> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { drivingHoursToday: true }
  });

  if (!driver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  const newHours = Number(driver.drivingHoursToday ?? 0) + hoursToAdd;

  await prisma.driver.update({
    where: { id: driverId },
    data: { drivingHoursToday: newHours }
  });

  return newHours;
}
