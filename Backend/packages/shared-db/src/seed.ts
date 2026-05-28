import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generateId } from './index.js';
import { DEFAULT_CONFIG, invalidateConfigCache } from './config.js';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  await seedSuperAdmin();
  await seedStrategyConfig();
  const zoneMap = await seedZones();
  await seedCorridors(zoneMap);
  await seedMarketDays(zoneMap);
  await seedSecurityZones(zoneMap);
  await seedSeasonalMultipliers(zoneMap);
  await seedExistingData(zoneMap);
  await seedDefaultStrategy();
  await seedPaymentRails();
  invalidateConfigCache();
  console.log('✅ Seed completed successfully. Config cache invalidated.');
}

async function seedSuperAdmin(): Promise<void> {
  await prisma.user.upsert({
    where: { id: 'usr_super_admin_001' },
    update: {},
    create: {
      id: 'usr_super_admin_001',
      phone: '+251911000001',
      fullName: 'Ruit Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      kycTier: 3,
      email: 'anteneh_getachew@yahoo.com',
      preferredLanguage: 'en',
      notificationChannel: 'SMS',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function seedStrategyConfig(): Promise<void> {
  await prisma.strategyVersion.upsert({
    where: { id: 'sv_phase1_growth' },
    update: {},
    create: {
      id: 'sv_phase1_growth',
      versionName: 'Phase 1 — Growth Mode',
      optimizationMode: 'GROWTH',
      scope: 'GLOBAL',
      weightSet: {
        urgency: 0.20,
        corridorDensity: 0.15,
        backhaul: 0.10,
        margin: 0.20,
        driverTrust: 0.15,
        fleetTrust: 0.10,
        liquidityDelta: 0.08,
        subsidy: 0.02,
        marketDayProximity: 0.12,
      },
      thresholdSet: { trust_minimum: 0.3 },
      pricingParams: {
        negotiation_band: [0.92, 1.15],
        marketDayDemandBoostPct: 8,
        marketDayPricePremiumPct: 7,
      },
      acceptanceWindowMinutes: 15,
      maxAssignmentAttempts: 5,
      isActive: true,
      createdBy: 'usr_super_admin_001',
      activatedAt: new Date(),
    },
  });
}

function calcBoundingBox(centerLat: number, centerLng: number, radiusKm: number) {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((centerLat * Math.PI) / 180);
  const latDelta = radiusKm / kmPerDegLat;
  const lngDelta = radiusKm / kmPerDegLng;
  return {
    northLat: centerLat + latDelta,
    southLat: centerLat - latDelta,
    eastLng: centerLng + lngDelta,
    westLng: centerLng - lngDelta,
  };
}

const ZONES = [
  { name: 'Addis Ababa', nameAmharic: 'አዲስ አበባ', centerLat: 9.0401, centerLng: 38.7636, radiusKm: 30 },
  { name: 'Adama', nameAmharic: 'አዳማ', centerLat: 8.55, centerLng: 39.27, radiusKm: 25 },
  { name: 'Bahir Dar', nameAmharic: 'ባሕር ዳር', centerLat: 11.5742, centerLng: 37.3614, radiusKm: 25 },
  { name: 'Mekele', nameAmharic: 'መቐለ', centerLat: 13.4956, centerLng: 39.4763, radiusKm: 25 },
  { name: 'Hawassa', nameAmharic: 'ሀዋሳ', centerLat: 7.05, centerLng: 38.47, radiusKm: 25 },
  { name: 'Jimma', nameAmharic: 'ጅማ', centerLat: 7.6739, centerLng: 36.8344, radiusKm: 25 },
  { name: 'Dire Dawa', nameAmharic: 'ድሬዳዋ', centerLat: 9.5931, centerLng: 41.8661, radiusKm: 25 },
  { name: 'Dessie', nameAmharic: 'ደሴ', centerLat: 11.1342, centerLng: 39.6354, radiusKm: 20 },
  { name: 'Shashemene', nameAmharic: 'ሻሸመኔ', centerLat: 7.2000, centerLng: 38.5833, radiusKm: 20 },
  { name: 'Debre Birhan', nameAmharic: 'ደበረ ብርሃን', centerLat: 9.6800, centerLng: 39.5333, radiusKm: 20 },
  { name: 'Kombolcha', nameAmharic: 'ኮምቦልቻ', centerLat: 11.0833, centerLng: 39.7333, radiusKm: 18 },
  { name: 'Nekemte', nameAmharic: 'ነቀምቴ', centerLat: 9.0833, centerLng: 36.5000, radiusKm: 20 },
  { name: 'Ambo', nameAmharic: 'አምቦ', centerLat: 8.9833, centerLng: 37.8500, radiusKm: 18 },
  { name: 'Wolkite', nameAmharic: 'ወልቂጤ', centerLat: 8.2833, centerLng: 37.7833, radiusKm: 18 },
  { name: 'Ziway', nameAmharic: 'ይዋይ', centerLat: 7.9333, centerLng: 38.7167, radiusKm: 18 },
  { name: 'Meki', nameAmharic: 'መኪ', centerLat: 8.1500, centerLng: 38.8000, radiusKm: 15 },
  { name: 'Debre Markos', nameAmharic: 'ደበረ መርቆስ', centerLat: 10.3500, centerLng: 37.7167, radiusKm: 18 },
  { name: 'Gondar', nameAmharic: 'ጎንደር', centerLat: 12.6000, centerLng: 37.4667, radiusKm: 25 },
  { name: 'Asella', nameAmharic: 'አሰላ', centerLat: 7.9500, centerLng: 39.1333, radiusKm: 18 },
  { name: 'Sodo', nameAmharic: 'ሶዶ', centerLat: 6.8500, centerLng: 37.7500, radiusKm: 18 },
  { name: 'Arba Minch', nameAmharic: 'አርባ ምንጭ', centerLat: 6.0333, centerLng: 37.5500, radiusKm: 20 },
  { name: 'Jijiga', nameAmharic: 'ጅጅጋ', centerLat: 9.3500, centerLng: 42.8000, radiusKm: 20 },
  { name: 'Harar', nameAmharic: 'ሀረር', centerLat: 9.3100, centerLng: 42.1200, radiusKm: 20 },
  { name: 'Dilla', nameAmharic: 'ዲላ', centerLat: 6.4167, centerLng: 38.3167, radiusKm: 15 },
  { name: 'Yirgalem', nameAmharic: 'ይርጋለም', centerLat: 6.7500, centerLng: 38.4000, radiusKm: 15 },
  { name: 'Gimbi', nameAmharic: 'ጊምቢ', centerLat: 9.1667, centerLng: 35.8167, radiusKm: 15 },
  { name: 'Woldiya', nameAmharic: 'ወልዲያ', centerLat: 11.8333, centerLng: 39.6000, radiusKm: 15 },
  { name: 'Gambela', nameAmharic: 'ጋምቤላ', centerLat: 8.2500, centerLng: 34.5833, radiusKm: 18 },
  { name: 'Assosa', nameAmharic: 'አሶሳ', centerLat: 10.0667, centerLng: 34.5333, radiusKm: 15 },
  { name: 'Bishoftu', nameAmharic: 'ቢሾፍቱ', centerLat: 8.7500, centerLng: 38.9833, radiusKm: 18 },
  { name: 'Woliso', nameAmharic: 'ወልሶ', centerLat: 8.5333, centerLng: 37.9667, radiusKm: 15 },
  { name: 'Butajira', nameAmharic: 'ቡታጅራ', centerLat: 8.1167, centerLng: 38.0833, radiusKm: 15 },
  { name: 'Axum', nameAmharic: 'አክሱም', centerLat: 14.1211, centerLng: 38.7255, radiusKm: 15 },
  { name: 'Moyale', nameAmharic: 'ሞያሌ', centerLat: 3.5333, centerLng: 39.0500, radiusKm: 15 },
  { name: 'Buta Jira', nameAmharic: 'ቡታ ጅራ', centerLat: 8.0500, centerLng: 37.6500, radiusKm: 15 },
  { name: 'Durame', nameAmharic: 'ዱራሜ', centerLat: 6.9000, centerLng: 37.6833, radiusKm: 15 },
];

async function seedZones(): Promise<Map<string, string>> {
  const zoneNameToId = new Map<string, string>();
  for (const zoneData of ZONES) {
    // Generate a shorter ID that fits in VARCHAR(26)
    const shortId = `z_${generateId('').substring(0, 22)}`; // z_ + 22 chars = 24 chars max
    const existing = await prisma.zone.findFirst({ where: { name: zoneData.name } });
    if (existing) {
      zoneNameToId.set(zoneData.name, existing.id);
    } else {
      const bbox = calcBoundingBox(zoneData.centerLat, zoneData.centerLng, zoneData.radiusKm);
      const created = await prisma.zone.create({
        data: {
          id: shortId,
          name: zoneData.name,
          nameAmharic: zoneData.nameAmharic || zoneData.name,
          city: zoneData.name,
          centerLat: zoneData.centerLat,
          centerLng: zoneData.centerLng,
          boundingBoxNorthLat: bbox.northLat,
          boundingBoxSouthLat: bbox.southLat,
          boundingBoxEastLng: bbox.eastLng,
          boundingBoxWestLng: bbox.westLng,
          isCommercial: true,
        },
      });
      zoneNameToId.set(zoneData.name, created.id);
    }
  }
  return zoneNameToId;
}

// Generate short ID for corridors (max 26 chars)
function generateShortCorridorId(origin: string, dest: string): string {
  const o = origin.slice(0, 3).toLowerCase().replace(/[^a-z]/g, '');
  const d = dest.slice(0, 3).toLowerCase().replace(/[^a-z]/g, '');
  return `corr_${o}_${d}`;
}

const CORRIDORS = [
  { origin: 'Addis Ababa', destination: 'Shashemene', distanceKm: 250 },
  { origin: 'Addis Ababa', destination: 'Debre Birhan', distanceKm: 130 },
  { origin: 'Addis Ababa', destination: 'Dessie', distanceKm: 400 },
  { origin: 'Addis Ababa', destination: 'Nekemte', distanceKm: 330 },
  { origin: 'Addis Ababa', destination: 'Ambo', distanceKm: 130 },
  { origin: 'Addis Ababa', destination: 'Gondar', distanceKm: 740 },
  { origin: 'Addis Ababa', destination: 'Dire Dawa', distanceKm: 527 },
  { origin: 'Addis Ababa', destination: 'Harar', distanceKm: 526 },
  { origin: 'Addis Ababa', destination: 'Ziway', distanceKm: 160 },
  { origin: 'Addis Ababa', destination: 'Arba Minch', distanceKm: 500 },
  { origin: 'Shashemene', destination: 'Hawassa', distanceKm: 30 },
  { origin: 'Dire Dawa', destination: 'Harar', distanceKm: 55 },
  { origin: 'Dessie', destination: 'Gondar', distanceKm: 380 },
  { origin: 'Shashemene', destination: 'Ziway', distanceKm: 95 },
  { origin: 'Debre Birhan', destination: 'Dessie', distanceKm: 280 },
  { origin: 'Nekemte', destination: 'Jimma', distanceKm: 180 },
  { origin: 'Ambo', destination: 'Nekemte', distanceKm: 160 },
  { origin: 'Wolkite', destination: 'Jimma', distanceKm: 190 },
  { origin: 'Ziway', destination: 'Meki', distanceKm: 35 },
  { origin: 'Meki', destination: 'Shashemene', distanceKm: 75 },
  { origin: 'Debre Markos', destination: 'Bahir Dar', distanceKm: 145 },
  { origin: 'Debre Markos', destination: 'Gondar', distanceKm: 230 },
];

async function seedCorridors(zoneMap: Map<string, string>): Promise<void> {
  for (const corridorData of CORRIDORS) {
    const originZoneId = zoneMap.get(corridorData.origin);
    const destinationZoneId = zoneMap.get(corridorData.destination);
    if (!originZoneId || !destinationZoneId) continue;

    const existing = await prisma.corridor.findFirst({
      where: {
        OR: [
          { originZoneId, destinationZoneId },
          { originZoneId: destinationZoneId, destinationZoneId: originZoneId },
        ],
      },
    });
    if (existing) continue;

    await prisma.corridor.create({
      data: {
        id: generateShortCorridorId(corridorData.origin, corridorData.destination),
        name: `${corridorData.origin} - ${corridorData.destination}`,
        originCity: corridorData.origin,
        destinationCity: corridorData.destination,
        originZoneId,
        destinationZoneId,
        distanceKm: corridorData.distanceKm,
        region: 'CENTRAL',
        status: 'ACTIVE',
      },
    });
  }
}

const MARKET_DAYS = [
  { zone: 'Addis Ababa', marketName: 'Merkato', dayOfWeek: 1, demandBoostPct: 12, peakLoadingHour: 6 },
  { zone: 'Addis Ababa', marketName: 'Kality', dayOfWeek: 3, demandBoostPct: 10, peakLoadingHour: 5 },
  { zone: 'Ziway', marketName: 'Ziway Market', dayOfWeek: 4, demandBoostPct: 15, peakLoadingHour: 5 },
  { zone: 'Shashemene', marketName: 'Shashemene Market', dayOfWeek: 1, demandBoostPct: 14, peakLoadingHour: 6 },
  { zone: 'Wolkite', marketName: 'Wolkite Market', dayOfWeek: 6, demandBoostPct: 13, peakLoadingHour: 5 },
  { zone: 'Ambo', marketName: 'Ambo Market', dayOfWeek: 1, demandBoostPct: 11, peakLoadingHour: 6 },
  { zone: 'Nekemte', marketName: 'Nekemte Market', dayOfWeek: 6, demandBoostPct: 12, peakLoadingHour: 5 },
  { zone: 'Sodo', marketName: 'Sodo Market', dayOfWeek: 0, demandBoostPct: 13, peakLoadingHour: 5 },
  { zone: 'Gondar', marketName: 'Gondar Market', dayOfWeek: 1, demandBoostPct: 11, peakLoadingHour: 6 },
  { zone: 'Debre Birhan', marketName: 'Debre Birhan Market', dayOfWeek: 6, demandBoostPct: 12, peakLoadingHour: 5 },
  { zone: 'Hawassa', marketName: 'Hawassa Market', dayOfWeek: 6, demandBoostPct: 11, peakLoadingHour: 6 },
  { zone: 'Dessie', marketName: 'Dessie Market', dayOfWeek: 1, demandBoostPct: 12, peakLoadingHour: 6 },
  { zone: 'Dire Dawa', marketName: 'Dire Dawa Market', dayOfWeek: 4, demandBoostPct: 13, peakLoadingHour: 5 },
  { zone: 'Meki', marketName: 'Meki Market', dayOfWeek: 3, demandBoostPct: 14, peakLoadingHour: 5 },
  { zone: 'Asella', marketName: 'Asella Market', dayOfWeek: 6, demandBoostPct: 12, peakLoadingHour: 6 },
  { zone: 'Jimma', marketName: 'Jimma Saturday Market', dayOfWeek: 6, demandBoostPct: 13, peakLoadingHour: 5 },
  { zone: 'Jimma', marketName: 'Jimma Tuesday Market', dayOfWeek: 2, demandBoostPct: 10, peakLoadingHour: 5 },
  { zone: 'Bahir Dar', marketName: 'Bahir Dar Market', dayOfWeek: 6, demandBoostPct: 14, peakLoadingHour: 6 },
  { zone: 'Harar', marketName: 'Harar Market', dayOfWeek: 5, demandBoostPct: 15, peakLoadingHour: 4 },
  { zone: 'Adama', marketName: 'Adama Wednesday Market', dayOfWeek: 3, demandBoostPct: 11, peakLoadingHour: 5 },
  { zone: 'Adama', marketName: 'Adama Sunday Market', dayOfWeek: 0, demandBoostPct: 10, peakLoadingHour: 6 },
];

function generateShortMarketDayId(zoneId: string, day: number): string {
 // Generate a short ID that fits within VARCHAR(26)
  // Format: md{hash}{day} to keep it under 26 chars
  const hash = zoneId.substring(zoneId.length - 10); // Last 10 chars of zoneId
  return `md_${hash}_${day}`.substring(0, 26);
}

async function seedMarketDays(zoneMap: Map<string, string>): Promise<void> {
  for (const marketDay of MARKET_DAYS) {
    const zoneId = zoneMap.get(marketDay.zone);
    if (!zoneId) continue;

    const existing = await (prisma as any).marketDay.findFirst({
      where: {
        zoneId,
        dayOfWeek: marketDay.dayOfWeek,
        marketName: marketDay.marketName,
      },
    });
    if (existing) continue;

    const marketDayId = generateShortMarketDayId(zoneId, marketDay.dayOfWeek);

    await (prisma as any).marketDay.create({
      data: {
        id: marketDayId,
        zoneId,
        dayOfWeek: marketDay.dayOfWeek,
        marketName: marketDay.marketName,
        demandBoostPct: marketDay.demandBoostPct,
        peakLoadingHour: marketDay.peakLoadingHour,
        isActive: true,
      },
    });
  }
}

async function seedSecurityZones(zoneMap: Map<string, string>): Promise<void> {
  // Seed security zones for all corridors
  const corridors = await prisma.corridor.findMany();
  let securityZoneIndex = 1;

  for (const corridor of corridors) {
    try {
      const existing = await (prisma as any).securityZone.findFirst({
        where: { corridorId: corridor.id },
      });

      if (!existing) {
        // Gambela corridor has historically elevated risk
        const isElevatedRisk = corridor.name.includes('Gambela');
        const securityZoneId = `sz_${String(securityZoneIndex).padStart(5, '0')}`;
        securityZoneIndex++;

        await (prisma as any).securityZone.create({
          data: {
            id: securityZoneId,
            corridorId: corridor.id,
            status: isElevatedRisk ? 'ELEVATED' : 'NORMAL',
            dataSource: 'seed/v1.1',
            description: isElevatedRisk
              ? 'Historically elevated risk due to seasonal conditions'
              : 'Standard corridor security status',
          },
        });
      }
    } catch (err: any) {
      if (err.code !== 'P2002') {
        throw err;
      }
    }
  }
}

async function seedSeasonalMultipliers(zoneMap: Map<string, string>): Promise<void> {
  // Find corridor IDs by looking up zones
  const corridorLookup: Record<string, { origin: string; destination: string }> = {
    jimma: { origin: 'Addis Ababa', destination: 'Jimma' },
    bahirdar: { origin: 'Addis Ababa', destination: 'Bahir Dar' },
    nekemte: { origin: 'Addis Ababa', destination: 'Nekemte' },
    gambela: { origin: 'Addis Ababa', destination: 'Gambela' },
    hawassa: { origin: 'Addis Ababa', destination: 'Shashemene' },
    gondar: { origin: 'Addis Ababa', destination: 'Gondar' },
  };

  const seasonalMultipliers: Array<{
    corridorId: string;
    transitMultiplier: number;
    riskPremiumMultiplier: number;
  }> = [];

  // Look up real corridor IDs and build multipliers array
  for (const [key, corridorRef] of Object.entries(corridorLookup)) {
    const originZoneId = zoneMap.get(corridorRef.origin);
    const destZoneId = zoneMap.get(corridorRef.destination);
    if (!originZoneId || !destZoneId) continue;

    const corridor = await prisma.corridor.findFirst({
      where: {
        OR: [
          { originZoneId, destinationZoneId: destZoneId },
          { originZoneId: destZoneId, destinationZoneId: originZoneId },
        ],
      },
    });

    if (corridor) {
      if (key === 'jimma') {
        seasonalMultipliers.push({
          corridorId: corridor.id,
          transitMultiplier: 1.2,
          riskPremiumMultiplier: 1.12,
        });
      } else if (key === 'bahirdar') {
        seasonalMultipliers.push({
          corridorId: corridor.id,
          transitMultiplier: 1.15,
          riskPremiumMultiplier: 1.1,
        });
      } else if (key === 'nekemte') {
        seasonalMultipliers.push({
          corridorId: corridor.id,
          transitMultiplier: 1.18,
          riskPremiumMultiplier: 1.12,
        });
      } else if (key === 'gambela') {
        seasonalMultipliers.push({
          corridorId: corridor.id,
          transitMultiplier: 1.25,
          riskPremiumMultiplier: 1.15,
        });
      } else if (key === 'hawassa') {
        seasonalMultipliers.push({
          corridorId: corridor.id,
          transitMultiplier: 1.1,
          riskPremiumMultiplier: 1.08,
        });
      } else if (key === 'gondar') {
        seasonalMultipliers.push({
          corridorId: corridor.id,
          transitMultiplier: 1.12,
          riskPremiumMultiplier: 1.08,
        });
      }
    }
  }

  // Create new StrategyConfig with seasonal multipliers via transaction
  await prisma.$transaction(async (tx: any) => {
    // Deactivate all existing active StrategyConfig records
    await tx.strategyConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create or update config with seasonal multipliers (idempotent)
    const configId = `sc_v110_seasonal`;
    await tx.strategyConfig.upsert({
      where: { id: configId },
      create: {
        id: configId,
        versionName: 'v1.1-isuzet-seasonal',
        configJson: {
          ...DEFAULT_CONFIG,
          rainySeasonCorridorMultipliers: seasonalMultipliers,
        },
        isActive: true,
        activatedAt: new Date(),
        createdByUserId: 'usr_super_admin_001',
        notes: `Seasonal multipliers for ${seasonalMultipliers.length} corridors. Rainy season: June-September.`,
      },
      update: {
        versionName: 'v1.1-isuzet-seasonal',
        configJson: {
          ...DEFAULT_CONFIG,
          rainySeasonCorridorMultipliers: seasonalMultipliers,
        },
        isActive: true,
        activatedAt: new Date(),
        notes: `Seasonal multipliers for ${seasonalMultipliers.length} corridors. Rainy season: June-September.`,
      },
    });
  });
}

async function seedExistingData(zoneMap: Map<string, string>): Promise<void> {
  await prisma.commissionConfig.upsert({
    where: { id: 'cc_default_8pct' },
    update: {},
    create: {
      id: 'cc_default_8pct',
      name: 'Standard 8%',
      configType: 'PERCENTAGE',
      flatRatePct: 8.0,
      isActive: true,
      effectiveFrom: new Date(),
      createdBy: 'usr_super_admin_001',
    },
  });

  const caps = [
    { id: 'cap_north', scopeType: 'CLUSTER', scopeId: 'cluster_north', capEtb: 2000000 },
    { id: 'cap_south', scopeType: 'CLUSTER', scopeId: 'cluster_south', capEtb: 1500000 },
    { id: 'cap_east', scopeType: 'CLUSTER', scopeId: 'cluster_east', capEtb: 1000000 },
    { id: 'cap_west', scopeType: 'CLUSTER', scopeId: 'cluster_west', capEtb: 800000 },
    { id: 'cap_central', scopeType: 'CLUSTER', scopeId: 'cluster_central', capEtb: 3000000 },
    { id: 'cap_system', scopeType: 'SYSTEM', scopeId: null, capEtb: 10000000 },
  ];

  for (const c of caps) {
    await prisma.exposureCap.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, setBy: 'usr_super_admin_001' },
    });
  }

  const currentYear = new Date().getFullYear();
  const ethEvents = [
    { eventName: 'ENKUTATASH', gregorianDate: new Date(currentYear, 8, 11), demandImpact: 'NEUTRAL' },
    { eventName: 'TIMKAT', gregorianDate: new Date(currentYear, 0, 19), demandImpact: 'LOW_DEMAND' },
    { eventName: 'FASIKA', gregorianDate: new Date(currentYear, 3, 20), demandImpact: 'NEUTRAL' },
    { eventName: 'GENA', gregorianDate: new Date(currentYear, 0, 7), demandImpact: 'HIGH_DEMAND' },
    { eventName: 'HARVEST_MEHER', gregorianDate: new Date(currentYear, 10, 15), demandImpact: 'HIGH_DEMAND' },
  ];

  for (const e of ethEvents) {
    await prisma.ethiopianCalendarEvent.createMany({
      data: {
        id: `evt_${e.eventName.toLowerCase()}_${currentYear}`,
        ...e,
        isRecurring: true,
        year: currentYear,
      },
      skipDuplicates: true,
    });
  }
}

async function seedDefaultStrategy(): Promise<void> {
  // Check if active strategy already exists
  const existing = await prisma.strategyVersion.findFirst({ where: { isActive: true } });
  if (existing) {
    console.log('Active strategy version already exists. Updating with correct values...');
    
    await prisma.strategyVersion.update({
      where: { id: existing.id },
      data: {
        // CORRECTED WDM weights (blueprint spec)
        wdmRouteFamiliarityWeight: 0.22,
        wdmOnTimeRateWeight: 0.18,
        wdmTrustScoreWeight: 0.16,
        wdmAvailabilityWeight: 0.15,
        wdmProximityWeight: 0.11,
        wdmLoadPreferenceWeight: 0.08,
        wdmZoneMatchWeight: 0.07,
        wdmCorridorFamiliarityWeight: 0.03,
        
        // CORRECTED pricing params
        floorPricePerKmPerQuintal: 0.50,   // 0.50 ETB (NOT 90)
        ceilingPricePerKmPerQuintal: 5.00,
        
        // Deviation thresholds
        urbanDeviationThresholdKm: 6.0,
        intercityDeviationThresholdKm: 3.0,
        
        // Payout SLA
        payoutSlaMinutes: 30,
        
        // Partial escrow
        partialEscrowReleasePct: 30,
        partialEscrowTriggerHours: 24,
        
        // Home zone bonuses
        homeZoneReturnUrgencyBonus: 0.20,
        homeZoneReturnScoreBonus: 0.05,
        
        // Demand multipliers
        maxDemandMultiplier: 1.50,
        minDemandMultiplier: 0.80,
        demandSurchargeRate: 0.15,
        supplyDiscountRate: 0.10,
        
        // Cargo class multipliers
        cargoClassMultipliers: {
          "GENERAL": 1.00,
          "GRAIN": 1.00,
          "COTTON": 1.00,
          "SESAME": 1.00,
          "COFFEE": 1.10,
          "CEMENT": 1.10,
          "BEVERAGES": 1.10,
          "FRESH_PRODUCE": 1.15,
          "HONEY": 1.15,
          "LIVESTOCK": 1.35,
          "KHAT": 1.40,
          "FRESH_FISH": 1.40,
          "HAZMAT": 1.40,
          "CUT_FLOWERS": 1.50,
        },
        
        // Acceptance windows
        acceptanceWindowMinutes: 20,
      }
    });
    
    console.log('✅ Strategy version updated with correct blueprint values.');
    return;
  }

  // Create new default strategy
  await prisma.strategyVersion.create({
    data: {
      id: 'default-v1',
      versionName: 'Blueprint-V1',
      optimizationMode: 'BALANCED',
      scope: 'GLOBAL',
      isActive: true,
      activatedAt: new Date(),
      
      weightSet: {
        routeFamiliarity: 0.22,
        onTimeRate: 0.18,
        trustScore: 0.16,
        availability: 0.15,
        proximity: 0.11,
        loadPreference: 0.08,
        zoneMatch: 0.07,
        corridorFamiliarity: 0.03,
      },
      
      thresholdSet: {
        urbanDeviationKm: 6.0,
        intercityDeviationKm: 3.0,
        gpsSilencePenaltyGraceMinutes: 30,
        acceptanceWindowMinutes: 20,
        fastTrackWindowMinutes: 5,
        hosAdvisoryHours: 8,
        hosSoftBlockHours: 10,
        hosStrongAdvisoryHours: 12,
        hosHardBlockHours: 14,
      },
      
      pricingParams: {
        floorRatePerKmPerQuintal: 0.50,
        ceilingRatePerKmPerQuintal: 5.00,
        minCommissionEtb: 1500,
        maxCommissionEtb: 30000,
        commissionTiers: [
          { upTo: 5000, rate: 0.12 },
          { upTo: 30000, rate: 0.10 },
          { upTo: 100000, rate: 0.08 },
          { above: 100000, rate: 0.06 },
        ],
        timeCriticalPremium: 0.20,
        securityElevatedPremium: 0.10,
        securityRestrictedPremium: 0.25,
      },
      
      // All new fields
      wdmRouteFamiliarityWeight: 0.22,
      wdmOnTimeRateWeight: 0.18,
      wdmTrustScoreWeight: 0.16,
      wdmAvailabilityWeight: 0.15,
      wdmProximityWeight: 0.11,
      wdmLoadPreferenceWeight: 0.08,
      wdmZoneMatchWeight: 0.07,
      wdmCorridorFamiliarityWeight: 0.03,
      floorPricePerKmPerQuintal: 0.50,
      ceilingPricePerKmPerQuintal: 5.00,
      urbanDeviationThresholdKm: 6.0,
      intercityDeviationThresholdKm: 3.0,
      payoutSlaMinutes: 30,
      partialEscrowReleasePct: 30,
      partialEscrowTriggerHours: 24,
      homeZoneReturnUrgencyBonus: 0.20,
      homeZoneReturnScoreBonus: 0.05,
      maxDemandMultiplier: 1.50,
      minDemandMultiplier: 0.80,
      cargoClassMultipliers: {
        "GENERAL": 1.00, "GRAIN": 1.00, "COTTON": 1.00, "SESAME": 1.00,
        "COFFEE": 1.10, "CEMENT": 1.10, "BEVERAGES": 1.10, "FRESH_PRODUCE": 1.15,
        "HONEY": 1.15, "LIVESTOCK": 1.35, "KHAT": 1.40, "FRESH_FISH": 1.40,
        "HAZMAT": 1.40, "CUT_FLOWERS": 1.50,
      },
    }
  });

  console.log('✅ Default strategy version created with blueprint-correct values.');
}

async function seedPaymentRails(): Promise<void> {
  const RAILS = [
    { rail: 'TELEBIRR', displayName: 'Telebirr (Ethio Telecom)', slaTargetMinutes: 30, isActive: true },
    { rail: 'CBE_BIRR', displayName: 'CBE Birr (Commercial Bank of Ethiopia)', slaTargetMinutes: 30, isActive: true },
    { rail: 'AMOLE', displayName: 'Amole (Dashen Bank)', slaTargetMinutes: 120, isActive: true },
    { rail: 'HELLOCASH', displayName: 'HelloCash', slaTargetMinutes: 120, isActive: true },
    { rail: 'AWASH_WALLET', displayName: 'Awash Bank Wallet', slaTargetMinutes: 120, isActive: true },
    { rail: 'BANK_TRANSFER', displayName: 'Bank Transfer', slaTargetMinutes: 1440, isActive: true },
  ];

  for (const railConfig of RAILS) {
    await prisma.paymentRailConfig.upsert({
      where: { rail: railConfig.rail as any },
      create: railConfig as any,
      update: { slaTargetMinutes: railConfig.slaTargetMinutes, isActive: railConfig.isActive },
    });
  }
  console.log('✅ Payment rail configs seeded.');
}

seed()
  .catch((e) => {
    process.stderr.write(`Seed error: ${e}\n`);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
