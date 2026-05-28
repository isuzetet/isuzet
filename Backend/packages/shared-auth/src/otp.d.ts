import { Redis } from 'ioredis';
export declare function generateOtp(): string;
export declare function storeOtp(redis: Redis, phone: string, otp: string): Promise<void>;
export declare function verifyOtp(redis: Redis, phone: string, otp: string): Promise<{
    valid: boolean;
    error?: 'OTP_EXPIRED' | 'OTP_INVALID' | 'OTP_LOCKOUT';
}>;
//# sourceMappingURL=otp.d.ts.map