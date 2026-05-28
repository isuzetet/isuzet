/**
 * RUIT CBE — Engine 1 Identity Authentication Routes
 * Register, OTP verification, refresh, logout
 */
import { FastifyInstance } from 'fastify';
import { Type as T } from '@fastify/type-provider-typebox';
import { Redis } from 'ioredis';
import { prisma } from '@ruit/shared-db';
import { ROLES, EVENT_TYPES } from '@ruit/shared-types';
import { signAccessToken, signRefreshToken, verifyAccessToken, generateOtp, normalizePhone, encryptPII, storeOtp, verifyOtp } from '@ruit/shared-auth';
import { formatDateResponse } from '@ruit/shared-utils';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface JwtPayload {
  sub: string;
  jti: string;
}

// Generate referral code helper
function generateReferralCode(userId: string): string {
  return `RUIT${userId.slice(-6).toUpperCase()}`;
}

// SMS message templates in multiple languages
const SMS_TEMPLATES = {
  OTP_VERIFICATION: {
    am: (otp: string) => `የ RUIT ማረጋገጫ ኮድ: ${otp} ነው። በ 5 ደቂቃ ውስጥ ይጠቀሙ።`,
    en: (otp: string) => `Your RUIT verification code is: ${otp}. Use it within 5 minutes.`
  },
  LOAD_OFFER: {
    am: (route: string, rate: number) => `ዲቅ በ ${route} ላይ ሸክሙ ቅበላ ${rate} ETB። ወስደ? 1 ግሪድ, 2 ሚยወ`,
    en: (route: string, rate: number) => `New load: ${route} at ETB ${rate}/kg. Reply 1 to accept, 2 to decline.`
  }
};

// Send SMS via notification-engine
async function sendSms(phone: string, message: string, preferredLanguage: string = 'am'): Promise<boolean> {
  try {
    const smsBody = {
      phone: normalizePhone(phone),
      message: message,
      template: null
    };
    const response = await fetch('http://localhost:3013/internal/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smsBody)
    });
    return response.ok;
  } catch (error) {
    console.error('SMS send failed:', error);
    // In dev mode, log to console
    if (!process.env.AFRICAS_TALKING_API_KEY) {
      console.log(`[SMS MOCK] To: ${phone}, Message: ${message}`);
      return true;
    }
    return false;
  }
}

