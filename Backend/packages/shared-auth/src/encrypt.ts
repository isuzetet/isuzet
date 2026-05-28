/**
 * RUIT CBE — PII Encryption Utilities
 * AES-256-GCM encryption for PII fields
 * Per PRD Section 11.1
 */
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Falls back to a development key (NOT for production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.AWS_KMS_KEY_ID;
  if (!key) {
    // Development fallback - 32 bytes for AES-256
    console.warn('[ENCRYPTION] Using development key - NOT FOR PRODUCTION');
    return crypto.scryptSync('ruit-dev-secret-key-do-not-use-in-production', 'salt', KEY_LENGTH);
  }

  // If AWS KMS key ID is provided, we would use AWS SDK
  // For now, interpret as base64 encoded key
  if (key.length === 44) {
    // Likely base64 encoded 32-byte key
    return Buffer.from(key, 'base64');
  }

  // Derive 32-byte key from provided string
  return crypto.scryptSync(key, 'ruit-salt', KEY_LENGTH);
}

const masterKey = getEncryptionKey();

/**
 * Encrypt PII data using AES-256-GCM
 * Output format: base64(iv:authTag:ciphertext)
 * @param plaintext - Data to encrypt
 * @returns Encrypted string in base64
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext || plaintext.length === 0) {
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, masterKey, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine: iv (16 bytes) + authTag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, authTag, Buffer.from(ciphertext, 'base64')]);

  return combined.toString('base64');
}

/**
 * Decrypt PII data using AES-256-GCM
 * @param encrypted - Encrypted string in base64 (iv:authTag:ciphertext)
 * @returns Decrypted plaintext
 */
export function decryptPII(encrypted: string): string {
  if (!encrypted || encrypted.length === 0) {
    return encrypted;
  }

  try {
    const combined = Buffer.from(encrypted, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return plaintext.toString('utf8');
  } catch (error) {
    console.error('[ENCRYPTION] Decryption failed:', error);
    throw new Error('DECRYPTION_FAILED');
  }
}

/**
 * Check if a string is already encrypted
 * Simple heuristic: check if it's valid base64 and has minimum length
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 50) return false;

  // Check if it's base64 encoded
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(value)) return false;

  // Try to decode - if successful and starts with non-printable (IV),
  // it's likely encrypted
  try {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Decrypt only if encrypted, otherwise return as-is
 * Safe for use when reading potentially unencrypted legacy data
 */
export function decryptIfEncrypted(value: string): string {
  if (!value) return value;
  if (isEncrypted(value)) {
    return decryptPII(value);
  }
  return value;
}

/**
 * Hash a value for comparison (e.g., phone number lookup)
 * Uses SHA-256 for consistent hashing
 */
export function hashForLookup(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Normalize and hash phone for lookup
 */
export function hashPhone(phone: string): string {
  // Normalize first: strip +251, leading zeros, spaces
  const normalized = phone
    .replace(/^\+251/, '')
    .replace(/^0/, '')
    .replace(/\s/g, '');
  return hashForLookup(normalized);
}

// Export types for TypeScript
export type EncryptedString = string & { __encrypted: true };
export type PlainString = string & { __plain: true };
