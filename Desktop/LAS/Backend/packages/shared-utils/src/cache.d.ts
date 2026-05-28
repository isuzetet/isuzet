/**
 * RUIT CBE — Redis Cache Wrapper
 * Implements caching strategy from Amendment 2 Part E5
 */
import { Redis } from 'ioredis';
export declare function getRedisClient(): Redis;
/**
 * Standard cache wrapper — use for ALL hot read paths
 * @param key - Redis cache key
 * @param ttlSeconds - Time to live in seconds
 * @param fetchFn - Function to fetch data if cache miss
 */
export declare function cached<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T>;
/**
 * Delete cache key
 * Use for cache invalidation on events
 */
export declare function invalidateCache(key: string): Promise<void>;
/**
 * Delete multiple cache keys by pattern
 * Use for wildcard invalidation (e.g., cache:commission:*)
 */
export declare function invalidateCachePattern(pattern: string): Promise<void>;
/**
 * Get cache key with TTL info
 */
export declare function getCacheWithTtl<T>(key: string): Promise<{
    value: T | null;
    ttl: number;
}>;
/**
 * Set cache with explicit TTL
 */
export declare function setCache<T>(key: string, ttlSeconds: number, value: T): Promise<void>;
/**
 * Check if key exists in cache
 */
export declare function hasCache(key: string): Promise<boolean>;
//# sourceMappingURL=cache.d.ts.map