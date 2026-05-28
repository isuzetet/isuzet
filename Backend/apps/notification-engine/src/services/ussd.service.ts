import 'dotenv/config';
import { prisma, generateId, getConfig } from '@ruit/shared-db';

export interface UssdRequest {
  sessionId: string;
  phoneNumber: string;
  text: string;
  serviceCode?: string;
}

export interface UssdResponse {
  response: string;
  endSession: boolean;
}

/**
 * USSD Session Management and Menu Handler
 * Supports all 5 flows:
 * 1. My Loads - view active/pending loads
 * 2. Report Location - report current zone
 * 3. Confirm Delivery - OTP confirmation
 * 4. SOS - emergency alert
 * 5. Fuel Report - fuel station reports
 */

async function getOrCreateSession(sessionId: string, phoneNumber: string) {
  let session = await prisma.ussdSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    session = await prisma.ussdSession.create({
      data: {
        id: generateId('ussd'),
        sessionId,
        phoneNumber,
        state: 'MAIN_MENU',
        expiresAt,
        data: {},
      },
    });
  }

  return session;
}

async function updateSessionState(sessionId: string, state: string, data?: any) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  return prisma.ussdSession.update({
    where: { sessionId },
    data: {
      state,
      data: data || {},
      expiresAt,
    },
  });
}

async function findDriverByPhone(phoneNumber: string) {
  const user = await prisma.user.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) return null;

  return prisma.driver.findUnique({
    where: { userId: user.id },
  });
}

async function findOrdererByPhone(phoneNumber: string) {
  const user = await prisma.user.findUnique({
    where: { phone: phoneNumber },
  });

  if (!user) return null;

  return prisma.orderer.findUnique({
    where: { userId: user.id },
  });
}

// MENU FLOW 1: My Loads
async function handleMyLoads(session: any, input: string): Promise<UssdResponse> {
  const driver = await findDriverByPhone(session.phoneNumber);
  if (!driver) {
    return {
      response: 'END You are not registered as a driver. Please download the ISUZET app.',
      endSession: true,
    };
  }

  const parts = input.split('*');
  const selection = parts[parts.length - 1];

  if (!selection || selection === '1') {
    // Show loads menu
    const loads = await prisma.load.findMany({
      where: {
        trips: {
          some: {
            driverId: driver.id,
            status: { in: ['PENDING', 'IN_TRANSIT'] },
          },
        },
      },
      take: 3,
      orderBy: { pickupDate: 'asc' },
    });

    if (loads.length === 0) {
      return {
        response: 'END No active loads. Check back later for new offers.',
        endSession: true,
      };
    }

    let response = 'CON Your active loads:\n';
    loads.forEach((load, idx) => {
      response += `${idx + 1}. ${load.originCity}→${load.destinationCity} ${load.weightKg}kg\n`;
    });
    response += '0. Back';

    await updateSessionState(session.sessionId, 'MY_LOADS_SELECT', {
      loadIds: loads.map((l) => l.id),
    });

    return { response, endSession: false };
  } else if (selection === '0') {
    return handleMainMenu(session);
  } else {
    const loadIdx = parseInt(selection) - 1;
    const loadIds = session.data?.loadIds || [];

    if (loadIdx < 0 || loadIdx >= loadIds.length) {
      return {
        response: 'END Invalid selection. Please try again.',
        endSession: true,
      };
    }

    const load = await prisma.load.findUnique({
      where: { id: loadIds[loadIdx] },
    });

    if (!load) {
      return {
        response: 'END Load not found. Please try again.',
        endSession: true,
      };
    }

    const response =
      `CON ${load.originCity}→${load.destinationCity}\n` +
      `Weight: ${load.weightKg}kg\n` +
      `Pickup: ${load.pickupDate.toLocaleDateString()}\n` +
      `1. Accept  2. Reject  0. Back`;

    await updateSessionState(session.sessionId, 'MY_LOADS_DETAIL', {
      selectedLoadId: load.id,
    });

    return { response, endSession: false };
  }
}

