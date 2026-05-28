/**
 * ISUZET Waybill Service
 * Handles digital waybill generation with QR codes
 */

import { prisma as db } from '@ruit/shared-db';
import { toDataURL as qrToDataURL } from 'qrcode';

// ════════════════════════════════════════════════════════════════════════════
// LOCAL INTERFACES
// ════════════════════════════════════════════════════════════════════════════

interface WaybillData {
  waybillNumber: string;
  tripId: string;
  loadId: string;
  shipperName: string;
  shipperPhone: string;
  shipperAddress: string;
  consigneeName: string;
  consigneePhone: string;
  consigneeAddress: string;
  cargoDescription: string;
  declaredWeightKg: number;
  originName: string;
  destinationName: string;
  driverFullName: string;
  driverPhone: string;
  driverLicenseNumber: string;
  plateNumber: string;
  qrCodeData: string;
  verifyUrl: string;
  displayText: string;
  issuedAt: Date;
  specialInstructions?: string;
}

interface WaybillGenerationResult {
  success: boolean;
  waybill?: WaybillData;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const WAYBILL_PREFIX = 'WB';
const VERIFY_BASE_URL = process.env.WAYBILL_VERIFY_URL || 'https://isuzet.com/verify';

// ════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique waybill number
 */
async function generateWaybillNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Get count of waybills today for sequential numbering
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const countToday = await db.digitalWaybill.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  const sequenceNumber = countToday + 1;
  const sequenceStr = sequenceNumber.toString().padStart(6, '0');

  return `${WAYBILL_PREFIX}-${dateStr}-${sequenceStr}`;
}

/**
 * Generate QR code data string for waybill
 */
async function generateQRCodeData(waybillNumber: string, verifyUrl: string): Promise<string> {
  const qrPayload = JSON.stringify({
    waybillNumber,
    verifyUrl
  });

  // Generate QR code as base64 data URL (for logging/display — not stored in DB)
  await qrToDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  return qrPayload;
}

/**
 * Generate digital waybill for a trip
 */
async function generateWaybill(tripId: string): Promise<WaybillGenerationResult> {
  try {
    // Load trip with related data
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        load: {
          include: {
            orderer: {
              include: {
                user: true
              }
            }
          }
        },
        driver: {
          include: {
            user: true
          }
        },
        truck: true
      }
    });

    if (!trip) {
      return {
        success: false,
        error: 'Trip not found'
      };
    }

    // Check if waybill already exists
    const existingWaybill = await db.digitalWaybill.findUnique({
      where: { tripId }
    });

    if (existingWaybill) {
      return {
        success: false,
        error: 'Waybill already exists for this trip'
      };
    }

    // Generate waybill number
    const waybillNumber = await generateWaybillNumber();
    const verifyUrl = `${VERIFY_BASE_URL}/${waybillNumber}`;

    // Resolve shipper info from orderer
    const orderer = trip.load.orderer;
    const shipperName = orderer.companyName || orderer.user.fullName;
    const shipperPhone = orderer.user.phone || '';
    const shipperAddress = trip.load.originAddress || trip.load.originCity;

    // Resolve driver info
    const driverFullName = trip.driver.user.fullName;
    const driverPhone = trip.driver.user.phone || '';
    const driverLicenseNumber = trip.driver.licenseNumber || '';

    // Generate QR code data
    const qrCodeData = await generateQRCodeData(waybillNumber, verifyUrl);

    const issuedAt = new Date();
    const displayText = [
      'ISUZET ዲጂታል ዌቢል',
      `ቁጥር: ${waybillNumber}`,
      '─────────────────',
      `ላኪ: ${shipperName}`,
      `ተቀባይ: ${trip.load.orderer?.companyName ?? 'ተቀባይ'}`,
      '─────────────────',
      `ከ: ${trip.load.originCity}`,
      `ወደ: ${trip.load.destinationCity}`,
      '─────────────────',
      `ጭነት: ${trip.load.cargoDescription || trip.load.cargoType}`,
      `ክብደት: ${trip.load.weightKg} ኪሎ`,
      '─────────────────',
      `ሹፌር: ${driverFullName}`,
      `ፕሌት: ${trip.truck.plateNumber}`,
      '─────────────────',
      `ቀን: ${issuedAt.toLocaleDateString('en-GB')}`,
      ...(trip.load.specialInstructions ? [`⚠️ ${trip.load.specialInstructions}`] : []),
      '─────────────────',
      `ለማረጋገጥ: isuzet.com/verify/${waybillNumber}`,
    ].join('\n');

    const waybillData: WaybillData = {
      waybillNumber,
      tripId,
      loadId: trip.loadId,
      shipperName,
      shipperPhone,
      shipperAddress,
      consigneeName: trip.load.cargoDescription || 'Consignee', // Load has no consignee field — use cargo as fallback
      consigneePhone: '',
      consigneeAddress: trip.load.destinationAddress || trip.load.destinationCity,
      cargoDescription: trip.load.cargoDescription || trip.load.cargoType,
      declaredWeightKg: trip.load.weightKg,
      originName: trip.load.originCity,
      destinationName: trip.load.destinationCity,
      driverFullName,
      driverPhone,
      driverLicenseNumber,
      plateNumber: trip.truck.plateNumber,
      qrCodeData,
      verifyUrl,
      issuedAt,
      displayText,
      specialInstructions: trip.load.specialInstructions || ''
    };

    // Save to database
    await db.digitalWaybill.create({
      data: {
        waybillNumber,
        tripId,
        loadId: trip.loadId,
        shipperName: waybillData.shipperName,
        shipperPhone: waybillData.shipperPhone,
        shipperAddress: waybillData.shipperAddress,
        consigneeName: waybillData.consigneeName,
        consigneePhone: waybillData.consigneePhone,
        consigneeAddress: waybillData.consigneeAddress,
        cargoDescription: waybillData.cargoDescription,
        declaredWeightKg: waybillData.declaredWeightKg,
        originName: waybillData.originName,
        destinationName: waybillData.destinationName,
        driverFullName: waybillData.driverFullName,
        driverPhone: waybillData.driverPhone,
        driverLicenseNumber: waybillData.driverLicenseNumber,
        plateNumber: waybillData.plateNumber,
        qrCodeData: waybillData.qrCodeData,
        verifyUrl: waybillData.verifyUrl,
        specialInstructions: waybillData.specialInstructions || undefined
      }
    });

    return {
      success: true,
      waybill: waybillData
    };

  } catch (error) {
    console.error('Generate waybill error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown waybill generation error'
    };
  }
}

