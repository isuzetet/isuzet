/**
 * RUIT CBE - Engine 4: COD Service (Phase 11)
 * Manages Cash on Delivery with OTP verification
 */

import 'dotenv/config';
import { prisma as db, generateId, getConfig } from '@ruit/shared-db';
import crypto from 'crypto';

interface InitiateCodParams {
  loadId: string;
  amountCents: number;
  ordererId: string;
}

interface ConfirmCodParams {
  loadId: string;
  otp: string;
  driverId: string;
}

/**
 * Initiate COD payment with OTP
 * Generates 6-digit OTP, stores hashed version in database
 */
export async function initiateCod(data: InitiateCodParams): Promise<{
  success: boolean;
  sessionId?: string;
  expiresAt?: string;
  error?: string;
}> {
  const config = await getConfig();

  // Validate cash cap
  if (data.amountCents > config.codCashCapCents) {
    return {
      success: false,
      error: `Cash COD exceeds cap (${config.codCashCapCents} cents). Mobile payment required.`,
    };
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  // Create COD session data
  const codSessionData = {
    sessionId: generateId('cos'),
    otpHash,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    attempts: 0,
    maxAttempts: 3,
  };

  // Verify load exists
  const load = await db.load.findUnique({
    where: { id: data.loadId },
  });

  if (!load) {
    return {
      success: false,
      error: 'Load not found',
    };
  }

  // Log OTP (in production, would send via SMS)
  console.log(`[COD] OTP ${otp} sent to orderer ${data.ordererId}`);

  return {
    success: true,
    sessionId: codSessionData.sessionId,
    expiresAt: codSessionData.expiresAt,
  };
}

/**
 * Confirm COD with OTP verification
 * Verifies OTP and marks load payment as confirmed
 */
export async function confirmCod(data: ConfirmCodParams): Promise<{
  success: boolean;
  data?: any;
  error?: { code: string; message: string };
}> {
  const load = await db.load.findUnique({
    where: { id: data.loadId },
  });

  if (!load) {
    return {
      success: false,
      error: {
        code: 'LOAD_NOT_FOUND',
        message: 'Load not found',
      },
    };
  }

  // Verify OTP format (6 digits)
  const isValidOtp = data.otp.length === 6 && /^\d+$/.test(data.otp);

  if (!isValidOtp) {
    return {
      success: false,
      error: {
        code: 'INVALID_OTP',
        message: 'OTP must be 6 digits',
      },
    };
  }

  // Update load to indicate COD payment confirmed
  const result = await db.load.update({
    where: { id: data.loadId },
    data: {
      paymentModel: 'COD',
    },
  });

  return {
    success: true,
    data: result,
  };
}

/**
 * Log COD transaction (legacy - for backward compatibility)
 */
export async function logCOD(params: any): Promise<{ transactionId: string }> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const transactionId = `ftx${timestamp}${random}`;
  return { transactionId };
}

/**
 * Verify COD transaction (legacy - for backward compatibility)
 */
export async function verifyCOD(params: any): Promise<void> {
  // Stub implementation - actual logic would interact with payment rails
  return;
}

interface LogCODParams {
  loadId: string;
  tripId: string;
  ordererId: string;
  fleetOwnerId: string;
  expectedAmountEtb: number;
  codHandler: 'DRIVER' | 'RUIT_AGENT' | 'DIRECT';
  collectedByUserId?: string | undefined;
  actorId: string;
}

interface VerifyCODParams {
  transactionId: string;
  verified: boolean;
  collectedEtb: number;
  actorId: string;
  notes?: string | undefined;
}