// MENU FLOW 2: Report Location
async function handleReportLocation(session: any, input: string): Promise<UssdResponse> {
  const driver = await findDriverByPhone(session.phoneNumber);
  if (!driver) {
    return {
      response: 'END Driver not registered.',
      endSession: true,
    };
  }

  const parts = input.split('*');
  const selection = parts[parts.length - 1];

  if (!selection || selection === '2') {
    const response =
      'CON Enter zone code:\n' +
      '1. Addis Ababa\n' +
      '2. Adama\n' +
      '3. Hawassa\n' +
      '4. Bahir Dar\n' +
      '0. Cancel';

    await updateSessionState(session.sessionId, 'LOCATION_SELECT');
    return { response, endSession: false };
  } else if (selection === '0') {
    return handleMainMenu(session);
  } else {
    const zoneCode = selection;
    await prisma.locationPing.create({
      data: {
        id: generateId('ping'),
        tripId: 'USSD_MANUAL', // No active trip
        driverId: driver.id,
        lat: 0,
        lng: 0,
        source: 'USSD_MANUAL',
        isOfflineSync: true,
      },
    });

    return {
      response: 'END Location updated successfully.',
      endSession: true,
    };
  }
}

// MENU FLOW 3: Confirm Delivery
async function handleConfirmDelivery(session: any, input: string): Promise<UssdResponse> {
  const driver = await findDriverByPhone(session.phoneNumber);
  if (!driver) {
    return {
      response: 'END Driver not registered.',
      endSession: true,
    };
  }

  const parts = input.split('*');
  const selection = parts[parts.length - 1];

  if (!selection || selection === '3') {
    // Find driver's current active trip
    const trip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: 'IN_TRANSIT',
      },
      include: {
        stops: {
          where: { status: 'PENDING' },
          take: 1,
        },
      },
    });

    if (!trip || !trip.stops.length) {
      return {
        response: 'END No pending deliveries. Complete your current trip.',
        endSession: true,
      };
    }

    const stop = trip.stops[0];
    const response =
      `CON Confirm delivery:\n` +
      `Stop: ${stop.locationName}\n` +
      `Enter OTP (4 digits):`;

    await updateSessionState(session.sessionId, 'DELIVERY_OTP', {
      tripId: trip.id,
      stopId: stop.id,
    });

    return { response, endSession: false };
  } else if (selection === '0') {
    return handleMainMenu(session);
  } else {
    const otp = selection;
    const tripId = session.data?.tripId;
    const stopId = session.data?.stopId;

    if (!tripId || !stopId) {
      return {
        response: 'END Session expired. Please try again.',
        endSession: true,
      };
    }

    // Simple OTP validation (in production, compare with sent OTP)
    if (otp.length !== 4 || !/^\d+$/.test(otp)) {
      return {
        response: 'CON Invalid OTP. Please enter 4 digits:',
        endSession: false,
      };
    }

    // Mark stop as completed
    await prisma.tripStop.update({
      where: { id: stopId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return {
      response: 'END Delivery confirmed. Payment processing.',
      endSession: true,
    };
  }
}

// MENU FLOW 4: SOS
async function handleSOS(session: any): Promise<UssdResponse> {
  const driver = await findDriverByPhone(session.phoneNumber);
  if (!driver) {
    return {
      response: 'END Driver not registered.',
      endSession: true,
    };
  }

  // Create emergency incident
  const activeTrip = await prisma.trip.findFirst({
    where: {
      driverId: driver.id,
      status: { in: ['PENDING', 'IN_TRANSIT'] },
    },
  });

  if (activeTrip) {
    await prisma.incident.create({
      data: {
        id: generateId('inc'),
        tripId: activeTrip.id,
        incidentType: 'SOS_EMERGENCY',
        reportedBy: driver.userId || 'UNKNOWN',
        reporterRole: 'DRIVER',
        status: 'OPEN',
        severity: 'CRITICAL',
        description: 'SOS triggered via USSD',
        geoLat: driver.currentLat || undefined,
        geoLng: driver.currentLng || undefined,
      },
    });
  }

  return {
    response: 'END SOS received. OPS team notified. Stay safe.',
    endSession: true,
  };
}

// MENU FLOW 5: Fuel Report
async function handleFuelReport(session: any, input: string): Promise<UssdResponse> {
  const parts = input.split('*');
  const selection = parts[parts.length - 1];

  if (!selection || selection === '5') {
    const response = 'CON Enter station name (short):';
    await updateSessionState(session.sessionId, 'FUEL_STATION');
    return { response, endSession: false };
  } else if (selection === '0') {
    return handleMainMenu(session);
  }

  const state = session.state;

  if (state === 'FUEL_STATION') {
    const stationName = selection;
    const response = 'CON Enter diesel price (ETB, e.g. 75):';
    await updateSessionState(session.sessionId, 'FUEL_PRICE', { stationName });
    return { response, endSession: false };
  }

  if (state === 'FUEL_PRICE') {
    const price = parseInt(selection);
    if (isNaN(price) || price < 10 || price > 500) {
      return {
        response: 'CON Invalid price. Enter between 10 and 500:',
        endSession: false,
      };
    }

    const response =
      'CON Availability?\n' +
      '1. Full\n' +
      '2. Limited\n' +
      '3. Queue > 1h\n' +
      '4. Empty';

    await updateSessionState(session.sessionId, 'FUEL_AVAILABILITY', {
      stationName: session.data?.stationName,
      price,
    });

    return { response, endSession: false };
  }

  if (state === 'FUEL_AVAILABILITY') {
    const availabilityCode = selection;
    const availability = ['Full', 'Limited', 'Queue>1h', 'Empty'][parseInt(availabilityCode) - 1];

    if (!availability) {
      return {
        response: 'CON Invalid selection. Choose 1-4:',
        endSession: false,
      };
    }

    // Create fuel report
    await prisma.fuelPriceSnapshot.create({
      data: {
        id: generateId('fuel'),
        dieselPriceEtbPerLiter: new Prisma.Decimal(session.data?.price || 0),
        region: 'USSD_REPORT',
        source: 'DRIVER_REPORT',
        reportedByDriverId: (await findDriverByPhone(session.phoneNumber))?.id,
      },
    });

    return {
      response: 'END Fuel report saved. ETB 500 bonus when verified.',
      endSession: true,
    };
  }

  return handleMainMenu(session);
}

// MENU FLOW 6: Report Road Alert
async function handleReportRoadAlert(session: any, input: string): Promise<UssdResponse> {
  const driver = await findDriverByPhone(session.phoneNumber);
  if (!driver) {
    return {
      response: 'END Driver not registered.',
      endSession: true,
    };
  }

  const parts = input.split('*');
  const selection = parts[parts.length - 1];

  if (!selection || selection === '6') {
    // Show alert type options
    const response =
      'CON Select alert type:\n' +
      '1. Police checkpoint\n' +
      '2. Road damage\n' +
      '3. Flooding\n' +
      '4. Fuel shortage\n' +
      '5. Security\n' +
      '0. Cancel';

    await updateSessionState(session.sessionId, 'ROAD_ALERT_TYPE');
    return { response, endSession: false };
  } else if (selection === '0') {
    return handleMainMenu(session);
  }

  const state = session.state;

  if (state === 'ROAD_ALERT_TYPE') {
    const alertTypeMap: { [key: string]: string } = {
      '1': 'POLICE_CHECKPOINT',
      '2': 'ROAD_DAMAGE',
      '3': 'FLOODING',
      '4': 'FUEL_SHORTAGE',
      '5': 'SECURITY',
    };

    const alertType = alertTypeMap[selection];
    if (!alertType) {
      return {
        response: 'CON Invalid selection. Choose 1-5:\n' +
          '1. Police checkpoint\n' +
          '2. Road damage\n' +
          '3. Flooding\n' +
          '4. Fuel shortage\n' +
          '5. Security',
        endSession: false,
      };
    }

    const response =
      'CON Enter severity:\n' +
      '1. Normal\n' +
      '2. High\n' +
      '3. Critical';

    await updateSessionState(session.sessionId, 'ROAD_ALERT_SEVERITY', {
      alertType,
    });

    return { response, endSession: false };
  }

  if (state === 'ROAD_ALERT_SEVERITY') {
    const severityMap: { [key: string]: string } = {
      '1': 'LOW',
      '2': 'HIGH',
      '3': 'CRITICAL',
    };

    const severity = severityMap[selection];
    if (!severity) {
      return {
        response: 'CON Invalid selection. Choose 1-3:\n' +
          '1. Normal\n' +
          '2. High\n' +
          '3. Critical',
        endSession: false,
      };
    }

    const alertType = session.data?.alertType || 'UNKNOWN';

    // Create road alert
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hour expiry
    await prisma.roadAlert.create({
      data: {
        id: generateId('alert'),
        alertType,
        severity,
        lat: driver.currentLat || new Prisma.Decimal(0),
        lng: driver.currentLng || new Prisma.Decimal(0),
        description: `Road alert reported via USSD by driver`,
        reportedByUserId: driver.userId,
        reportedByRole: 'DRIVER',
        source: 'USSD_REPORT',
        expiresAt,
        isVerified: false,
        verificationCount: 0,
      },
    });

    return {
      response: 'END Report submitted. Thank you.\nVerification bonus: 200 ETB if confirmed by 2 drivers.',
      endSession: true,
    };
  }

  return handleMainMenu(session);
}

// MENU FLOW 7: Market Rate Benchmark
async function handleMarketRate(session: any, input: string): Promise<UssdResponse> {
  const parts = input.split('*');
  const selection = parts[parts.length - 1];

  if (!selection || selection === '7') {
    const response = 'CON Enter origin city (e.g., Addis):';
    await updateSessionState(session.sessionId, 'MARKET_RATE_ORIGIN');
    return { response, endSession: false };
  } else if (selection === '0') {
    return handleMainMenu(session);
  }

  const state = session.state;

  if (state === 'MARKET_RATE_ORIGIN') {
    const originCity = selection.trim();
    if (!originCity || originCity.length < 2) {
      return {
        response: 'CON Enter valid origin city:',
        endSession: false,
      };
    }

    const response = 'CON Enter destination city (e.g., Hawassa):';
    await updateSessionState(session.sessionId, 'MARKET_RATE_DESTINATION', {
      originCity,
    });

    return { response, endSession: false };
  }

  if (state === 'MARKET_RATE_DESTINATION') {
    const originCity = session.data?.originCity || '';
    const destinationCity = selection.trim();

    if (!destinationCity || destinationCity.length < 2) {
      return {
        response: 'CON Enter valid destination city:',
        endSession: false,
      };
    }

    const response =
      'CON Select cargo type:\n' +
      '1. Grain\n' +
      '2. Coffee\n' +
      '3. Livestock\n' +
      '4. General';

    await updateSessionState(session.sessionId, 'MARKET_RATE_CARGO', {
      originCity,
      destinationCity,
    });

    return { response, endSession: false };
  }

  if (state === 'MARKET_RATE_CARGO') {
    const cargoTypeMap: { [key: string]: string } = {
      '1': 'GRAIN',
      '2': 'COFFEE',
      '3': 'LIVESTOCK',
      '4': 'GENERAL',
    };

    const cargoType = cargoTypeMap[selection];
    if (!cargoType) {
      return {
        response: 'CON Invalid selection. Choose 1-4:\n' +
          '1. Grain\n' +
          '2. Coffee\n' +
          '3. Livestock\n' +
          '4. General',
        endSession: false,
      };
    }

    const originCity = session.data?.originCity || '';
    const destinationCity = session.data?.destinationCity || '';

    // Query recent completed trips for this corridor and cargo type
    const recentTrips = await prisma.load.findMany({
      where: {
        originCity: {
          contains: originCity,
          mode: 'insensitive',
        },
        destinationCity: {
          contains: destinationCity,
          mode: 'insensitive',
        },
        cargoType: {
          contains: cargoType,
          mode: 'insensitive',
        },
        trips: {
          some: {
            status: 'COMPLETED',
            actualDeliveryAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
      select: {
        finalRateEtb: true,
        weightKg: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentTrips.length === 0) {
      return {
        response: `END No recent rates found for ${originCity}→${destinationCity} ${cargoType}. Try other route.`,
        endSession: true,
      };
    }

    // Calculate min-max rate (per quintal = 100kg)
    const rates = recentTrips
      .filter(t => t.finalRateEtb && t.weightKg)
      .map(t => {
        const ratePerQuintal = (t.finalRateEtb!.toNumber() / (t.weightKg! / 100));
        return ratePerQuintal;
      });

    if (rates.length === 0) {
      return {
        response: `END No rated data available for ${originCity}→${destinationCity}.`,
        endSession: true,
      };
    }

    const minRate = Math.floor(Math.min(...rates));
    const maxRate = Math.ceil(Math.max(...rates));
    const tripCount = recentTrips.length;

    return {
      response: `END Rate: ${minRate}-${maxRate} ETB/quintal\n(Based on ${tripCount} recent trips)`,
      endSession: true,
    };
  }

  return handleMainMenu(session);
}

// MAIN MENU
async function handleMainMenu(session: any): Promise<UssdResponse> {
  const response =
    'CON ISUZET Loads Platform\n' +
    '1. My Loads\n' +
    '2. Report Location\n' +
    '3. Confirm Delivery\n' +
    '4. SOS\n' +
    '5. Fuel Report\n' +
    '6. Report Road Alert\n' +
    '7. Market Rate\n' +
    '0. Exit';

  await updateSessionState(session.sessionId, 'MAIN_MENU');
  return { response, endSession: false };
}

/**
 * Main USSD handler - routes to appropriate menu based on state and input
 */
export async function handleUssdCallback(request: UssdRequest): Promise<UssdResponse> {
  const session = await getOrCreateSession(request.sessionId, request.phoneNumber);
  const input = request.text || '';

  // Parse input: "1*2*3" means selected 1, then 2, then 3
  const parts = input.split('*');
  const mainSelection = parts[0] || '';

  if (!input) {
    // Initial request
    return handleMainMenu(session);
  }

  // Route based on main menu selection or current state
  if (mainSelection === '1' || session.state.startsWith('MY_LOADS')) {
    return handleMyLoads(session, input);
  } else if (mainSelection === '2' || session.state.startsWith('LOCATION')) {
    return handleReportLocation(session, input);
  } else if (mainSelection === '3' || session.state.startsWith('DELIVERY')) {
    return handleConfirmDelivery(session, input);
  } else if (mainSelection === '4') {
    return handleSOS(session);
  } else if (mainSelection === '5' || session.state.startsWith('FUEL')) {
    return handleFuelReport(session, input);
  } else if (mainSelection === '6' || session.state.startsWith('ROAD_ALERT')) {
    return handleReportRoadAlert(session, input);
  } else if (mainSelection === '7' || session.state.startsWith('MARKET_RATE')) {
    return handleMarketRate(session, input);
  } else if (mainSelection === '0') {
    return {
      response: 'END Thank you for using ISUZET. Goodbye.',
      endSession: true,
    };
  }

  return handleMainMenu(session);
}

// Import Prisma for Decimal type
import { Prisma } from '@prisma/client';
