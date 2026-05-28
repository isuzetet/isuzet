"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.cached = cached;
exports.invalidateCache = invalidateCache;
exports.invalidateCachePattern = invalidateCachePattern;
exports.getCacheWithTtl = getCacheWithTtl;
exports.setCache = setCache;
exports.hasCache = hasCache;
/**
 * RUIT CBE — Redis Cache Wrapper
 * Implements caching strategy from Amendment 2 Part E5
 */
const ioredis_1 = require("ioredis");
let redisClient = null;
function getRedisClient() {
    if (!redisClient) {
        redisClient = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    return redisClient;
}
/**
 * Standard cache wrapper — use for ALL hot read paths
 * @param key - Redis cache key
 * @param ttlSeconds - Time to live in seconds
 * @param fetchFn - Function to fetch data if cache miss
 */
async function cached(key, ttlSeconds, fetchFn) {
    const redis = getRedisClient();
    try {
        const hit = await redis.get(key);
        if (hit) {
            return JSON.parse(hit);
        }
    }
    catch {
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
async function invalidateCache(key) {
    const redis = getRedisClient();
    await redis.del(key);
}
/**
 * Delete multiple cache keys by pattern
 * Use for wildcard invalidation (e.g., cache:commission:*)
 */
async function invalidateCachePattern(pattern) {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}
/**
 * Get cache key with TTL info
 */
async function getCacheWithTtl(key) {
    const redis = getRedisClient();
    const hit = await redis.get(key);
    const ttl = await redis.ttl(key);
    return { value: hit ? JSON.parse(hit) : null, ttl };
}
/**
 * Set cache with explicit TTL
 */
async function setCache(key, ttlSeconds, value) {
    const redis = getRedisClient();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
}
/**
 * Check if key exists in cache
 */
async function hasCache(key) {
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
//# sourceMappingURL=cache.js.map