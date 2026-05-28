import { SignJWT, jwtVerify, KeyLike } from 'jose';
import { Redis } from 'ioredis';
import { ulid } from 'ulid';
import { ROLES, type Role } from '@ruit/shared-types';
import { createPrivateKey, createPublicKey } from 'crypto';

// Define AccessTokenPayload inline to avoid dependency issue
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  entity_id: string;
  entity_type: string;
  trust_tier: number;
  iat: number;
  exp: number;
  jti: string;
}

// Re-export from encrypt.ts
export { encryptPII, decryptPII } from './encrypt';

// Re-export from otp.ts
export { generateOtp } from './otp';

// Custom storeOtp and verifyOtp that don't require Redis parameter
import { storeOtp as storeOtpBase, verifyOtp as verifyOtpBase } from './otp';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function getPrivateKey(): Promise<KeyLike> {
  const fs = await import('fs');
  const keyPath = process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem';
  const key = fs.readFileSync(keyPath, 'utf-8');
  return createPrivateKey(key) as KeyLike;
}

async function getPublicKey(): Promise<KeyLike> {
  const fs = await import('fs');
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';
  const key = fs.readFileSync(keyPath, 'utf-8');
  return createPublicKey(key) as KeyLike;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const jti = ulid();
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setJti(jti)
    .sign(await getPrivateKey());
}

export async function signRefreshToken(userId: string): Promise<string> {
  const jti = ulid();
  const token = await new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(jti)
    .sign(await getPrivateKey());
  await redis.setex(`refresh:${jti}`, 2592000, userId);
  return token;
}

export async function verifyToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, await getPublicKey());
  const jti = payload.jti as string;
  const revoked = await redis.get(`revoked:${jti}`);
  if (revoked) throw new Error('Token revoked');
  return payload as unknown as AccessTokenPayload;
}

// Alias for verifyToken
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  return verifyToken(token);
}

export async function revokeToken(jti: string): Promise<void> {
  await redis.setex(`revoked:${jti}`, 86400, '1');
}

export function requireAuth() {
  return async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const token = authHeader.substring(7);
    try {
      const payload = await verifyToken(token);
      request.user = payload;
    } catch (error) {
      reply.status(401).send({ error: 'Invalid token' });
      return;
    }
  };
}

export function requireRole(roles: string[]) {
  return async (request: any, reply: any) => {
    const userRole = request.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }
  };
}

/**
 * KYC Tier Gates Middleware
 * 
 * KYC Tier Requirements:
 * - Tier 0: Phone + name registered (Layer 0 - public endpoints only)
 * - Tier 1: One document photo uploaded (Layer 1 - fleet tools, USSD, off-platform logger)
 * - Tier 2: Full document verification (Layer 2 - marketplace features)
 */
export function requireKycTier(minTier: number) {
  return async (request: any, reply: any) => {
    // For now, read from the access token's trust_tier (we'll need to fetch actual kycTier from DB)
    // In a full implementation, you'd want to query the User table to get the current kycTier
    
    if (!request.user?.sub) {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    // Fetch user's current KYC tier from database
    const { prisma } = await import('@ruit/shared-db');
    const user = await (prisma as any).user.findUnique({
      where: { id: request.user.sub },
      select: { kycTier: true }
    });

    if (!user) {
      reply.status(401).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
      return;
    }

    const currentTier = user.kycTier || 0;

    if (currentTier < minTier) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'KYC_TIER_REQUIRED',
          requiredTier: minTier,
          currentTier: currentTier,
          message: `Complete document verification to access this feature. Required: Tier ${minTier}, Current: Tier ${currentTier}`
        }
      });
      return;
    }
  };
}

// Wrapper functions for OTP that use internal redis client
export async function storeOtp(phone: string, otp: string): Promise<void> {
  return storeOtpBase(redis, phone, otp);
}

export async function verifyOtp(phone: string, otp: string): Promise<{ valid: boolean; error?: 'OTP_EXPIRED' | 'OTP_INVALID' | 'OTP_LOCKOUT' }> {
  return verifyOtpBase(redis, phone, otp);
}

export function normalizePhone(phone: string): string {
  const stripped = phone.replace(/^0/, '');
  if (stripped.startsWith('+251')) return stripped;
  if (stripped.startsWith('251')) return `+${stripped}`;
  return `+251${stripped}`;
}

export const FLEET_MANAGER_ALLOWED_ROUTES = [
  'loads:read', 'loads:assign', 'trucks:read', 
  'drivers:read', 'trips:manage', 'incidents:report'
];

// Expose redis client for consumers that need direct access
export { redis };
