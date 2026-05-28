/**
 * Phase 10: Cold Chain Tracking Service
 * Temperature logging, excursion detection, compliance certificate generation
 */

import 'dotenv/config';
import { prisma, generateId, requiresColdChain, isTemperatureInRange, getColdChainTempRange, getColdChainExcursionTolerance, buildRainySeasonWarning } from '@ruit/shared-db';
import { Prisma } from '@prisma/client';

// Helper to emit events
async function emitColdChainEvent(eventType: string, aggregateId: string, payload: Record<string, any>): Promise<void> {
  try {
    const strategyId = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
      select: { id: true }
    }).then((s: { id: string } | null) => s?.id ?? 'str_default');

    await prisma.event.create({
      data: {
        id: generateId('evt'),
        eventType,
        aggregateId,
        aggregateType: 'COLD_CHAIN_INCIDENT',
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        strategyVersionId: strategyId,
        payload: payload as any,
        metadata: { source: 'ColdChainService', timestamp: new Date().toISOString() } as any
      }
    });
  } catch (error) {
    console.error('Failed to emit cold chain event:', error);
  }
}

export interface TemperatureLogInput {
  tripId: string;
  checkpointId?: string;
  temperatureCelsius: number;
  cargoType: string;
  recordedAt?: Date;
}

export interface TemperatureLogResult {
  success: boolean;
  data?: {
    logId: string;
    tripId: string;
    temperatureCelsius: number;
    isExcursion: boolean;
    excursionAlertSent: boolean;
    recordedAt: Date;
  };
  error?: { code: string; message: string };
}

export interface ColdChainCertificate {
  tripId: string;
  cargoType: string;
  logs: Array<{
    temperatureCelsius: number;
    recordedAt: Date;
    isExcursion: boolean;
  }>;
  compliance: {
    compliantTimePct: number;
    totalExcursionMinutes: number;
    worstDeviationCelsius: number;
    temperatureRange: { min: number; max: number };
  };
  generatedAt: Date;
}

/**
 * Log temperature reading for a trip
 */
export async function logTemperature(input: TemperatureLogInput): Promise<TemperatureLogResult> {
  try {
    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: input.tripId },
      include: { load: true },
    });

    if (!trip) {
      return { success: false, error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' } };
    }

    // Verify cargo type requires cold chain
    if (!requiresColdChain(input.cargoType)) {
      return {
        success: false,
        error: { code: 'NOT_COLD_CHAIN_CARGO', message: 'Cargo type does not require cold chain tracking' },
      };
    }

    // Check if temperature is within acceptable range
    const isExcursion = !(await isTemperatureInRange(input.temperatureCelsius, input.cargoType));

    // Check for sustained excursion (previous log was also excursion)
    let excursionAlertSent = false;
    if (isExcursion) {
      const previousLog = await prisma.coldChainLog.findFirst({
        where: { tripId: input.tripId },
        orderBy: { recordedAt: 'desc' },
      });

      if (previousLog?.isExcursion) {
        const toleranceMin = await getColdChainExcursionTolerance();
        const timeDiff = (input.recordedAt?.getTime() || Date.now()) - previousLog.recordedAt.getTime();
        const diffMinutes = timeDiff / (1000 * 60);

        if (diffMinutes > toleranceMin) {
          // Create incident and notify
          const incident = await prisma.incident.create({
            data: {
              id: generateId('inc'),
              tripId: input.tripId,
              incidentType: 'CARGO_DAMAGE',
              reportedBy: 'SYSTEM',
              reporterRole: 'SYSTEM',
              severity: 'HIGH',
              description: `Cold chain excursion sustained for ${Math.round(diffMinutes)} minutes. Temperature: ${input.temperatureCelsius}°C`,
              status: 'OPEN',
            },
          });

          // Emit notification event for orderer
          const load = trip.load;
          if (load) {
            await emitColdChainEvent('COLD_CHAIN_EXCURSION_INCIDENT', incident.id, {
              tripId: input.tripId,
              loadId: load.id,
              ordererId: load.ordererId,
              temperatureCelsius: input.temperatureCelsius,
              excursionDurationMinutes: Math.round(diffMinutes),
              incidentId: incident.id
            });
          }
          excursionAlertSent = true;
        }
      }
    }

    // Create temperature log
    const log = await prisma.coldChainLog.create({
      data: {
        id: generateId('ccl'),
        tripId: input.tripId,
        checkpointId: input.checkpointId,
        temperatureCelsius: input.temperatureCelsius,
        cargoType: input.cargoType,
        recordedAt: input.recordedAt || new Date(),
        isExcursion,
        excursionAlertSent,
      },
    });

    return {
      success: true,
      data: {
        logId: log.id,
        tripId: log.tripId,
        temperatureCelsius: log.temperatureCelsius,
        isExcursion: log.isExcursion,
        excursionAlertSent: log.excursionAlertSent,
        recordedAt: log.recordedAt,
      },
    };
  } catch (error) {
    console.error('Error logging temperature:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to log temperature' },
    };
  }
}

