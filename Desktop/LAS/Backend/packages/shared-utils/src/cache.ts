/**
 * RUIT CBE — Redis Cache Wrapper
 * Implements caching strategy from Amendment 2 Part E5
 */
import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redisClient;
}

/**
 * Standard cache wrapper — use for ALL hot read paths
 * @param key - Redis cache key
 * @param ttlSeconds - Time to live in seconds
 * @param fetchFn - Function to fetch data if cache miss
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  try {
    const hit = await redis.get(key);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch {
    // cache miss — proceed to fetch
  }

  const value = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
  return value;
}

/**
 * Delete cache key
 * Use for cache invalidation on events
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

/**
 * Delete multiple cache keys by pattern
 * Use for wildcard invalidation (e.g., cache:commission:*)
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Get cache key with TTL info
 */
export async function getCacheWithTtl<T>(key: string): Promise<{ value: T | null; ttl: number }> {
  const redis = getRedisClient();
  const hit = await redis.get(key);
  const ttl = await redis.ttl(key);
  return { value: hit ? JSON.parse(hit) : null, ttl };
}

/**
 * Set cache with explicit TTL
 */
export async function setCache<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

/**
 * Check if key exists in cache
 */
export async function hasCache(key: string): Promise<boolean> {
  const redis = getRedisClient();
  const exists = await redis.exists(key);
  return exists === 1;
}

// Cache key patterns from PRD:
// cache:strategy:active:{scope} - TTL 300s
// cache:corridor:{corridor_id} - TTL 600s
// cache:snapshot:{corridor_id}:latest - TTL 21600s (6h with jitter)
// cache:trust:{entity_type}:{entity_id} - TTL 120s
// cache:commission:{orderer_id}:{corridor_id}:{cargo_type} - TTL 1800s
// cache:shock:active - TTL 30s
// cache:exposure:caps:{scope_type}:{scope_id} - TTL 60s
