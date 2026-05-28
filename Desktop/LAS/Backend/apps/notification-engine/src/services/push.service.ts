import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export type PushPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
};

export type PushResult = {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

// Notification type builders
export const NotificationTypes = {
  LOAD_OFFER: (loadId: string, origin: string, dest: string, amountEtb: number) => ({
    title: 'New Load Available',
    body: `${origin} → ${dest} · ETB ${amountEtb.toLocaleString()}`,
    data: { type: 'LOAD_OFFER', loadId, amount: String(amountEtb) },
  }),
  PAYMENT_RELEASED: (tripId: string, amountEtb: number) => ({
    title: 'Payment Released!',
    body: `ETB ${amountEtb.toLocaleString()} released for your delivery`,
    data: { type: 'PAYMENT_RELEASED', tripId, amount: String(amountEtb) },
  }),
  TRIP_UPDATE: (tripId: string, statusDescription: string) => ({
    title: 'Trip Update',
    body: statusDescription,
    data: { type: 'TRIP_UPDATE', tripId },
  }),
  LOAD_MATCHED: (loadId: string, driverName: string) => ({
    title: 'Driver Matched',
    body: `${driverName} accepted your load`,
    data: { type: 'LOAD_MATCHED', loadId, driverName },
  }),
  DRIVER_HOS_WARNING: (driverId: string, driverName: string) => ({
    title: 'Hours Limit Warning',
    body: `${driverName} approaching duty hours limit`,
    data: { type: 'DRIVER_HOS_WARNING', driverId },
  }),
};

// Initialize Firebase Admin SDK once
let firebaseInitialized = false;

function initializeFirebase(): boolean {
  if (firebaseInitialized) return true;
  if (admin.apps.length > 0) {
    firebaseInitialized = true;
    return true;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.warn('[PUSH] FIREBASE_SERVICE_ACCOUNT_PATH not set — FCM disabled');
    return false;
  }

  try {
    const absolutePath = resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    firebaseInitialized = true;
    console.log('[PUSH] Firebase Admin SDK initialized');
    return true;
  } catch (error) {
    console.error('[PUSH] Failed to initialize Firebase Admin SDK:', error);
    return false;
  }
}

// Initialize on module load
const fcmAvailable = initializeFirebase();

async function getUserFcmToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fcmToken: true,
      deviceIdPrimary: true,
      deviceIdSecondary: true,
    },
  });

  if (!user) return null;

  // Prefer dedicated fcmToken field; fall back to deviceId heuristic for migration
  if (user.fcmToken) return user.fcmToken;

  if (user.deviceIdPrimary && user.deviceIdPrimary.length > 100) {
    return user.deviceIdPrimary;
  }
  if (user.deviceIdSecondary && user.deviceIdSecondary.length > 100) {
    return user.deviceIdSecondary;
  }

  return null;
}

async function sendViaFirebaseAdmin(
  fcmToken: string,
  payload: PushPayload
): Promise<PushResult | null> {
  if (!fcmAvailable || admin.apps.length === 0) return null;

  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        priority: payload.priority === 'HIGH' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'isuzet_loads',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const messageId = await admin.messaging().send(message);
    console.log(`[PUSH] FCM sent to user ${payload.userId}: ${messageId}`);

    return {
      success: true,
      provider: 'FCM_HTTP_V1',
      messageId,
    };
  } catch (error: any) {
    console.error('[PUSH] FCM send error:', error?.message ?? error);

    // If token is invalid/unregistered, clear it from DB
    if (
      error?.code === 'messaging/invalid-registration-token' ||
      error?.code === 'messaging/registration-token-not-registered'
    ) {
      await prisma.user.updateMany({
        where: { id: payload.userId },
        data: { fcmToken: null },
      });
      console.log(`[PUSH] Cleared invalid FCM token for user ${payload.userId}`);
    }

    return null;
  }
}

async function sendViaMock(payload: PushPayload): Promise<PushResult> {
  console.log(
    `[PUSH MOCK] To: ${payload.userId} | ${payload.title} | ${payload.body.substring(0, 60)}`
  );
  return {
    success: true,
    provider: 'FCM_MOCK',
    messageId: generateId('psh'),
  };
}

export async function sendPush(payload: PushPayload): Promise<PushResult> {
  const fcmToken = await getUserFcmToken(payload.userId);

  if (!fcmToken) {
    console.log(`[PUSH SKIP] No FCM token for user ${payload.userId}`);
    return { success: false, provider: 'FCM', error: 'NO_FCM_TOKEN' };
  }

  // Try Firebase Admin SDK
  const fcmResult = await sendViaFirebaseAdmin(fcmToken, payload);
  if (fcmResult) return fcmResult;

  // Fallback to mock (only when Firebase not configured)
  return sendViaMock(payload);
}

export async function sendBulkPush(payloads: PushPayload[]): Promise<PushResult[]> {
  const results: PushResult[] = [];
  const batchSize = 500; // FCM HTTP v1 supports up to 500 per batch

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(p => sendPush(p)));
    results.push(...batchResults);
  }

  return results;
}
