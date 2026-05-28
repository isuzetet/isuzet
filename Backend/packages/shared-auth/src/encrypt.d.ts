/**
 * Encrypt PII data using AES-256-GCM
 * Output format: base64(iv:authTag:ciphertext)
 * @param plaintext - Data to encrypt
 * @returns Encrypted string in base64
 */
export declare function encryptPII(plaintext: string): string;
/**
 * Decrypt PII data using AES-256-GCM
 * @param encrypted - Encrypted string in base64 (iv:authTag:ciphertext)
 * @returns Decrypted plaintext
 */
export declare function decryptPII(encrypted: string): string;
/**
 * Check if a string is already encrypted
 * Simple heuristic: check if it's valid base64 and has minimum length
 */
export declare function isEncrypted(value: string): boolean;
/**
 * Decrypt only if encrypted, otherwise return as-is
 * Safe for use when reading potentially unencrypted legacy data
 */
export declare function decryptIfEncrypted(value: string): string;
/**
 * Hash a value for comparison (e.g., phone number lookup)
 * Uses SHA-256 for consistent hashing
 */
export declare function hashForLookup(value: string): string;
/**
 * Normalize and hash phone for lookup
 */
export declare function hashPhone(phone: string): string;
export type EncryptedString = string & {
    __encrypted: true;
};
export type PlainString = string & {
    __plain: true;
};
//# sourceMappingURL=encrypt.d.ts.map