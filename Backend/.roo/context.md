# RUIT CBE LaaS Platform — Roo Code Context File
# READ THIS ENTIRE FILE BEFORE TOUCHING ANYTHING

## What This Project Is
RUIT CBE LaaS (Logistics as a Service) is an Ethiopian inland freight 
logistics platform built as a microservices backend. It connects fleet 
owners, drivers, and cargo orderers through a trust-based, escrow-secured 
matching system backed by the Commercial Bank of Ethiopia (CBE).

## Working Directory
C:\Users\ygebr\Desktop\LAS\Backend

## Monorepo Structure
```
Backend/
  apps/
    engine-identity/      port 3001 — auth, users, KYC, trust tiers
    engine-optimizer/     port 3002 — pricing, WDM algorithm, load matching
    engine-corridor/      port 3003 — corridor management, ETA
    engine-liquidity/     port 3004 — escrow, financial transactions
    engine-shock/         port 3005 — shock mode, market disruption
    engine-incident/      port 3006 — disputes, incidents, SLA
    engine-behavior/      port 3007 — behavioral analytics, ratings
    engine-fraud/         port 3009 — fraud detection, API keys
    engine-data/          port 3008 — reporting, analytics, statements
    engine-health/        port 3011 — system health monitoring
    engine-strategy/      port 3010 — strategy versions, business rules
    engine-twin/          port 3012 — digital twin (stub only)
    notification-engine/  port 3013 — SMS, push, email notifications
    workers/              no port  — BullMQ background workers
  packages/
    shared-db/    — Prisma client, generateId(prefix) using ulid
    shared-auth/  — requireAuth, requireRole middleware
    shared-queue/ — QUEUES definitions for BullMQ
    shared-utils/ — cached, invalidateCache, formatETB
    shared-types/ — TypeScript types
  infra/
    docker-compose.yml
  tests/
    e2e/full-flow.ps1
  docs/
    API_REFERENCE.md
    DEVELOPER_GUIDE.md
  memory-bank/
    FINAL_STATUS.md
    SCHEMA_CHANGE_LOG.md
  .env
  .env.example
  pnpm-workspace.yaml
  package.json
```

## Technology Stack
- Runtime: Node.js with tsx (NOT ts-node, NOT compiled — tsx runs TypeScript directly)
- Framework: Fastify (NOT Express)
- ORM: Prisma with PostgreSQL
- Queue: BullMQ with Redis
- Package manager: pnpm workspaces
- Language: TypeScript (CommonJS modules — NEVER ESM)

## Database
- PostgreSQL container: ruit_postgres
- Database name: ruit_cbe
- TimescaleDB container: ruit_timescaledb  
- Database name: ruit_ts
- Redis container: ruit_redis
- All running in Docker

## Environment Variables (from .env)
```
DATABASE_URL=postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe
TIMESCALE_URL=postgresql://ruit:ruit_dev_password@localhost:5433/ruit_ts
REDIS_URL=redis://localhost:6379
JWT_SECRET=ruit-cbe-jwt-secret-development-key-change-in-prod
JWT_EXPIRY=24h
REFRESH_SECRET=ruit-cbe-refresh-secret-development-key
REFRESH_EXPIRY=7d
NODE_ENV=development
```

## Import Pattern (use EXACTLY this in all engine code)
```typescript
import { prisma, generateId } from '@ruit/shared-db';
import { cached, invalidateCache } from '@ruit/shared-utils';
import { requireAuth, requireRole } from '@ruit/shared-auth';
import { QUEUES } from '@ruit/shared-queue';
```

## Response Format (ALWAYS use this)
```typescript
// Success
reply.send({ success: true, data: result });

// Error
reply.status(400).send({ 
  success: false, 
  error: { code: 'ERROR_CODE', message: 'Human readable message' } 
});
```

## ID Generation (ALWAYS use this)
```typescript
const id = generateId('usr');   // user IDs
const id = generateId('drv');   // driver IDs
const id = generateId('trk');   // truck IDs
const id = generateId('load');  // load IDs
const id = generateId('stop');  // load stop IDs
const id = generateId('exp');   // expense IDs
// etc — always use a meaningful 3-4 letter prefix
```

## Current User Roles
```
FLEET_OWNER, FLEET_MANAGER, DRIVER, ORDERER, 
OPS_ADMIN, OPS_VIEWER, FINANCE_OPS, SUPER_ADMIN, SYSTEM
```
FLEET_MANAGER is NEW — being added in this sprint.

## Current KYC Tiers
0 = phone only, 1 = ID verified, 2 = full KYC, 3 = business verified

## Trust Tiers
0-5, starts at 0, earned through verified activity

## Prisma Schema Location
packages/shared-db/prisma/schema.prisma

## Migration Command
```bash
cd packages/shared-db
npx prisma migrate dev --name <migration_name>
```

## Rebuild Command After Schema Change
```bash
cd packages/shared-db && pnpm build
# Then rebuild all engines that use it
pnpm -r build
```

## How Engines Start (for testing)
```powershell
$env:DATABASE_URL='postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe'
$env:REDIS_URL='redis://localhost:6379'
$env:JWT_SECRET='ruit-cbe-jwt-secret-development-key-change-in-prod'
cd apps/engine-identity
npx tsx src/index.ts
```

## JWT Token Structure
```json
{
  "sub": "userId",
  "role": "FLEET_OWNER",
  "entity_id": "fleetOwnerId or driverId or ordererId",
  "entity_type": "FLEET_OWNER",
  "trust_tier": 0,
  "jti": "tokenId",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Business Context
- Ethiopian inland freight logistics
- Escrow model: orderer pays into escrow, releases to fleet owner on delivery
- Trust system: users earn trust through verified trips, decay over time
- Corridors: fixed trade routes (Addis-Hawassa, Addis-Dire Dawa, etc.)
- WDM Pricing: Weight × Distance × Mode base price
- Shock mode: emergency pricing when market disrupted
- Strategy versions: business rules config, one active at a time
- Ethiopian calendar: used for reporting (not Gregorian)
- Amounts: always in ETB (Ethiopian Birr), stored as integers (cents)
