import { prisma } from '@ruit/shared-db';

const logger = {
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  info: (msg: string) => console.info(msg),
};

export const fuelEfficiencyService = {
  /**
   * Log a fuel fill and calculate efficiency/anomalies
   */
  async logFuelFill(params: {
    truckId: string;
    driverId?: string;
    tripId?: string;
    stationName?: string;
    stationLat?: number;
    stationLng?: number;
    litersAdded: number;
    pricePerLiterEtb?: number;
    odometerKm?: number;
    receiptPhotoUrl?: string;
    loggedByDriverApp?: boolean;
    filledAt: Date;
  }): Promise<any> {
    // Step 1: Calculate totalCostEtb if both values provided
    let totalCostEtb: number | undefined;
    if (params.litersAdded && params.pricePerLiterEtb) {
      totalCostEtb = Number(params.litersAdded) * Number(params.pricePerLiterEtb);
    }

    // Step 2: Create FuelLog record
    const fuelLog = await prisma.fuelLog.create({
      data: {
        truckId: params.truckId,
        driverId: params.driverId,
        tripId: params.tripId,
        stationName: params.stationName,
        stationLat: params.stationLat ? parseFloat(params.stationLat.toString()) : null,
        stationLng: params.stationLng ? parseFloat(params.stationLng.toString()) : null,
        litersAdded: parseFloat(params.litersAdded.toString()),
        pricePerLiterEtb: params.pricePerLiterEtb ? parseFloat(params.pricePerLiterEtb.toString()) : null,
        totalCostEtb: totalCostEtb ? totalCostEtb : null,
        odometerKm: params.odometerKm ? parseFloat(params.odometerKm.toString()) : null,
        receiptPhotoUrl: params.receiptPhotoUrl,
        loggedByDriverApp: params.loggedByDriverApp ?? true,
        filledAt: params.filledAt,
      },
    });

    // Step 3: Get or create FuelEfficiencyProfile for this truck
    let profile = await prisma.fuelEfficiencyProfile.findUnique({
      where: { truckId: params.truckId },
    });

    if (!profile) {
      profile = await prisma.fuelEfficiencyProfile.create({
        data: {
          truckId: params.truckId,
          expectedKmPerLiter: 3.5, // Default for Ethiopian medium-haul trucks
          totalFuelLogsCount: 0,
          totalLitersFilled: 0,
          totalKmTracked: 0,
        },
      });
    }

    // Step 4: Update the profile counts
    profile = await prisma.fuelEfficiencyProfile.update({
      where: { truckId: params.truckId },
      data: {
        totalFuelLogsCount: { increment: 1 },
        totalLitersFilled: {
          increment: parseFloat(params.litersAdded.toString()),
        },
        lastCalculatedAt: new Date(),
      },
    });

    // Step 5: Calculate actual km/liter if we have odometer data
    if (params.odometerKm) {
      // Get previous FuelLog (second most recent)
      const previousLog = await prisma.fuelLog.findFirst({
        where: {
          truckId: params.truckId,
          filledAt: {
            lt: params.filledAt,
          },
        },
        orderBy: { filledAt: 'desc' },
      });

      if (previousLog && previousLog.odometerKm) {
        const kmDriven =
          Number(params.odometerKm) - Number(previousLog.odometerKm);
        if (kmDriven > 0) {
          const newTotalKmTracked =
            Number(profile.totalKmTracked) + kmDriven;
          const actualKmPerLiter =
            newTotalKmTracked / Number(profile.totalLitersFilled);

          profile = await prisma.fuelEfficiencyProfile.update({
            where: { truckId: params.truckId },
            data: {
              totalKmTracked: newTotalKmTracked,
              actualKmPerLiter,
            },
          });
        }
      }
    }

    // Step 6: Check for anomaly
    let anomalyDetected = false;
    if (
      profile.actualKmPerLiter &&
      Number(profile.expectedKmPerLiter) > 0
    ) {
      // Load StrategyVersion to get fuelAnomalyThresholdPct
      const strategyVersion = await prisma.strategyVersion.findFirst({
        where: { isActive: true },
        orderBy: { activatedAt: 'desc' },
      });

      const fuelAnomalyThresholdPct = strategyVersion
        ? Number(strategyVersion.fuelAnomalyThresholdPct)
        : 15.0;
      const thresholdPct = fuelAnomalyThresholdPct / 100;

      const expectedEfficiency = Number(profile.expectedKmPerLiter);
      const actualEfficiency = Number(profile.actualKmPerLiter);
      const dropPct =
        (expectedEfficiency - actualEfficiency) / expectedEfficiency;

      if (dropPct > thresholdPct) {
        anomalyDetected = true;

        // Update FuelLog with anomaly info
        await prisma.fuelLog.update({
          where: { id: fuelLog.id },
          data: {
            isAnomalous: true,
            anomalyFlaggedAt: new Date(),
          },
        });

        // Update profile
        profile = await prisma.fuelEfficiencyProfile.update({
          where: { truckId: params.truckId },
          data: {
            anomalyCount: { increment: 1 },
            lastAnomalyAt: new Date(),
          },
        });

        // Alert fleet owner
        await this._alertFleetOwnerAnomaly(
          params.truckId,
          dropPct,
          params.driverId
        );
      }
    }

    return { fuelLog, anomalyDetected, profile };
  },

  /**
   * Alert fleet owner about fuel efficiency anomaly
   */
  async _alertFleetOwnerAnomaly(
    truckId: string,
    dropPct: number,
    driverId?: string
  ): Promise<void> {
    try {
      // Step 1: Load the Truck with fleet owner info
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
        include: {
          fleetOwner: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!truck?.fleetOwner) {
        logger.warn(
          `Truck ${truckId} has no fleet owner, skipping anomaly alert`
        );
        return;
      }

      const plateNumber = truck.plateNumber;
      const fleetOwner = truck.fleetOwner;

      // Get the efficiency profile to include in message
      const profile = await prisma.fuelEfficiencyProfile.findUnique({
        where: { truckId },
      });

      if (!profile) {
        logger.warn(`No efficiency profile for truck ${truckId}`);
        return;
      }

      const expected = Number(profile.expectedKmPerLiter).toFixed(2);
      const actual = Number(profile.actualKmPerLiter).toFixed(2);
      const dropPercentage = (dropPct * 100).toFixed(1);

      // Step 2: Compose alert message (SAFE LANGUAGE: unusual consumption, NOT siphoning)
      const alertMessage = `Fleet Alert: Truck ${plateNumber} has shown unusual fuel consumption pattern. Current efficiency is ${actual}km/liter vs expected ${expected}km/liter (${dropPercentage}% below normal). We recommend scheduling a fuel system inspection.`;

      // Step 3: Log the alert
      logger.warn(alertMessage);

      // TODO: In Prompt 5.1, wire to notification engine to send actual push/SMS to fleet owner
      // For now, log that this would be sent to:
      // FleetOwner: ${fleetOwner.companyName} (${fleetOwner.user.phone})

      // Step 4: Update FuelLog with anomaly notes (via a separate call if needed)
      // Note: The anomalyNotes are set separately when needed
      const sanitizedNotes = `Efficiency ${dropPercentage}% below expected — fleet owner notified for inspection review`;
      await prisma.fuelLog.updateMany({
        where: {
          truckId,
          isAnomalous: true,
          anomalyNotes: null,
        },
        data: {
          anomalyNotes: sanitizedNotes,
        },
      });
    } catch (error) {
      logger.error(
        `Error alerting fleet owner for truck ${truckId}: ${error}`
      );
    }
  },

  /**
   * Get efficiency summary for a single truck
   */
  async getTruckEfficiencySummary(
    truckId: string
  ): Promise<any> {
    // Step 1: Load FuelEfficiencyProfile
    const profile = await prisma.fuelEfficiencyProfile.findUnique({
      where: { truckId },
    });

    // Step 2: Load Truck for plateNumber
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
    });

    // Get last 10 fuel logs
    const recentLogs = await prisma.fuelLog.findMany({
      where: { truckId },
      orderBy: { filledAt: 'desc' },
      take: 10,
    });

    if (!profile || !truck) {
      // Return default if truck or profile not found
      return {
        truckId,
        plateNumber: truck?.plateNumber || 'UNKNOWN',
        expectedKmPerLiter: 3.5,
        actualKmPerLiter: null,
        efficiencyRating: 'NORMAL',
        totalFuelLogsCount: 0,
        totalLitersFilled: 0,
        totalKmTracked: 0,
        anomalyCount: 0,
        lastAnomalyAt: null,
        recentLogs,
      };
    }

    // Step 4: Calculate efficiency rating
    let efficiencyRating:
      | 'EXCELLENT'
      | 'GOOD'
      | 'NORMAL'
      | 'BELOW_NORMAL'
      | 'ANOMALOUS';

    if (profile.actualKmPerLiter === null) {
      efficiencyRating = 'NORMAL'; // Not enough data
    } else {
      const ratio =
        Number(profile.actualKmPerLiter) /
        Number(profile.expectedKmPerLiter);
      if (ratio >= 1.05) {
        efficiencyRating = 'EXCELLENT';
      } else if (ratio >= 0.95) {
        efficiencyRating = 'GOOD';
      } else if (ratio >= 0.85) {
        efficiencyRating = 'NORMAL';
      } else if (ratio >= 0.7) {
        efficiencyRating = 'BELOW_NORMAL';
      } else {
        efficiencyRating = 'ANOMALOUS';
      }
    }

    return {
      truckId,
      plateNumber: truck.plateNumber,
      expectedKmPerLiter: Number(profile.expectedKmPerLiter),
      actualKmPerLiter: profile.actualKmPerLiter
        ? Number(profile.actualKmPerLiter)
        : null,
      efficiencyRating,
      totalFuelLogsCount: profile.totalFuelLogsCount,
      totalLitersFilled: Number(profile.totalLitersFilled),
      totalKmTracked: Number(profile.totalKmTracked),
      anomalyCount: profile.anomalyCount,
      lastAnomalyAt: profile.lastAnomalyAt,
      recentLogs,
    };
  },

  /**
   * Get fleet-wide efficiency summary
   */
  async getFleetEfficiencySummary(
    fleetOwnerId: string
  ): Promise<any> {
    // Step 1: Load all Trucks for this fleetOwnerId
    const trucks = await prisma.truck.findMany({
      where: { fleetOwnerId },
    });

    const totalTrucks = trucks.length;
    let trucksWithData = 0;
    let anomalousTrucks = 0;
    const efficiencyValues: number[] = [];
    const truckBreakdown = [];

    // Step 2: For each truck, load profile and compute metrics
    for (const truck of trucks) {
      const profile = await prisma.fuelEfficiencyProfile.findUnique({
        where: { truckId: truck.id },
      });

      if (!profile) {
        truckBreakdown.push({
          truckId: truck.id,
          plateNumber: truck.plateNumber,
          actualKmPerLiter: null,
          expectedKmPerLiter: 3.5,
          efficiencyRating: 'NORMAL',
          anomalyCount: 0,
        });
      } else {
        if (profile.actualKmPerLiter) {
          trucksWithData++;
          efficiencyValues.push(Number(profile.actualKmPerLiter));
        }

        if (profile.anomalyCount > 0) {
          anomalousTrucks++;
        }

        // Calculate rating
        let efficiencyRating = 'NORMAL';
        if (profile.actualKmPerLiter) {
          const ratio =
            Number(profile.actualKmPerLiter) /
            Number(profile.expectedKmPerLiter);
          if (ratio >= 1.05) {
            efficiencyRating = 'EXCELLENT';
          } else if (ratio >= 0.95) {
            efficiencyRating = 'GOOD';
          } else if (ratio >= 0.85) {
            efficiencyRating = 'NORMAL';
          } else if (ratio >= 0.7) {
            efficiencyRating = 'BELOW_NORMAL';
          } else {
            efficiencyRating = 'ANOMALOUS';
          }
        }

        truckBreakdown.push({
          truckId: truck.id,
          plateNumber: truck.plateNumber,
          actualKmPerLiter: profile.actualKmPerLiter
            ? Number(profile.actualKmPerLiter)
            : null,
          expectedKmPerLiter: Number(profile.expectedKmPerLiter),
          efficiencyRating,
          anomalyCount: profile.anomalyCount,
        });
      }
    }

    // Step 3: Compute average efficiency
    const averageEfficiency =
      efficiencyValues.length > 0
        ? efficiencyValues.reduce((a, b) => a + b, 0) / efficiencyValues.length
        : null;

    return {
      fleetOwnerId,
      totalTrucks,
      trucksWithData,
      anomalousTrucks,
      averageEfficiency,
      trucks: truckBreakdown,
    };
  },
};