/**
 * Get waybill data for display/printing
 */
async function getWaybillForDisplay(waybillNumber: string): Promise<WaybillGenerationResult> {
  try {
    const waybill = await db.digitalWaybill.findUnique({
      where: { waybillNumber }
    });

    if (!waybill) {
      return {
        success: false,
        error: 'Waybill not found'
      };
    }

    const waybillData: WaybillData = {
      waybillNumber: waybill.waybillNumber,
      tripId: waybill.tripId,
      loadId: waybill.loadId,
      shipperName: waybill.shipperName,
      shipperPhone: waybill.shipperPhone || '',
      shipperAddress: waybill.shipperAddress || '',
      consigneeName: waybill.consigneeName,
      consigneePhone: waybill.consigneePhone || '',
      consigneeAddress: waybill.consigneeAddress || '',
      cargoDescription: waybill.cargoDescription,
      declaredWeightKg: Number(waybill.declaredWeightKg),
      originName: waybill.originName,
      destinationName: waybill.destinationName,
      driverFullName: waybill.driverFullName,
      driverPhone: waybill.driverPhone,
      driverLicenseNumber: waybill.driverLicenseNumber || '',
      plateNumber: waybill.plateNumber,
      qrCodeData: waybill.qrCodeData,
      verifyUrl: waybill.verifyUrl,
      issuedAt: waybill.issuedAt,
      specialInstructions: waybill.specialInstructions || '',
      displayText: [
        'ISUZET ዲጂታል ዌቢል',
        `ቁጥር: ${waybill.waybillNumber}`,
        '─────────────────',
        `ላኪ: ${waybill.shipperName}`,
        `ተቀባይ: ${waybill.consigneeName}`,
        '─────────────────',
        `ከ: ${waybill.originName}`,
        `ወደ: ${waybill.destinationName}`,
        '─────────────────',
        `ጭነት: ${waybill.cargoDescription}`,
        `ክብደት: ${waybill.declaredWeightKg} ኪሎ`,
        '─────────────────',
        `ሹፌር: ${waybill.driverFullName}`,
        `ፕሌት: ${waybill.plateNumber}`,
        '─────────────────',
        `ቀን: ${waybill.issuedAt.toLocaleDateString('en-GB')}`,
        ...(waybill.specialInstructions ? [`⚠️ ${waybill.specialInstructions}`] : []),
        '─────────────────',
        `ለማረጋገጥ: isuzet.com/verify/${waybill.waybillNumber}`,
      ].join('\n')
    };

    return {
      success: true,
      waybill: waybillData
    };

  } catch (error) {
    console.error('Get waybill error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown waybill retrieval error'
    };
  }
}

/**
 * Void/cancel a waybill
 */
async function voidWaybill(waybillNumber: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const waybill = await db.digitalWaybill.findUnique({
      where: { waybillNumber }
    });

    if (!waybill) {
      return {
        success: false,
        error: 'Waybill not found'
      };
    }

    if (waybill.voidedAt) {
      return {
        success: false,
        error: 'Waybill is already voided'
      };
    }

    // Void the waybill
    await db.digitalWaybill.update({
      where: { waybillNumber },
      data: {
        voidedAt: new Date(),
        voidReason: reason,
        isActive: false
      }
    });

    return { success: true };

  } catch (error) {
    console.error('Void waybill error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown waybill void error'
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE OBJECT
// ════════════════════════════════════════════════════════════════════════════

export const waybillService = {
  generateWaybill,
  getWaybillForDisplay,
  voidWaybill
};