/**
 * Get all temperature logs for a trip
 */
export async function getTemperatureLogs(tripId: string) {
  const logs = await prisma.coldChainLog.findMany({
    where: { tripId },
    orderBy: { recordedAt: 'asc' },
  });

  return logs;
}

/**
 * Generate cold chain compliance certificate
 */
export async function generateColdChainCertificate(tripId: string): Promise<{
  success: boolean;
  data?: ColdChainCertificate;
  error?: { code: string; message: string };
}> {
  try {
    // Get trip info
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { load: true },
    });

    if (!trip) {
      return { success: false, error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' } };
    }

    if (!trip.load) {
      return { success: false, error: { code: 'LOAD_NOT_FOUND', message: 'Load not found for trip' } };
    }

    const cargoType = trip.load.cargoType;
    if (!requiresColdChain(cargoType)) {
      return {
        success: false,
        error: { code: 'NOT_COLD_CHAIN_CARGO', message: 'Trip does not require cold chain tracking' },
      };
    }

    // Get all logs
    const logs = await getTemperatureLogs(tripId);

    if (logs.length === 0) {
      return { success: false, error: { code: 'NO_LOGS_FOUND', message: 'No temperature logs found for trip' } };
    }

    // Get acceptable range
    const tempRange = await getColdChainTempRange(cargoType);
    if (!tempRange) {
      return { success: false, error: { code: 'TEMP_RANGE_NOT_FOUND', message: 'Temperature range not configured' } };
    }

    // Calculate compliance metrics
    const totalLogs = logs.length;
    const excursionLogs = logs.filter(l => l.isExcursion);
    const compliantLogs = totalLogs - excursionLogs.length;
    const compliantTimePct = totalLogs > 0 ? (compliantLogs / totalLogs) * 100 : 0;

    // Calculate total excursion duration
    let totalExcursionMinutes = 0;
    let worstDeviationCelsius = 0;

    for (const log of logs) {
      if (log.isExcursion) {
        // Calculate deviation from nearest acceptable boundary
        const deviation = log.temperatureCelsius < tempRange.min
          ? tempRange.min - log.temperatureCelsius
          : log.temperatureCelsius - tempRange.max;
        worstDeviationCelsius = Math.max(worstDeviationCelsius, deviation);

        // Add approximate duration (assuming logs every 30 min)
        totalExcursionMinutes += 30;
      }
    }

    const certificate: ColdChainCertificate = {
      tripId,
      cargoType,
      logs: logs.map(l => ({
        temperatureCelsius: l.temperatureCelsius,
        recordedAt: l.recordedAt,
        isExcursion: l.isExcursion,
      })),
      compliance: {
        compliantTimePct: Math.round(compliantTimePct * 100) / 100,
        totalExcursionMinutes,
        worstDeviationCelsius: Math.round(worstDeviationCelsius * 100) / 100,
        temperatureRange: tempRange,
      },
      generatedAt: new Date(),
    };

    return { success: true, data: certificate };
  } catch (error) {
    console.error('Error generating certificate:', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate certificate' },
    };
  }
}