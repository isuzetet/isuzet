import { Redis } from 'ioredis';
import { prisma } from '@ruit/shared-db';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ENGINE_REGISTRY = [
  { name: 'identity', port: 3001, prefix: 'identity' },
  { name: 'strategy', port: 3010, prefix: 'strategy' },
  { name: 'optimizer', port: 3002, prefix: 'optimizer' },
  { name: 'liquidity', port: 3004, prefix: 'liquidity' },
  { name: 'corridor', port: 3003, prefix: 'corridor' },
  { name: 'shock', port: 3005, prefix: 'shock' },
  { name: 'incident', port: 3006, prefix: 'incident' },
  { name: 'behavior', port: 3007, prefix: 'behavior' },
  { name: 'fraud', port: 3009, prefix: 'fraud' },
  { name: 'data', port: 3008, prefix: 'data' },
  { name: 'health', port: 3011, prefix: 'health' },
  { name: 'twin', port: 3012, prefix: 'twin' },
];

interface EngineHealth {
  name: string;
  status: 'UP' | 'DOWN';
  latencyMs: number;
  checkedAt: string;
}

interface EngineHealthSummary {
  engines: EngineHealth[];
  upCount: number;
  downCount: number;
  checkedAt: string;
}

interface InfraHealth {
  postgres: 'UP' | 'DOWN';
  redis: 'UP' | 'DOWN';
  timescaledb: 'UP' | 'DOWN';
}

interface SystemStatus {
  status: 'ALL_UP' | 'DEGRADED' | 'CRITICAL';
  engines: EngineHealthSummary;
  infrastructure: InfraHealth;
  timestamp: string;
}

export async function checkEngineHealth(engine: typeof ENGINE_REGISTRY[0]): Promise<EngineHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://localhost:${engine.port}/api/v1/${engine.prefix}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    
    if (response.ok) {
      return {
        name: engine.name,
        status: 'UP',
        latencyMs,
        checkedAt: new Date().toISOString(),
      };
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    return {
      name: engine.name,
      status: 'DOWN',
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function checkAllEngines(): Promise<EngineHealthSummary> {
  const results = await Promise.all(ENGINE_REGISTRY.map(checkEngineHealth));
  const upCount = results.filter(r => r.status === 'UP').length;
  const downCount = results.length - upCount;
  
  const summary: EngineHealthSummary = {
    engines: results,
    upCount,
    downCount,
    checkedAt: new Date().toISOString(),
  };
  
  // Cache result in Redis for 15 seconds
  await redis.setex('cache:health:all', 15, JSON.stringify(summary));
  
  return summary;
}

export async function checkInfrastructure(): Promise<InfraHealth> {
  const results: InfraHealth = {
    postgres: 'DOWN',
    redis: 'DOWN',
    timescaledb: 'DOWN',
  };
  
  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.postgres = 'UP';
  } catch {
    results.postgres = 'DOWN';
  }
  
  // Check Redis
  try {
    await redis.ping();
    results.redis = 'UP';
  } catch {
    results.redis = 'DOWN';
  }
  
  // Check TimescaleDB (using same connection as PostgreSQL for now)
  try {
    // Try to query timescale hypertables
    await prisma.$queryRaw`SELECT 1 FROM timescaledb_information.hypertables LIMIT 1`;
    results.timescaledb = 'UP';
  } catch {
    results.timescaledb = 'DOWN';
  }
  
  return results;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const [engines, infrastructure] = await Promise.all([
    checkAllEngines(),
    checkInfrastructure(),
  ]);
  
  // Core engines: identity, strategy, optimizer, liquidity
  const coreEngines = ['identity', 'strategy', 'optimizer', 'liquidity'];
  const downCoreEngines = engines.engines.filter(
    e => coreEngines.includes(e.name) && e.status === 'DOWN'
  );
  
  // Determine status
  let status: 'ALL_UP' | 'DEGRADED' | 'CRITICAL';
  if (downCoreEngines.length > 0) {
    status = 'CRITICAL';
  } else if (engines.downCount > 0 || infrastructure.postgres === 'DOWN' || infrastructure.redis === 'DOWN') {
    status = 'DEGRADED';
  } else {
    status = 'ALL_UP';
  }
  
  return {
    status,
    engines,
    infrastructure,
    timestamp: new Date().toISOString(),
  };
}
