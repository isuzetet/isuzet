import { Redis } from 'ioredis';
import { type Role } from '@ruit/shared-types';
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
export { encryptPII, decryptPII } from './encrypt';
export { generateOtp } from './otp';
declare const redis: Redis;
export declare function signAccessToken(payload: AccessTokenPayload): Promise<string>;
export declare function signRefreshToken(userId: string): Promise<string>;
export declare function verifyToken(token: string): Promise<AccessTokenPayload>;
export declare function verifyAccessToken(token: string): Promise<AccessTokenPayload>;
export declare function revokeToken(jti: string): Promise<void>;
export declare function requireAuth(): (request: any, reply: any) => Promise<void>;
export declare function requireRole(roles: string[]): (request: any, reply: any) => Promise<void>;
export declare function storeOtp(phone: string, otp: string): Promise<void>;
export declare function verifyOtp(phone: string, otp: string): Promise<{
    valid: boolean;
    error?: 'OTP_EXPIRED' | 'OTP_INVALID' | 'OTP_LOCKOUT';
}>;
export declare function normalizePhone(phone: string): string;
export declare const FLEET_MANAGER_ALLOWED_ROUTES: string[];
export { redis };
//# sourceMappingURL=index.d.ts.map