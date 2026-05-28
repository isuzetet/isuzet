import { PrismaClient, Prisma } from '@prisma/client';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Phase 8 seed...');

  // ============================================
  // SEED GROUP 1: StrategyVersion (1 record)
  // ============================================
  console.log('Seeding StrategyVersion...');
  const existingStrategy = await prisma.strategyVersion.findFirst({
    where: { versionName: 'v1.0-medium-haul' }
  });
  if (!existingStrategy) {
    await prisma.strategyVersion.create({
      data: {
        id: ulid(),
        versionName: 'v1.0-medium-haul',
        isActive: true,
        optimizationMode: 'EFFICIENCY',
        scope: 'GLOBAL',
        thresholdSet: {
          fastTrackMinKycTier: 2,
          fastTrackMinCompletedLoads: 3,
          overloadTolerancePercent: 5,
          routeDeviationThresholdKm: 5,
          terminalPresenceRadiusM: 400,
          terminalGracePeriodMinutes: 30,
          backhaulWindowMinutes: 20,
          disputeSlaHours: 72,
          fuelReportBonusEtb: 500,
          shadowBrokerMonitorHours: 6,
          driverHoursWarning: 8,
          driverHoursAcknowledgement: 10
        },
        weightSet: {
          wdm: {
            proximityScore: 0.15,
            zoneMatch: 0.07,
            corridorFamiliarity: 0.05,
            trustScore: 0.20,
            onTimeRate: 0.18,
            availability: 0.15,
            routeFamiliarity: 0.12,
            loadPreference: 0.08
          }
        },
        pricingParams: {}
      }
    });
    console.log('✅ StrategyVersion created');
  } else {
    console.log('⏭️ StrategyVersion already exists');
  }

  // ============================================
  // SEED GROUP 2: Zones (35+ records - Phase 8 Expansion)
  // ============================================
  console.log('Seeding Zones (Phase 8 - 35+ zones)...');
  
  const zones = [
    // Existing 13 zones
    { name: 'KALITY', nameAmharic: 'ቃሊቲ', city: 'Addis Ababa', centerLat: new Prisma.Decimal(8.9200), centerLng: new Prisma.Decimal(38.7600), boundingBoxSouthLat: new Prisma.Decimal(8.9000), boundingBoxNorthLat: new Prisma.Decimal(8.9400), boundingBoxWestLng: new Prisma.Decimal(38.7400), boundingBoxEastLng: new Prisma.Decimal(38.7800), truckDemandIndex: new Prisma.Decimal(0.8) },
    { name: 'MERKATO', nameAmharic: 'መርካቶ', city: 'Addis Ababa', centerLat: new Prisma.Decimal(9.0200), centerLng: new Prisma.Decimal(38.7400), boundingBoxSouthLat: new Prisma.Decimal(9.0050), boundingBoxNorthLat: new Prisma.Decimal(9.0350), boundingBoxWestLng: new Prisma.Decimal(38.7250), boundingBoxEastLng: new Prisma.Decimal(38.7550), truckDemandIndex: new Prisma.Decimal(0.9) },
    { name: 'MESALEMIA', nameAmharic: 'መሳለሚያ', city: 'Addis Ababa', centerLat: new Prisma.Decimal(9.0050), centerLng: new Prisma.Decimal(38.7650), boundingBoxSouthLat: new Prisma.Decimal(8.9900), boundingBoxNorthLat: new Prisma.Decimal(9.0200), boundingBoxWestLng: new Prisma.Decimal(38.7500), boundingBoxEastLng: new Prisma.Decimal(38.7800), truckDemandIndex: new Prisma.Decimal(0.85) },
    { name: 'AKAKI', nameAmharic: 'አቃቂ', city: 'Addis Ababa', centerLat: new Prisma.Decimal(8.8800), centerLng: new Prisma.Decimal(38.7900), boundingBoxSouthLat: new Prisma.Decimal(8.8600), boundingBoxNorthLat: new Prisma.Decimal(8.9000), boundingBoxWestLng: new Prisma.Decimal(38.7700), boundingBoxEastLng: new Prisma.Decimal(38.8100), truckDemandIndex: new Prisma.Decimal(0.6) },
    { name: 'MEGENAGNA', nameAmharic: 'መገናኛ', city: 'Addis Ababa', centerLat: new Prisma.Decimal(9.0350), centerLng: new Prisma.Decimal(38.8000), boundingBoxSouthLat: new Prisma.Decimal(9.0200), boundingBoxNorthLat: new Prisma.Decimal(9.0500), boundingBoxWestLng: new Prisma.Decimal(38.7850), boundingBoxEastLng: new Prisma.Decimal(38.8150), truckDemandIndex: new Prisma.Decimal(0.5) },
    { name: 'SARIS', nameAmharic: 'ሳሪስ', city: 'Addis Ababa', centerLat: new Prisma.Decimal(8.9600), centerLng: new Prisma.Decimal(38.7200), boundingBoxSouthLat: new Prisma.Decimal(8.9450), boundingBoxNorthLat: new Prisma.Decimal(8.9750), boundingBoxWestLng: new Prisma.Decimal(38.7050), boundingBoxEastLng: new Prisma.Decimal(38.7350), truckDemandIndex: new Prisma.Decimal(0.55) },
    { name: 'LEGEHAR', nameAmharic: 'ለገሃር', city: 'Addis Ababa', centerLat: new Prisma.Decimal(9.0150), centerLng: new Prisma.Decimal(38.7550), boundingBoxSouthLat: new Prisma.Decimal(9.0000), boundingBoxNorthLat: new Prisma.Decimal(9.0300), boundingBoxWestLng: new Prisma.Decimal(38.7400), boundingBoxEastLng: new Prisma.Decimal(38.7700), truckDemandIndex: new Prisma.Decimal(0.7) },
    { name: 'ADAMA', nameAmharic: 'አዳማ', city: 'Adama', centerLat: new Prisma.Decimal(8.5400), centerLng: new Prisma.Decimal(39.2700), boundingBoxSouthLat: new Prisma.Decimal(8.5000), boundingBoxNorthLat: new Prisma.Decimal(8.5800), boundingBoxWestLng: new Prisma.Decimal(39.2300), boundingBoxEastLng: new Prisma.Decimal(39.3100), truckDemandIndex: new Prisma.Decimal(0.65) },
    { name: 'HAWASSA', nameAmharic: 'ሃዋሳ', city: 'Hawassa', centerLat: new Prisma.Decimal(7.0600), centerLng: new Prisma.Decimal(38.4750), boundingBoxSouthLat: new Prisma.Decimal(7.0200), boundingBoxNorthLat: new Prisma.Decimal(7.1000), boundingBoxWestLng: new Prisma.Decimal(38.4350), boundingBoxEastLng: new Prisma.Decimal(38.5150), truckDemandIndex: new Prisma.Decimal(0.6) },
    { name: 'MEKELLE', nameAmharic: 'መቀሌ', city: 'Mekelle', centerLat: new Prisma.Decimal(13.4967), centerLng: new Prisma.Decimal(39.4767), boundingBoxSouthLat: new Prisma.Decimal(13.4600), boundingBoxNorthLat: new Prisma.Decimal(13.5300), boundingBoxWestLng: new Prisma.Decimal(39.4400), boundingBoxEastLng: new Prisma.Decimal(39.5100), truckDemandIndex: new Prisma.Decimal(0.45) },
    { name: 'BAHIR_DAR', nameAmharic: 'ባህር ዳር', city: 'Bahir Dar', centerLat: new Prisma.Decimal(11.5931), centerLng: new Prisma.Decimal(37.3908), boundingBoxSouthLat: new Prisma.Decimal(11.5600), boundingBoxNorthLat: new Prisma.Decimal(11.6200), boundingBoxWestLng: new Prisma.Decimal(37.3600), boundingBoxEastLng: new Prisma.Decimal(37.4200), truckDemandIndex: new Prisma.Decimal(0.5) },
    { name: 'DIRE_DAWA', nameAmharic: 'ድሬዳዋ', city: 'Dire Dawa', centerLat: new Prisma.Decimal(9.5931), centerLng: new Prisma.Decimal(41.8661), boundingBoxSouthLat: new Prisma.Decimal(9.5600), boundingBoxNorthLat: new Prisma.Decimal(9.6200), boundingBoxWestLng: new Prisma.Decimal(41.8300), boundingBoxEastLng: new Prisma.Decimal(41.9000), truckDemandIndex: new Prisma.Decimal(0.55) },
    { name: 'JIMMA', nameAmharic: 'ጅማ', city: 'Jimma', centerLat: new Prisma.Decimal(7.6667), centerLng: new Prisma.Decimal(36.8333), boundingBoxSouthLat: new Prisma.Decimal(7.6300), boundingBoxNorthLat: new Prisma.Decimal(7.7000), boundingBoxWestLng: new Prisma.Decimal(36.8000), boundingBoxEastLng: new Prisma.Decimal(36.8700), truckDemandIndex: new Prisma.Decimal(0.4) },
    
    // TIER 1 - New zones (Required at launch)
    { name: 'SHASHEMENE', nameAmharic: 'ሻሸመኔ', city: 'Shashemene', centerLat: new Prisma.Decimal(7.2000), centerLng: new Prisma.Decimal(38.5833), boundingBoxSouthLat: new Prisma.Decimal(7.1700), boundingBoxNorthLat: new Prisma.Decimal(7.2300), boundingBoxWestLng: new Prisma.Decimal(38.5500), boundingBoxEastLng: new Prisma.Decimal(38.6200), truckDemandIndex: new Prisma.Decimal(0.55) },
    { name: 'DEBRE_BIRHAN', nameAmharic: 'ደብረ ብርሃን', city: 'Debre Birhan', centerLat: new Prisma.Decimal(9.6800), centerLng: new Prisma.Decimal(39.5333), boundingBoxSouthLat: new Prisma.Decimal(9.6500), boundingBoxNorthLat: new Prisma.Decimal(9.7100), boundingBoxWestLng: new Prisma.Decimal(39.5000), boundingBoxEastLng: new Prisma.Decimal(39.5700), truckDemandIndex: new Prisma.Decimal(0.52) },
    { name: 'DESSIE', nameAmharic: 'ዴሴ', city: 'Dessie', centerLat: new Prisma.Decimal(11.1342), centerLng: new Prisma.Decimal(39.6354), boundingBoxSouthLat: new Prisma.Decimal(11.1000), boundingBoxNorthLat: new Prisma.Decimal(11.1700), boundingBoxWestLng: new Prisma.Decimal(39.6000), boundingBoxEastLng: new Prisma.Decimal(39.6700), truckDemandIndex: new Prisma.Decimal(0.48) },
    { name: 'KOMOLCHA', nameAmharic: 'ኮምቦልቻ', city: 'Kombolcha', centerLat: new Prisma.Decimal(11.0833), centerLng: new Prisma.Decimal(39.7333), boundingBoxSouthLat: new Prisma.Decimal(11.0500), boundingBoxNorthLat: new Prisma.Decimal(11.1200), boundingBoxWestLng: new Prisma.Decimal(39.7000), boundingBoxEastLng: new Prisma.Decimal(39.7700), truckDemandIndex: new Prisma.Decimal(0.45) },
    { name: 'NEKEMTE', nameAmharic: 'ነቀምቴ', city: 'Nekemte', centerLat: new Prisma.Decimal(9.0833), centerLng: new Prisma.Decimal(36.5000), boundingBoxSouthLat: new Prisma.Decimal(9.0500), boundingBoxNorthLat: new Prisma.Decimal(9.1200), boundingBoxWestLng: new Prisma.Decimal(36.4700), boundingBoxEastLng: new Prisma.Decimal(36.5300), truckDemandIndex: new Prisma.Decimal(0.48) },
    { name: 'AMBO', nameAmharic: 'አምቦ', city: 'Ambo', centerLat: new Prisma.Decimal(8.9833), centerLng: new Prisma.Decimal(37.8500), boundingBoxSouthLat: new Prisma.Decimal(8.9500), boundingBoxNorthLat: new Prisma.Decimal(9.0200), boundingBoxWestLng: new Prisma.Decimal(37.8200), boundingBoxEastLng: new Prisma.Decimal(37.8800), truckDemandIndex: new Prisma.Decimal(0.42) },
    { name: 'WOLKITE', nameAmharic: 'ወልቂጤ', city: 'Wolkite', centerLat: new Prisma.Decimal(8.2833), centerLng: new Prisma.Decimal(37.7833), boundingBoxSouthLat: new Prisma.Decimal(8.2500), boundingBoxNorthLat: new Prisma.Decimal(8.3200), boundingBoxWestLng: new Prisma.Decimal(37.7500), boundingBoxEastLng: new Prisma.Decimal(37.8200), truckDemandIndex: new Prisma.Decimal(0.44) },
    { name: 'ZIWAY', nameAmharic: 'ዝዋይ', city: 'Ziway', centerLat: new Prisma.Decimal(7.9333), centerLng: new Prisma.Decimal(38.7167), boundingBoxSouthLat: new Prisma.Decimal(7.9000), boundingBoxNorthLat: new Prisma.Decimal(7.9700), boundingBoxWestLng: new Prisma.Decimal(38.6800), boundingBoxEastLng: new Prisma.Decimal(38.7500), truckDemandIndex: new Prisma.Decimal(0.58) },
    { name: 'MEKI', nameAmharic: 'መካ', city: 'Meki', centerLat: new Prisma.Decimal(8.1500), centerLng: new Prisma.Decimal(38.8000), boundingBoxSouthLat: new Prisma.Decimal(8.1200), boundingBoxNorthLat: new Prisma.Decimal(8.1800), boundingBoxWestLng: new Prisma.Decimal(38.7700), boundingBoxEastLng: new Prisma.Decimal(38.8300), truckDemandIndex: new Prisma.Decimal(0.46) },
    { name: 'DEBRE_MARKOS', nameAmharic: 'ደብረ ማርቆስ', city: 'Debre Markos', centerLat: new Prisma.Decimal(10.3500), centerLng: new Prisma.Decimal(37.7167), boundingBoxSouthLat: new Prisma.Decimal(10.3200), boundingBoxNorthLat: new Prisma.Decimal(10.3800), boundingBoxWestLng: new Prisma.Decimal(37.6800), boundingBoxEastLng: new Prisma.Decimal(37.7500), truckDemandIndex: new Prisma.Decimal(0.43) },
    { name: 'GONDAR', nameAmharic: 'ጎንደር', city: 'Gondar', centerLat: new Prisma.Decimal(12.6000), centerLng: new Prisma.Decimal(37.4667), boundingBoxSouthLat: new Prisma.Decimal(12.5700), boundingBoxNorthLat: new Prisma.Decimal(12.6300), boundingBoxWestLng: new Prisma.Decimal(37.4300), boundingBoxEastLng: new Prisma.Decimal(37.5000), truckDemandIndex: new Prisma.Decimal(0.5) },
    { name: 'ASELLA', nameAmharic: 'አሰላ', city: 'Asella', centerLat: new Prisma.Decimal(7.9500), centerLng: new Prisma.Decimal(39.1333), boundingBoxSouthLat: new Prisma.Decimal(7.9200), boundingBoxNorthLat: new Prisma.Decimal(7.9800), boundingBoxWestLng: new Prisma.Decimal(39.1000), boundingBoxEastLng: new Prisma.Decimal(39.1700), truckDemandIndex: new Prisma.Decimal(0.47) },
    { name: 'SODO', nameAmharic: 'ሶዶ', city: 'Sodo', centerLat: new Prisma.Decimal(6.8500), centerLng: new Prisma.Decimal(37.7500), boundingBoxSouthLat: new Prisma.Decimal(6.8200), boundingBoxNorthLat: new Prisma.Decimal(6.8800), boundingBoxWestLng: new Prisma.Decimal(37.7200), boundingBoxEastLng: new Prisma.Decimal(37.7800), truckDemandIndex: new Prisma.Decimal(0.41) },
    { name: 'ARBA_MINCH', nameAmharic: 'አርባ ምንጭ', city: 'Arba Minch', centerLat: new Prisma.Decimal(6.0333), centerLng: new Prisma.Decimal(37.5500), boundingBoxSouthLat: new Prisma.Decimal(6.0000), boundingBoxNorthLat: new Prisma.Decimal(6.0700), boundingBoxWestLng: new Prisma.Decimal(37.5200), boundingBoxEastLng: new Prisma.Decimal(37.5800), truckDemandIndex: new Prisma.Decimal(0.42) },
    { name: 'JIJIGA', nameAmharic: 'ጅጅጋ', city: 'Jijiga', centerLat: new Prisma.Decimal(9.3500), centerLng: new Prisma.Decimal(42.8000), boundingBoxSouthLat: new Prisma.Decimal(9.3200), boundingBoxNorthLat: new Prisma.Decimal(9.3800), boundingBoxWestLng: new Prisma.Decimal(42.7700), boundingBoxEastLng: new Prisma.Decimal(42.8300), truckDemandIndex: new Prisma.Decimal(0.38) },
    { name: 'HARAR', nameAmharic: 'ሐረር', city: 'Harar', centerLat: new Prisma.Decimal(9.3100), centerLng: new Prisma.Decimal(42.1200), boundingBoxSouthLat: new Prisma.Decimal(9.2800), boundingBoxNorthLat: new Prisma.Decimal(9.3400), boundingBoxWestLng: new Prisma.Decimal(42.0900), boundingBoxEastLng: new Prisma.Decimal(42.1500), truckDemandIndex: new Prisma.Decimal(0.5) },
    
    // Additional Addis zones
    { name: 'BISHOFTU', nameAmharic: 'ቢሾፍቱ', city: 'Bishoftu', centerLat: new Prisma.Decimal(8.7500), centerLng: new Prisma.Decimal(38.9800), boundingBoxSouthLat: new Prisma.Decimal(8.7200), boundingBoxNorthLat: new Prisma.Decimal(8.7800), boundingBoxWestLng: new Prisma.Decimal(38.9500), boundingBoxEastLng: new Prisma.Decimal(39.0100), truckDemandIndex: new Prisma.Decimal(0.48) },
    { name: 'WOLISO', nameAmharic: 'ወሊሶ', city: 'Woliso', centerLat: new Prisma.Decimal(8.5333), centerLng: new Prisma.Decimal(37.9833), boundingBoxSouthLat: new Prisma.Decimal(8.5000), boundingBoxNorthLat: new Prisma.Decimal(8.5700), boundingBoxWestLng: new Prisma.Decimal(37.9500), boundingBoxEastLng: new Prisma.Decimal(38.0200), truckDemandIndex: new Prisma.Decimal(0.4) },
    { name: 'BUTAJIRA', nameAmharic: 'ቡታጅራ', city: 'Butajira', centerLat: new Prisma.Decimal(8.1167), centerLng: new Prisma.Decimal(38.3667), boundingBoxSouthLat: new Prisma.Decimal(8.0800), boundingBoxNorthLat: new Prisma.Decimal(8.1500), boundingBoxWestLng: new Prisma.Decimal(38.3300), boundingBoxEastLng: new Prisma.Decimal(38.4000), truckDemandIndex: new Prisma.Decimal(0.38) },
    
    // TIER 2 - Add within 6 months (seed now)
    { name: 'DILLA', nameAmharic: 'ዲላ', city: 'Dilla', centerLat: new Prisma.Decimal(6.4167), centerLng: new Prisma.Decimal(38.3167), boundingBoxSouthLat: new Prisma.Decimal(6.3900), boundingBoxNorthLat: new Prisma.Decimal(6.4400), boundingBoxWestLng: new Prisma.Decimal(38.2900), boundingBoxEastLng: new Prisma.Decimal(38.3500), truckDemandIndex: new Prisma.Decimal(0.36) },
    { name: 'YIRGALEM', nameAmharic: 'ይርጋየለም', city: 'Yirgalem', centerLat: new Prisma.Decimal(6.7500), centerLng: new Prisma.Decimal(38.4000), boundingBoxSouthLat: new Prisma.Decimal(6.7200), boundingBoxNorthLat: new Prisma.Decimal(6.7800), boundingBoxWestLng: new Prisma.Decimal(38.3700), boundingBoxEastLng: new Prisma.Decimal(38.4300), truckDemandIndex: new Prisma.Decimal(0.35) },
    { name: 'GIMBI', nameAmharic: 'ጊምቢ', city: 'Gimbi', centerLat: new Prisma.Decimal(9.1667), centerLng: new Prisma.Decimal(35.8167), boundingBoxSouthLat: new Prisma.Decimal(9.1300), boundingBoxNorthLat: new Prisma.Decimal(9.2000), boundingBoxWestLng: new Prisma.Decimal(35.7800), boundingBoxEastLng: new Prisma.Decimal(35.8500), truckDemandIndex: new Prisma.Decimal(0.32) },
    { name: 'WOLDIYA', nameAmharic: 'ወልዲያ', city: 'Woldiya', centerLat: new Prisma.Decimal(11.8333), centerLng: new Prisma.Decimal(39.6000), boundingBoxSouthLat: new Prisma.Decimal(11.8000), boundingBoxNorthLat: new Prisma.Decimal(11.8700), boundingBoxWestLng: new Prisma.Decimal(39.5700), boundingBoxEastLng: new Prisma.Decimal(39.6300), truckDemandIndex: new Prisma.Decimal(0.38) },
    { name: 'GAMBELA', nameAmharic: 'ጋምቤላ', city: 'Gambela', centerLat: new Prisma.Decimal(8.2500), centerLng: new Prisma.Decimal(34.5833), boundingBoxSouthLat: new Prisma.Decimal(8.2200), boundingBoxNorthLat: new Prisma.Decimal(8.2800), boundingBoxWestLng: new Prisma.Decimal(34.5500), boundingBoxEastLng: new Prisma.Decimal(34.6200), truckDemandIndex: new Prisma.Decimal(0.28) },
    { name: 'ASSOSA', nameAmharic: 'አሶሳ', city: 'Assosa', centerLat: new Prisma.Decimal(10.0667), centerLng: new Prisma.Decimal(34.5333), boundingBoxSouthLat: new Prisma.Decimal(10.0300), boundingBoxNorthLat: new Prisma.Decimal(10.1000), boundingBoxWestLng: new Prisma.Decimal(34.5000), boundingBoxEastLng: new Prisma.Decimal(34.5700), truckDemandIndex: new Prisma.Decimal(0.3) }
  ];

  const zoneIdMap = new Map<string, string>();
  for (const zone of zones) {
    const existing = await prisma.zone.findFirst({ where: { name: zone.name } });
    if (!existing) {
      const created = await prisma.zone.create({ data: { ...zone, id: ulid() } });
      zoneIdMap.set(zone.name, created.id);
      console.log(`  Created zone: ${zone.name}`);
    } else {
      zoneIdMap.set(zone.name, existing.id);
      console.log(`  Skipped zone (exists): ${zone.name}`);
    }
  }
  console.log(`✅ Zones seeded (${zones.length} records)`);

  // ============================================
  // SEED GROUP 3: Terminals (5 records)
  // ============================================
  console.log('Seeding Terminals...');
  const terminals = [
    { name: 'KALITY_FREIGHT', nameAmharic: 'ቃሊቲ ጭነት ተርሚናል', zoneName: 'KALITY', lat: new Prisma.Decimal(8.9180), lng: new Prisma.Decimal(38.7620), averageWaitTimeMinutes: 45 },
    { name: 'MERKATO_TRUCK', nameAmharic: 'መርካቶ ትራክ ተርሚናል', zoneName: 'MERKATO', lat: new Prisma.Decimal(9.0180), lng: new Prisma.Decimal(38.7420), averageWaitTimeMinutes: 30 },
    { name: 'MESALEMIA_CLEARING', nameAmharic: 'መሳለሚያ ማጽጃ ተርሚናል', zoneName: 'MESALEMIA', lat: new Prisma.Decimal(9.0030), lng: new Prisma.Decimal(38.7670), averageWaitTimeMinutes: 60 },
    { name: 'ADAMA_HUB', nameAmharic: 'አዳማ ሎጂስቲክስ ማዕከል', zoneName: 'ADAMA', lat: new Prisma.Decimal(8.5420), lng: new Prisma.Decimal(39.2720), averageWaitTimeMinutes: 20 },
    { name: 'HAWASSA_INDUSTRIAL', nameAmharic: 'ሃዋሳ ኢንዱስትሪ ተርሚናል', zoneName: 'HAWASSA', lat: new Prisma.Decimal(7.0620), lng: new Prisma.Decimal(38.4770), averageWaitTimeMinutes: 25 }
  ];

  for (const terminal of terminals) {
    const zoneId = zoneIdMap.get(terminal.zoneName);
    if (!zoneId) {
      console.warn(`  Zone ${terminal.zoneName} not found, skipping terminal ${terminal.name}`);
      continue;
    }
    const existing = await prisma.terminal.findFirst({ where: { name: terminal.name } });
    if (!existing) {
      await prisma.terminal.create({
        data: {
          id: ulid(),
          name: terminal.name,
          nameAmharic: terminal.nameAmharic,
          zoneId: zoneId,
          lat: terminal.lat,
          lng: terminal.lng,
          averageWaitTimeMinutes: terminal.averageWaitTimeMinutes
        }
      });
      console.log(`  Created terminal: ${terminal.name}`);
    } else {
      console.log(`  Skipped terminal (exists): ${terminal.name}`);
    }
  }
  console.log('✅ Terminals seeded (5 records)');

  // ============================================
  // SEED GROUP 4: Corridors (Expanded)
  // ============================================
  console.log('Seeding Corridors...');
  
  const corridors = [
    // Existing 8 corridors
    { name: 'ADDIS_ADAMA', originZoneName: 'KALITY', destinationZoneName: 'ADAMA', originCity: 'Addis Ababa', destinationCity: 'Adama', distanceKm: 99, corridorType: 'INTERCITY' as const, averageTransitMinutes: 120, peakHourMultiplier: new Prisma.Decimal(1.3), roadConditionScore: 85, isNightTimeRestricted: false, expectedCheckpointFeeEtb: 0, region: 'CENTRAL' },
    { name: 'ADDIS_HAWASSA', originZoneName: 'KALITY', destinationZoneName: 'HAWASSA', originCity: 'Addis Ababa', destinationCity: 'Hawassa', distanceKm: 275, corridorType: 'INTERCITY' as const, averageTransitMinutes: 240, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 78, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'SOUTH' },
    { name: 'ADDIS_DIRE_DAWA', originZoneName: 'KALITY', destinationZoneName: 'DIRE_DAWA', originCity: 'Addis Ababa', destinationCity: 'Dire Dawa', distanceKm: 515, corridorType: 'INTERCITY' as const, averageTransitMinutes: 420, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 72, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'EAST' },
    { name: 'ADDIS_BAHIR_DAR', originZoneName: 'MERKATO', destinationZoneName: 'BAHIR_DAR', originCity: 'Addis Ababa', destinationCity: 'Bahir Dar', distanceKm: 565, corridorType: 'INTERCITY' as const, averageTransitMinutes: 480, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 70, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'NORTH' },
    { name: 'ADDIS_MEKELLE', originZoneName: 'MERKATO', destinationZoneName: 'MEKELLE', originCity: 'Addis Ababa', destinationCity: 'Mekelle', distanceKm: 783, corridorType: 'INTERCITY' as const, averageTransitMinutes: 600, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 65, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'NORTH' },
    { name: 'ADDIS_JIMMA', originZoneName: 'MERKATO', destinationZoneName: 'JIMMA', originCity: 'Addis Ababa', destinationCity: 'Jimma', distanceKm: 346, corridorType: 'INTERCITY' as const, averageTransitMinutes: 300, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 68, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'WEST' },
    { name: 'KALITY_MERKATO', originZoneName: 'KALITY', destinationZoneName: 'MERKATO', originCity: 'Addis Ababa', destinationCity: 'Addis Ababa', distanceKm: 12, corridorType: 'INTRACITY' as const, averageTransitMinutes: 35, peakHourMultiplier: new Prisma.Decimal(1.8), roadConditionScore: 90, isNightTimeRestricted: false, expectedCheckpointFeeEtb: 0, region: 'CENTRAL' },
    { name: 'MERKATO_MESALEMIA', originZoneName: 'MERKATO', destinationZoneName: 'MESALEMIA', originCity: 'Addis Ababa', destinationCity: 'Addis Ababa', distanceKm: 4, corridorType: 'INTRACITY' as const, averageTransitMinutes: 20, peakHourMultiplier: new Prisma.Decimal(2.0), roadConditionScore: 88, isNightTimeRestricted: false, expectedCheckpointFeeEtb: 0, region: 'CENTRAL' },
    
    // New Phase 8 corridors
    { name: 'ADDIS_SHASHEMENE', originZoneName: 'KALITY', destinationZoneName: 'SHASHEMENE', originCity: 'Addis Ababa', destinationCity: 'Shashemene', distanceKm: 250, corridorType: 'INTERCITY' as const, averageTransitMinutes: 210, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 75, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'SOUTH' },
    { name: 'ADDIS_DEBRE_BIRHAN', originZoneName: 'KALITY', destinationZoneName: 'DEBRE_BIRHAN', originCity: 'Addis Ababa', destinationCity: 'Debre Birhan', distanceKm: 130, corridorType: 'INTERCITY' as const, averageTransitMinutes: 150, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 80, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'CENTRAL' },
    { name: 'ADDIS_DESSIE', originZoneName: 'KALITY', destinationZoneName: 'DESSIE', originCity: 'Addis Ababa', destinationCity: 'Dessie', distanceKm: 400, corridorType: 'INTERCITY' as const, averageTransitMinutes: 360, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 70, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'NORTH' },
    { name: 'ADDIS_NEKEMTE', originZoneName: 'MERKATO', destinationZoneName: 'NEKEMTE', originCity: 'Addis Ababa', destinationCity: 'Nekemte', distanceKm: 330, corridorType: 'INTERCITY' as const, averageTransitMinutes: 300, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 68, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'WEST' },
    { name: 'ADDIS_AMBO', originZoneName: 'MERKATO', destinationZoneName: 'AMBO', originCity: 'Addis Ababa', destinationCity: 'Ambo', distanceKm: 130, corridorType: 'INTERCITY' as const, averageTransitMinutes: 150, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 75, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'WEST' },
    { name: 'ADDIS_GONDAR', originZoneName: 'MERKATO', destinationZoneName: 'GONDAR', originCity: 'Addis Ababa', destinationCity: 'Gondar', distanceKm: 740, corridorType: 'INTERCITY' as const, averageTransitMinutes: 660, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 65, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'NORTH' },
    { name: 'ADDIS_HARAR', originZoneName: 'KALITY', destinationZoneName: 'HARAR', originCity: 'Addis Ababa', destinationCity: 'Harar', distanceKm: 526, corridorType: 'INTERCITY' as const, averageTransitMinutes: 450, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 72, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'EAST' },
    { name: 'ADDIS_ZIWAY', originZoneName: 'KALITY', destinationZoneName: 'ZIWAY', originCity: 'Addis Ababa', destinationCity: 'Ziway', distanceKm: 160, corridorType: 'INTERCITY' as const, averageTransitMinutes: 150, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 78, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'SOUTH' },
    { name: 'ADDIS_ARBA_MINCH', originZoneName: 'KALITY', destinationZoneName: 'ARBA_MINCH', originCity: 'Addis Ababa', destinationCity: 'Arba Minch', distanceKm: 500, corridorType: 'INTERCITY' as const, averageTransitMinutes: 420, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 70, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'SOUTH' },
    { name: 'SHASHEMENE_HAWASSA', originZoneName: 'SHASHEMENE', destinationZoneName: 'HAWASSA', originCity: 'Shashemene', destinationCity: 'Hawassa', distanceKm: 30, corridorType: 'INTERCITY' as const, averageTransitMinutes: 35, peakHourMultiplier: new Prisma.Decimal(1.1), roadConditionScore: 85, isNightTimeRestricted: false, expectedCheckpointFeeEtb: 0, region: 'SOUTH' },
    { name: 'DIRE_DAWA_HARAR', originZoneName: 'DIRE_DAWA', destinationZoneName: 'HARAR', originCity: 'Dire Dawa', destinationCity: 'Harar', distanceKm: 55, corridorType: 'INTERCITY' as const, averageTransitMinutes: 65, peakHourMultiplier: new Prisma.Decimal(1.1), roadConditionScore: 82, isNightTimeRestricted: false, expectedCheckpointFeeEtb: 0, region: 'EAST' },
    { name: 'DESSIE_GONDAR', originZoneName: 'DESSIE', destinationZoneName: 'GONDAR', originCity: 'Dessie', destinationCity: 'Gondar', distanceKm: 380, corridorType: 'INTERCITY' as const, averageTransitMinutes: 360, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 65, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'NORTH' },
    { name: 'JIJIGA_HARAR', originZoneName: 'JIJIGA', destinationZoneName: 'HARAR', originCity: 'Jijiga', destinationCity: 'Harar', distanceKm: 100, corridorType: 'INTERCITY' as const, averageTransitMinutes: 120, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 70, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'EAST' },
    { name: 'AMBO_WOLKITE', originZoneName: 'AMBO', destinationZoneName: 'WOLKITE', originCity: 'Ambo', destinationCity: 'Wolkite', distanceKm: 110, corridorType: 'INTERCITY' as const, averageTransitMinutes: 150, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 65, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'WEST' },
    { name: 'BAHIR_DAR_GONDAR', originZoneName: 'BAHIR_DAR', destinationZoneName: 'GONDAR', originCity: 'Bahir Dar', destinationCity: 'Gondar', distanceKm: 175, corridorType: 'INTERCITY' as const, averageTransitMinutes: 180, peakHourMultiplier: new Prisma.Decimal(1.2), roadConditionScore: 72, isNightTimeRestricted: true, expectedCheckpointFeeEtb: 0, region: 'NORTH' },
    { name: 'DESSIE_KOMOLCHA', originZoneName: 'DESSIE', destinationZoneName: 'KOMOLCHA', originCity: 'Dessie', destinationCity: 'Kombolcha', distanceKm: 25, corridorType: 'INTERCITY' as const, averageTransitMinutes: 30, peakHourMultiplier: new Prisma.Decimal(1.1), roadConditionScore: 88, isNightTimeRestricted: false, expectedCheckpointFeeEtb: 0, region: 'NORTH' }
  ];

  const corridorIdMap = new Map<string, string>();
  for (const corridor of corridors) {
    const originZoneId = zoneIdMap.get(corridor.originZoneName);
    const destinationZoneId = zoneIdMap.get(corridor.destinationZoneName);
    if (!originZoneId || !destinationZoneId) {
      console.warn(`  Zone not found for corridor ${corridor.name}, skipping`);
      continue;
    }
    const existing = await prisma.corridor.findFirst({ where: { name: corridor.name } });
    if (!existing) {
      const created = await prisma.corridor.create({
        data: {
          id: ulid(),
          name: corridor.name,
          originCity: corridor.originCity,
          destinationCity: corridor.destinationCity,
          originZoneId: originZoneId,
          destinationZoneId: destinationZoneId,
          distanceKm: corridor.distanceKm,
          corridorType: corridor.corridorType,
          averageTransitMinutes: corridor.averageTransitMinutes,
          peakHourMultiplier: corridor.peakHourMultiplier,
          roadConditionScore: corridor.roadConditionScore,
          isNightTimeRestricted: corridor.isNightTimeRestricted,
          expectedCheckpointFeeEtb: corridor.expectedCheckpointFeeEtb,
          region: corridor.region
        }
      });
      corridorIdMap.set(corridor.name, created.id);
      console.log(`  Created corridor: ${corridor.name}`);
    } else {
      corridorIdMap.set(corridor.name, existing.id);
      console.log(`  Skipped corridor (exists): ${corridor.name}`);
    }
  }
  console.log(`✅ Corridors seeded (${corridors.length} records)`);

  // ============================================
  // SEED GROUP 5: CheckpointIntelligence (6 records)
  // ============================================
  console.log('Seeding CheckpointIntelligence...');
  const checkpoints = [
    { corridorName: 'ADDIS_ADAMA', locationName: 'Kality Weighbridge', lat: new Prisma.Decimal(8.9150), lng: new Prisma.Decimal(38.7580), checkpointType: 'WEIGHBRIDGE', averageFeeEtb: 50000, maxFeeEtb: 150000, isOfficialToll: true },
    { corridorName: 'ADDIS_ADAMA', locationName: 'Mojo Police Check', lat: new Prisma.Decimal(8.5900), lng: new Prisma.Decimal(39.1200), checkpointType: 'POLICE', averageFeeEtb: 20000, maxFeeEtb: 50000, isOfficialToll: false },
    { corridorName: 'ADDIS_HAWASSA', locationName: 'Hawassa Entrance Toll', lat: new Prisma.Decimal(7.0800), lng: new Prisma.Decimal(38.4900), checkpointType: 'TOLL', averageFeeEtb: 30000, maxFeeEtb: 30000, isOfficialToll: true },
    { corridorName: 'ADDIS_HAWASSA', locationName: 'Modjo Junction Police', lat: new Prisma.Decimal(8.5600), lng: new Prisma.Decimal(39.1000), checkpointType: 'POLICE', averageFeeEtb: 15000, maxFeeEtb: 40000, isOfficialToll: false },
    { corridorName: 'ADDIS_DIRE_DAWA', locationName: 'Dire Dawa City Boundary', lat: new Prisma.Decimal(9.5900), lng: new Prisma.Decimal(41.8500), checkpointType: 'CITY_BOUNDARY', averageFeeEtb: 10000, maxFeeEtb: 10000, isOfficialToll: false },
    { corridorName: 'ADDIS_BAHIR_DAR', locationName: 'Sendafa Weighbridge', lat: new Prisma.Decimal(9.1400), lng: new Prisma.Decimal(39.0200), checkpointType: 'WEIGHBRIDGE', averageFeeEtb: 50000, maxFeeEtb: 150000, isOfficialToll: true }
  ];

  for (const cp of checkpoints) {
    const corridorId = corridorIdMap.get(cp.corridorName);
    if (!corridorId) {
      console.warn(`  Corridor ${cp.corridorName} not found, skipping checkpoint ${cp.locationName}`);
      continue;
    }
    const existing = await prisma.checkpointIntelligence.findFirst({
      where: { corridorId: corridorId, locationName: cp.locationName }
    });
    if (!existing) {
      await prisma.checkpointIntelligence.create({
        data: {
          id: ulid(),
          corridorId: corridorId,
          lat: cp.lat,
          lng: cp.lng,
          checkpointType: cp.checkpointType,
          locationName: cp.locationName,
          averageFeeEtb: cp.averageFeeEtb,
          maxFeeEtb: cp.maxFeeEtb,
          isOfficialToll: cp.isOfficialToll,
          reportCount: 1
        }
      });
      console.log(`  Created checkpoint: ${cp.locationName}`);
    } else {
      console.log(`  Skipped checkpoint (exists): ${cp.locationName}`);
    }
  }
  console.log('✅ CheckpointIntelligence seeded (6 records)');

  // ============================================
  // SEED GROUP 6: FuelPriceSnapshot (5 records)
  // ============================================
  console.log('Seeding FuelPriceSnapshot...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fuelSnapshots = [
    { region: 'CENTRAL', dieselPrice: 85.50 },
    { region: 'NORTH', dieselPrice: 87.00 },
    { region: 'SOUTH', dieselPrice: 86.00 },
    { region: 'EAST', dieselPrice: 88.50 },
    { region: 'WEST', dieselPrice: 86.50 }
  ];

  for (const snapshot of fuelSnapshots) {
    const existing = await prisma.fuelPriceSnapshot.findFirst({
      where: { region: snapshot.region, recordedAt: { gte: today, lt: tomorrow } }
    });
    if (!existing) {
      await prisma.fuelPriceSnapshot.create({
        data: {
          id: ulid(),
          dieselPriceEtbPerLiter: new Prisma.Decimal(snapshot.dieselPrice),
          region: snapshot.region,
          source: 'MANUAL'
        }
      });
      console.log(`  Created fuel snapshot: ${snapshot.region}`);
    } else {
      console.log(`  Skipped fuel snapshot (exists): ${snapshot.region}`);
    }
  }
  console.log('✅ FuelPriceSnapshot seeded (5 records)');

  // ============================================
  // SEED GROUP 7: EthiopianCalendarEvent (4 records)
  // ============================================
  console.log('Seeding EthiopianCalendarEvent...');
  const calendarEvents = [
    { eventName: 'GENNA', eventNameAmh: 'ገና', gregorianDate: new Date('2026-01-07'), demandImpact: '-0.4', affectedRegions: ['CENTRAL', 'NORTH', 'SOUTH', 'EAST', 'WEST'], isRecurring: true, year: 2026 },
    { eventName: 'FASIKA', eventNameAmh: 'ፋሲካ', gregorianDate: new Date('2026-04-19'), demandImpact: '-0.5', affectedRegions: ['CENTRAL', 'NORTH', 'SOUTH', 'EAST', 'WEST'], isRecurring: true, year: 2026 },
    { eventName: 'MESKEL', eventNameAmh: 'መስቀል', gregorianDate: new Date('2025-09-27'), demandImpact: '-0.3', affectedRegions: ['CENTRAL', 'SOUTH'], isRecurring: true, year: 2025 },
    { eventName: 'MAWLID', eventNameAmh: 'ማውሊድ', gregorianDate: new Date('2026-06-07'), demandImpact: '-0.35', affectedRegions: ['EAST', 'CENTRAL'], isRecurring: true, year: 2026 }
  ];

  for (const evt of calendarEvents) {
    const existing = await prisma.ethiopianCalendarEvent.findFirst({
      where: { eventName: evt.eventName, year: evt.year }
    });
    if (!existing) {
      await prisma.ethiopianCalendarEvent.create({
        data: {
          id: ulid(),
          eventName: evt.eventName,
          eventNameAmh: evt.eventNameAmh,
          gregorianDate: evt.gregorianDate,
          ethiopianDate: null,
          demandImpact: evt.demandImpact,
          affectedRegions: evt.affectedRegions,
          isRecurring: evt.isRecurring,
          year: evt.year
        }
      });
      console.log(`  Created calendar event: ${evt.eventName}`);
    } else {
      console.log(`  Skipped calendar event (exists): ${evt.eventName}`);
    }
  }
  console.log('✅ EthiopianCalendarEvent seeded (4 records)');

  // ============================================
  // SEED GROUP 8: StrategyConfig (1 record)
  // ============================================
  console.log('Seeding StrategyConfig...');
  const existingStrategyConfig = await prisma.strategyConfig.findFirst({
    where: { versionName: 'v1.0-isuzet-inland' }
  });
  if (!existingStrategyConfig) {
    await prisma.strategyConfig.create({
      data: {
        id: ulid(),
        versionName: 'v1.0-isuzet-inland',
        configJson: {},
        isActive: true,
        activatedAt: new Date(),
        notes: 'Initial configuration. All values from DEFAULT_CONFIG baseline.'
      }
    });
    console.log('✅ StrategyConfig created');
  } else {
    console.log('⏭️ StrategyConfig already exists');
  }
  console.log('✅ StrategyConfig seeded (1 record)');

  // ============================================
  // SEED GROUP 9: MarketDays (Phase 8)
  // ============================================
  console.log('Seeding MarketDays...');
  
  const marketDays = [
    // Merkato Addis - Every day (Monday through Saturday = 1-6)
    { zoneName: 'MERKATO', marketName: 'Merkato', dayOfWeek: 1, demandBoostPct: 12 },
    { zoneName: 'MERKATO', marketName: 'Merkato', dayOfWeek: 2, demandBoostPct: 12 },
    { zoneName: 'MERKATO', marketName: 'Merkato', dayOfWeek: 3, demandBoostPct: 12 },
    { zoneName: 'MERKATO', marketName: 'Merkato', dayOfWeek: 4, demandBoostPct: 12 },
    { zoneName: 'MERKATO', marketName: 'Merkato', dayOfWeek: 5, demandBoostPct: 12 },
    { zoneName: 'MERKATO', marketName: 'Merkato', dayOfWeek: 6, demandBoostPct: 12 },
    
    // Jimma: Tuesday (2) and Saturday (6)
    { zoneName: 'JIMMA', marketName: 'Jimma Market', dayOfWeek: 2, demandBoostPct: 15 },
    { zoneName: 'JIMMA', marketName: 'Jimma Market', dayOfWeek: 6, demandBoostPct: 15 },
    
    // Hawassa: Monday (1) and Thursday (4)
    { zoneName: 'HAWASSA', marketName: 'Hawassa Market', dayOfWeek: 1, demandBoostPct: 11 },
    { zoneName: 'HAWASSA', marketName: 'Hawassa Market', dayOfWeek: 4, demandBoostPct: 11 },
    
    // Bahir Dar: Saturday (6)
    { zoneName: 'BAHIR_DAR', marketName: 'Bahir Dar Market', dayOfWeek: 6, demandBoostPct: 12 },
    
    // Gondar: Monday (1) and Friday (5)
    { zoneName: 'GONDAR', marketName: 'Gondar Market', dayOfWeek: 1, demandBoostPct: 11 },
    { zoneName: 'GONDAR', marketName: 'Gondar Market', dayOfWeek: 5, demandBoostPct: 11 },
    
    // Dire Dawa: Every day (Sunday through Saturday = 0-6)
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 0, demandBoostPct: 13 },
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 1, demandBoostPct: 13 },
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 2, demandBoostPct: 13 },
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 3, demandBoostPct: 13 },
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 4, demandBoostPct: 13 },
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 5, demandBoostPct: 13 },
    { zoneName: 'DIRE_DAWA', marketName: 'Dire Dawa Market', dayOfWeek: 6, demandBoostPct: 13 },
    
    // Adama: Wednesday (3) and Sunday (0)
    { zoneName: 'ADAMA', marketName: 'Adama Market', dayOfWeek: 3, demandBoostPct: 10 },
    { zoneName: 'ADAMA', marketName: 'Adama Market', dayOfWeek: 0, demandBoostPct: 10 },
    
    // Ambo: Thursday (4)
    { zoneName: 'AMBO', marketName: 'Ambo Market', dayOfWeek: 4, demandBoostPct: 11 },
    
    // Wolkite: Wednesday (3)
    { zoneName: 'WOLKITE', marketName: 'Wolkite Market', dayOfWeek: 3, demandBoostPct: 13 },
    
    // Ziway: Monday (1) and Thursday (4)
    { zoneName: 'ZIWAY', marketName: 'Ziway Market', dayOfWeek: 1, demandBoostPct: 15 },
    { zoneName: 'ZIWAY', marketName: 'Ziway Market', dayOfWeek: 4, demandBoostPct: 15 },
    
    // Shashemene: Monday (1)
    { zoneName: 'SHASHEMENE', marketName: 'Shashemene Market', dayOfWeek: 1, demandBoostPct: 14 },
    
    // Nekemte: Saturday (6)
    { zoneName: 'NEKEMTE', marketName: 'Nekemte Market', dayOfWeek: 6, demandBoostPct: 12 },
    
    // Meki: Wednesday (3)
    { zoneName: 'MEKI', marketName: 'Meki Market', dayOfWeek: 3, demandBoostPct: 14 },
    
    // Asella: Saturday (6)
    { zoneName: 'ASELLA', marketName: 'Asella Market', dayOfWeek: 6, demandBoostPct: 12 }
  ];

  for (const md of marketDays) {
    const zoneId = zoneIdMap.get(md.zoneName);
    if (!zoneId) {
      console.warn(`  Zone ${md.zoneName} not found, skipping market day ${md.marketName}`);
      continue;
    }
    const existing = await (prisma as any).marketDay.findFirst({
      where: { zoneId: zoneId, dayOfWeek: md.dayOfWeek }
    });
    if (!existing) {
      await (prisma as any).marketDay.create({
        data: {
          id: ulid(),
          zoneId: zoneId,
          dayOfWeek: md.dayOfWeek,
          marketName: md.marketName,
          demandBoostPct: md.demandBoostPct,
          peakLoadingHour: 6
        }
      });
      console.log(`  Created market day: ${md.marketName} (${md.zoneName}, day ${md.dayOfWeek})`);
    } else {
      console.log(`  Skipped market day (exists): ${md.marketName} (${md.zoneName}, day ${md.dayOfWeek})`);
    }
  }
  console.log(`✅ MarketDays seeded (${marketDays.length} records)`);

  // ============================================
  // SEED GROUP 10: SecurityZones (Phase 8)
  // ============================================
  console.log('Seeding SecurityZones...');
  
  for (const zoneEntry of zoneIdMap) {
    const zoneName = zoneEntry[0];
    const zoneId = zoneEntry[1];
    
    // Find any corridor that passes through this zone
    const corridor = await prisma.corridor.findFirst({
      where: {
        OR: [
          { originZoneId: zoneId },
          { destinationZoneId: zoneId }
        ]
      }
    });
    
    if (corridor) {
      const existing = await (prisma as any).securityZone.findFirst({
        where: { corridorId: corridor.id }
      });
      if (!existing) {
        await (prisma as any).securityZone.create({
          data: {
            id: ulid(),
            corridorId: corridor.id,
            status: 'NORMAL',
            description: `Security zone for ${zoneName}`,
            dataSource: 'SEED'
          }
        });
        console.log(`  Created security zone for: ${zoneName}`);
      } else {
        console.log(`  Skipped security zone (exists): ${zoneName}`);
      }
    }
  }
  console.log('✅ SecurityZones seeded for all zones');

  console.log('\n🎉 Phase 8 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
