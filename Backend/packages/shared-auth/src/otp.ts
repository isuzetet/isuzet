import { Redis } from 'ioredis';

const OTP_TTL = parseInt(process.env.OTP_TTL_SECONDS || '300');
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
const LOCKOUT_TTL = 1800; // 30 minutes

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOtp(
  redis: Redis,
  phone: string,
  otp: string
): Promise<void> {
  await redis.setex(`otp:${phone}`, OTP_TTL, otp);
  await redis.del(`otp:attempts:${phone}`);
}

export async function verifyOtp(
  redis: Redis,
  phone: string,
  otp: string
): Promise<{ valid: boolean; error?: 'OTP_EXPIRED' | 'OTP_INVALID' | 'OTP_LOCKOUT' }> {
  // Check lockout
  const lockout = await redis.get(`otp:lockout:${phone}`);
  if (lockout) return { valid: false, error: 'OTP_LOCKOUT' };

  // Get stored OTP
  const stored = await redis.get(`otp:${phone}`);
  if (!stored) return { valid: false, error: 'OTP_EXPIRED' };

  // Increment attempts
  const attempts = await redis.incr(`otp:attempts:${phone}`);
  await redis.expire(`otp:attempts:${phone}`, OTP_TTL);

  if (attempts > OTP_MAX_ATTEMPTS) {
    await redis.setex(`otp:lockout:${phone}`, LOCKOUT_TTL, '1');
    await redis.del(`otp:${phone}`);
    return { valid: false, error: 'OTP_LOCKOUT' };
  }

  if (stored !== otp) return { valid: false, error: 'OTP_INVALID' };

  // Valid — clean up
  await redis.del(`otp:${phone}`);
  await redis.del(`otp:attempts:${phone}`);
  return { valid: true };
}