// Emit event helper
async function emitEvent(params: {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { ulid } = await import('ulid');
  const strategyId = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    select: { id: true }
  }).then((s: { id: string } | null) => s?.id ?? 'str_default');

  await prisma.event.create({
    data: {
      id: ulid(),
      eventType: params.eventType,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      strategyVersionId: strategyId,
      payload: params.payload as any,
      metadata: { source: 'API', timestamp: new Date().toISOString() } as any
    }
  });
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  // Auth: PUBLIC
  app.post('/register', {
    schema: {
      body: T.Object({
        phone: T.String({ minLength: 9, maxLength: 15 }),
        fullName: T.String({ minLength: 2, maxLength: 200 }),
        role: T.Union([
          T.Literal(ROLES.FLEET_OWNER),
          T.Literal(ROLES.DRIVER),
          T.Literal(ROLES.ORDERER)
        ]),
        referredByCode: T.Optional(T.String()),
        isOwnerOperator: T.Optional(T.Boolean()),
        companyName: T.Optional(T.String({ maxLength: 200 })),
        businessLicense: T.Optional(T.String()),
        licenseNumber: T.Optional(T.String()),
        licenseExpiry: T.Optional(T.String()),
        homeCorridorId: T.Optional(T.String()),
        plateNumber: T.Optional(T.String()),
        bodyType: T.Optional(T.String()),
        capacityKg: T.Optional(T.Number()),
        preferredLanguage: T.Optional(T.String()),
        simNameMismatchDetected: T.Optional(T.Boolean())
      })
    }
  }, async (request: any, reply: any) => {
    const { phone, fullName, role, referredByCode, isOwnerOperator, companyName, businessLicense, licenseNumber, licenseExpiry, homeCorridorId, plateNumber, bodyType, capacityKg, preferredLanguage, simNameMismatchDetected } = request.body;
    const normalizedPhone = normalizePhone(phone);
    const language = preferredLanguage || 'am';

    // Check if phone exists (not soft-deleted)
    const existing = await prisma.user.findFirst({
      where: { phone: normalizedPhone, deletedAt: { equals: null } }
    });
    if (existing) {
      return reply.status(409).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Account exists. Please log in.' } });
    }

    // Check referrer if provided
    let referredById: string | undefined;
    if (referredByCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } });
      if (referrer) { referredById = referrer.id; }
    }

    const { ulid } = await import('ulid');
    const userId = ulid();
    const referralCode = generateReferralCode(userId);
    const actualRole = isOwnerOperator ? ROLES.DRIVER : role;
    const otp = generateOtp();

    // Transaction: create user, entity, notification preferences
    await prisma.$transaction(async (tx: any) => {
      await tx.user.create({
        data: {
          id: userId,
          phone: normalizedPhone,
          fullName: fullName,
          role: actualRole,
          status: 'PENDING_KYC',
          kycTier: 0,
          preferredLanguage: language,
          notificationChannel: 'SMS',
          referralCode: referralCode,
          referredById: referredById,
          isOwnerOperator: isOwnerOperator || false,
          simNameMismatch: simNameMismatchDetected || false
        }
      });

      if (actualRole === ROLES.FLEET_OWNER) {
        await tx.fleetOwner.create({
          data: { id: ulid(), userId: userId, companyName: companyName || fullName }
        });
      } else if (actualRole === ROLES.DRIVER) {
        const driver = await tx.driver.create({
          data: {
            id: ulid(),
            userId: userId,
            licenseNumber: licenseNumber || 'PENDING',
            licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : new Date('2099-12-31'),
            licenseClass: 'C',
            homeZoneId: homeCorridorId || null,
            availabilityStatus: 'AVAILABLE',
          }
        });
        if (isOwnerOperator) {
          const fleetOwnerId = ulid();
          await tx.fleetOwner.create({
            data: { id: fleetOwnerId, userId: userId, companyName: companyName || fullName }
          });
          await tx.truck.create({
            data: {
              id: ulid(),
              fleetOwnerId,
              plateNumber: plateNumber || `T-${userId.slice(-6)}`,
              bodyType: bodyType || 'FLATBED',
              capacityKg: capacityKg || 10000,
              isEligibleForLoads: false,
            }
          });
        }
      } else if (actualRole === ROLES.ORDERER) {
        await tx.orderer.create({
          data: { id: ulid(), userId: userId, companyName: companyName || fullName }
        });
      }

      await tx.notificationPreference.create({
        data: {
          userId: userId,
          smsEnabled: true,
          pushEnabled: true,
          emailEnabled: false,
          assignmentNotify: 'SMS',
          payoutNotify: 'SMS',
          incidentNotify: 'BOTH',
          marketingNotify: false
        }
      });

      // If SIM name mismatch detected, create a KycDocument for manual review
      if (simNameMismatchDetected) {
        await tx.kycDocument.create({
          data: {
            id: ulid(),
            entityId: userId,
            entityType: 'USER',
            docType: 'SIM_MISMATCH_REVIEW',
            s3Key: `kyc/sim-mismatch/${userId}/${Date.now()}`,
            s3Bucket: 'ruit-documents',
            status: 'PENDING',
            createdAt: new Date()
          }
        });
      }
    });

    await storeOtp(normalizedPhone, otp);
    const message = `የ Ruit ማረጋገጫ ኮድ: ${otp} ነው። በ 5 ደቂቃ ውስጥ ይጠቀሙ።`;
    await sendSms(normalizedPhone, message, language);

    await emitEvent({
      eventType: EVENT_TYPES.USER_REGISTERED,
      aggregateId: userId,
      aggregateType: 'USER',
      actorId: userId,
      actorRole: actualRole,
      payload: { phone: normalizedPhone, fullName, role: actualRole, isOwnerOperator: isOwnerOperator || false, referredBy: referredById ? true : false }
    });

    return { success: true, data: { userId: userId, referralCode: referralCode, otp_sent: true } };
  });

  // POST /api/v1/auth/verify-otp
  app.post('/verify-otp', {
    schema: {
      body: T.Object({
        phone: T.String(),
        otp: T.String({ minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$' })
      })
    }
  }, async (request: any, reply: any) => {
    try {
      const { phone, otp } = request.body;
      const normalizedPhone = normalizePhone(phone);

      const result = await verifyOtp(normalizedPhone, otp);
      if (!result.valid) {
        return reply.status(401).send({ success: false, error: { code: 'OTP_INVALID_OR_EXPIRED', message: 'Invalid or expired OTP' } });
      }

      const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (!user) {
        return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'User not found after OTP verification' } });
      }

      let entityId: string | null = null;
      let entityType: string | null = null;
      let trustTier = 0;
      let isOwnerOperator = user.isOwnerOperator || false;

      if (user.role === ROLES.FLEET_OWNER) {
        const entity = await prisma.fleetOwner.findFirst({ where: { userId: user.id } });
        if (entity) { entityId = entity.id; entityType = 'FLEET_OWNER'; trustTier = entity.trustTier || 0; }
      } else if (user.role === ROLES.DRIVER) {
        const entity = await prisma.driver.findFirst({ where: { userId: user.id } });
        if (entity) { entityId = entity.id; entityType = 'DRIVER'; trustTier = entity.trustTier || 0; }
      } else if (user.role === ROLES.ORDERER) {
        const entity = await prisma.orderer.findFirst({ where: { userId: user.id } });
        if (entity) { entityId = entity.id; entityType = 'ORDERER'; trustTier = 0; }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', kycTier: 1, lastLoginAt: new Date() }
      });

      const accessToken = await signAccessToken({
        sub: user.id,
        role: user.role as any,
        entity_id: entityId || user.id,
        entity_type: (entityType || 'USER') as string,
        trust_tier: trustTier,
        jti: '', iat: 0, exp: 0
      });
      const refreshToken = await signRefreshToken(user.id);

      await emitEvent({
        eventType: EVENT_TYPES.KYC_APPROVED,
        aggregateId: user.id,
        aggregateType: 'USER',
        actorId: user.id,
        actorRole: user.role,
        payload: { kycTier: 1, previous_tier: 0, reason: 'phone_verified', isOwnerOperator: isOwnerOperator }
      });

      return {
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            id: user.id,
            entityId: entityId,
            entityType: entityType,
            role: user.role,
            trustTier: trustTier,
            kycTier: 1,
            isOwnerOperator: isOwnerOperator,
            referralCode: user.referralCode
          }
        }
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'OTP verification failed' } });
    }
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', {
    schema: { body: T.Object({ refresh_token: T.String() }) }
  }, async (request: any, reply: any) => {
    const { refresh_token } = request.body;
    try {
      const payload = await verifyAccessToken(refresh_token) as JwtPayload;
      const jti = payload.jti;
      const storedUserId = await redis.get(`refresh:${jti}`);
      if (!storedUserId) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Refresh token revoked or expired' } });
      }
      await redis.del(`refresh:${jti}`);

      const user = await prisma.user.findUnique({ where: { id: storedUserId }, include: { fleetOwner: true, driver: true, orderer: true } });
      if (!user) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } });
      }

      let entityId = user.id;
      let entityType = 'USER';
      let trustTier = 0;
      if (user.fleetOwner) { entityId = user.fleetOwner.id || user.id; entityType = 'FLEET_OWNER'; trustTier = user.fleetOwner.trustTier; }
      else if (user.driver) { entityId = user.driver.id || user.id; entityType = 'DRIVER'; trustTier = user.driver.trustTier; }
      else if (user.orderer) { entityId = user.orderer.id || user.id; entityType = 'ORDERER'; }

      const newAccessToken = await signAccessToken({
        sub: user.id, role: user.role as any,
        entity_id: entityId, entity_type: entityType as string,
        trust_tier: trustTier, jti: '', iat: 0, exp: 0
      });
      const newRefreshToken = await signRefreshToken(user.id);

      return { success: true, data: { access_token: newAccessToken, refresh_token: newRefreshToken } };
    } catch (error) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } });
    }
  });

  // POST /api/v1/auth/logout
  app.post('/logout', {
    preHandler: (app as any).requireRole([ROLES.FLEET_OWNER, ROLES.DRIVER, ROLES.ORDERER, ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN])
  }, async (request: any, reply: any) => {
    const user = request.user;
    const body = request.body || {};
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = await verifyAccessToken(token) as JwtPayload;
        await redis.setex(`revoked:${payload.jti}`, 900, '1');
      } catch { /* Ignore */ }
    }
    if (body.refresh_token) {
      try {
        const payload = await verifyAccessToken(body.refresh_token) as JwtPayload;
        await redis.del(`refresh:${payload.jti}`);
      } catch { /* Ignore */ }
    }
    return { success: true };
  });
}
