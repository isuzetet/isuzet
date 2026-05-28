# RUIT CBE — Architecture Reference
# Read this before every implementation plan.
# This is the single source of truth for all architectural decisions.

## Platform Identity
- Name: RUIT CBE (Central Backend Engine)
- Purpose: Inland Ethiopian Logistics-as-a-Service
- Currency: ETB ONLY. No USD. No cross-border. No Djibouti.
- Language default: Amharic (am). Secondary: English (en).
- Phase: 1 (of 3)

## Monorepo Structure
````
ruit-cbe/
├── apps/
│   ├── engine-identity/       port 3001  — Auth, KYC, Trust scoring
│   ├── engine-optimizer/      port 3002  — WDM matching, pricing, quotes
│   ├── engine-corridor/       port 3003  — Corridor health, density scores
│   ├── engine-liquidity/      port 3004  — Escrow, COD, exposure, payouts
│   ├── engine-shock/          port 3005  — Shock mode, fuel queue mode
│   ├── engine-incident/       port 3006  — Incidents, disputes, state machine
│   ├── engine-behavior/       port 3007  — Behavioral shaping, incentives
│   ├── engine-data/           port 3008  — GPS, fuel logs, AI data capture
│   ├── engine-fraud/          port 3009  — Fraud detection, 8 rules
│   ├── engine-strategy/       port 3010  — Strategy versions, A/B testing
│   ├── engine-twin/           port 3011  — STUB ONLY. Single health endpoint.
│   ├── engine-health/         port 3012  — System health, dead letter queue
│   └── notification-engine/   port 3013  — SMS, Push, USSD
├── packages/
│   ├── shared-types/    — All TypeScript types, Zod schemas, EVENT_TYPES const
│   ├── shared-db/       — PrismaClient singleton, ULID generator, TimescaleDB helpers
│   ├── shared-queue/    — BullMQ QUEUES const, emitJob(), createWorker()
│   ├── shared-auth/     — JWT RS256, requireRole(), generateOtp(), encryptPII()
│   └── shared-utils/    — normalizePhone(), formatETB(), toEthiopianDate(), cached(), invalidateCache()
├── infra/
│   └── docker-compose.yml — postgres:16, timescaledb:2.13, redis:7, minio
├── docs/
│   ├── RUIT_CBE_Technical_PRD_v3_FINAL.docx
│   ├── RUIT_CBE_PRD_Final_Edits.docx
│   ├── RUIT_CBE_Amendment_2_Final.docx
│   └── ARCHITECTURE.md  ← this file
└── keys/
    ├── private.pem      — RS256 private key (JWT signing)
    └── public.pem       — RS256 public key (JWT verification)
````

## Technology Stack — LOCKED. Never change versions.
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| TypeScript | 5.x strict | Language — strict mode everywhere |
| Fastify | 4.29.x | HTTP framework — all engines |
| @fastify/cors | ^9.0.1 | CORS — compatible with Fastify 4.x |
| Prisma | 5.22.x | ORM — DO NOT upgrade to v7 |
| PostgreSQL | 16 | Primary database |
| TimescaleDB | 2.13 | Time-series (separate instance port 5433) |
| Redis | 7 | Cache + queues + OTP + JWT denylist |
| BullMQ | 5.x | Job queues backed by Redis |
| ioredis | ^5.3.2 | Redis client — used by BullMQ AND engines |
| tsx | latest | Dev runner — all engines use "dev": "tsx watch src/index.ts" |
| Zod | 3.x | Runtime validation |
| ulid | latest | ID generation |
| dotenv | latest | Env loading — import 'dotenv/config' FIRST LINE of every index.ts |

## Package Manager Rules — CRITICAL
- ALWAYS use pnpm. NEVER use npm or yarn in this monorepo.
- Install workspace dep: pnpm --filter @ruit/engine-X add package-name
- Install root dev dep: pnpm add -Dw package-name
- After any package.json change: run pnpm install then pnpm -r build

## Engine Dev Script Standard — ALL engines use this pattern:
````json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
````

## Shared Package Export Rules — CRITICAL
Every shared package package.json must have:
````json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
````

## Environment Variables (.env at root)
````
DATABASE_URL=postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe
TIMESCALE_URL=postgresql://ruit:ruit_dev_password@localhost:5433/ruit_ts
REDIS_URL=redis://localhost:6379
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRY_SECONDS=900
JWT_REFRESH_EXPIRY_SECONDS=2592000
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
AWS_S3_BUCKET=ruit-cbe-storage
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
MINIO_ENDPOINT=http://localhost:9000
````

## Database Rules — NON-NEGOTIABLE
1. NEVER hard-delete. Every mutable table has deleted_at. Soft delete only.
2. NEVER update the events table. Append-only forever.
3. NEVER hardcode ETB amounts, commission rates, trust scores, tier boundaries.
4. Every financial mutation MUST be wrapped in a Prisma transaction.
5. All IDs are ULIDs. Prefix convention:
   usr_ flt_ drv_ trk_ ld_ asgn_ trp_ inc_ corr_ ord_ ftx_ evt_ asgn_
6. All timestamps: UTC ISO 8601.
7. Currency: always Prisma Decimal type. NEVER JavaScript float.
8. Two databases: PostgreSQL (Prisma) + TimescaleDB (raw SQL via pg package).

## Prisma Client — Import Pattern
````typescript
// CORRECT — always import from @ruit/shared-db
import { db } from '@ruit/shared-db';

// WRONG — never create a new PrismaClient in an engine
import { PrismaClient } from '@prisma/client'; // ❌ NEVER DO THIS
````

## ULID Generation — Import Pattern
````typescript
import { generateULID } from '@ruit/shared-db';
// Usage:
const id = generateULID('usr');  // returns usr_01HXXX...
const id = generateULID('evt');  // returns evt_01HXXX...
````

## Event Emission — Mandatory Pattern for ALL engines
````typescript
import { db } from '@ruit/shared-db';
import { generateULID } from '@ruit/shared-db';
import { EVENT_TYPES, EventType } from '@ruit/shared-types';

async function emitEvent(params: {
  event_type: EventType;
  aggregate_id: string;
  aggregate_type: string;
  actor_id: string;
  actor_role: string;
  corridor_id?: string;
  payload: Record<string, unknown>;
  is_manual_override?: boolean;
}): Promise<void> {
  const strategyVersion = await getActiveStrategyId();
  await db.events.create({
    data: {
      id: generateULID('evt'),
      event_type: params.event_type,
      aggregate_id: params.aggregate_id,
      aggregate_type: params.aggregate_type,
      actor_id: params.actor_id,
      actor_role: params.actor_role,
      strategy_version_id: strategyVersion,
      corridor_id: params.corridor_id ?? null,
      payload: params.payload as any,
      metadata: {
        source: 'API',
        is_manual_override: params.is_manual_override ?? false,
        timestamp: new Date().toISOString(),
      },
    },
  });
}
// NEVER call db.events.update(). NEVER call db.events.delete().
````

## Cache Pattern — ALL engines use this
````typescript
import { cached, invalidateCache } from '@ruit/shared-utils';

// Read with cache:
const strategy = await cached(
  `cache:strategy:active:GLOBAL`,
  300, // TTL seconds
  () => db.strategy_versions.findFirst({ where: { is_active: true } })
);

// Invalidate on change:
await invalidateCache(`cache:strategy:active:GLOBAL`);
````

## Cache Key Registry — Use EXACTLY these keys
| Data | Key Pattern | TTL |
|---|---|---|
| Active strategy | cache:strategy:active:{scope} | 300s |
| Corridor data | cache:corridor:{corridor_id} | 600s |
| Latest snapshot | cache:snapshot:{corridor_id}:latest | 21600s |
| Entity trust score | cache:trust:{type}:{id} | 120s |
| Active commission | cache:commission:{ord}:{corr}:{cargo} | 1800s |
| Active shock mode | cache:shock:active | 30s |
| Exposure caps | cache:exposure:caps:{type}:{id} | 60s |

## API Response Shape — ALL endpoints must return this
````typescript
// Success:
{ success: true, data: T, pagination?: { total, page, limit, pages } }

// Error:
{ success: false, error: { code: string, message: string, details?: unknown } }
````

## Error Code Registry
| HTTP | Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | Zod parse failure |
| 401 | UNAUTHORIZED | No/invalid JWT |
| 401 | OTP_EXPIRED | OTP not in Redis |
| 401 | OTP_INVALID | Wrong OTP |
| 403 | INSUFFICIENT_TRUST_TIER | Trust tier too low |
| 403 | CORRIDOR_ACCESS_DENIED | Not in region_access |
| 403 | KYC_REQUIRED | KYC tier insufficient |
| 403 | OTP_LOCKOUT | 3+ failed OTP attempts |
| 403 | EXPOSURE_CAP_EXCEEDED | Exposure cap breached in shock mode |
| 404 | ENTITY_NOT_FOUND | Resource not found |
| 409 | DUPLICATE_FINANCIAL_TX | Idempotency constraint hit |
| 409 | INVALID_STATE_TRANSITION | State machine violation |
| 422 | INSURANCE_EXPIRED | Truck insurance expired |
| 422 | LICENSE_EXPIRED | Driver license expired |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Never expose stack trace |
| 503 | CORRIDOR_FROZEN | Corridor status = FROZEN |

## Ethiopian Date — Mandatory on ALL timestamp responses
````typescript
import { toEthiopianDate } from '@ruit/shared-utils';

// Every response with a date must include both:
{
  created_at: date.toISOString(),           // gregorian
  created_at_et: toEthiopianDate(date),     // ethiopian
}
````

## Role Definitions
````
SUPER_ADMIN   — full access, Tier 5 manual approval, system config
OPS_ADMIN     — operations management, incident resolution, KYC review
OPS_VIEWER    — read-only ops access
FINANCE_OPS   — financial reconciliation, COD verification
FLEET_OWNER   — manage own trucks, drivers, view own payouts
DRIVER        — accept assignments, GPS, POD upload, USSD
ORDERER       — create loads, track shipments, manage payments
````

## KYC Tier Gates (Amendment 2 C1)
| Role | Min KYC Tier | To Do What |
|---|---|---|
| ORDERER | 1 | Create a load |
| ORDERER | 2 | Use ROLLING_CREDIT or PARTIAL_ADVANCE |
| FLEET_OWNER | 1 | Register a truck |
| FLEET_OWNER | 2 | Truck eligible for assignment |
| DRIVER | 2 | Accept assignments, appear in WDM pool |
| DRIVER | 3 | Handle COD cash collection |

## Trust Tier Capabilities
| Tier | Score | Payout | Credit Cap | Corridors |
|---|---|---|---|---|
| 0 | 0-39 | T7 | 0 | Home only |
| 1 | 40-54 | T7 | 0 | Home + 1 adjacent |
| 2 | 55-69 | T3 | 25,000 | Home + 3 adjacent |
| 3 | 70-79 | T1 | 100,000 | All corridors |
| 4 | 80-89 | T0 | 250,000 | All corridors |
| 5 | 90-100 | Pre-funded | 500,000 | All — MANUAL APPROVAL ONLY |

## Shock Mode Severity Matrix
| Level | Name | Margin Floor | Band Max | Exposure Cap |
|---|---|---|---|---|
| 0 | Normal | base | x1.15 | standard |
| 1 | Advisory | +5% | x1.15 | standard |
| 2 | Moderate | +15% | x1.10 | -20% |
| 3 | Severe | +30% | x1.05 | -40% |
| 4 | Critical | +50% | x1.00 | -60% |

## Incident State Machine (Amendment 2 B4)
Valid transitions ONLY:
OPEN → UNDER_INVESTIGATION → EVIDENCE_COLLECTION → AWAITING_RESOLUTION → RESOLVED → CLOSED
OPEN → ESCALATED → AWAITING_RESOLUTION
AWAITING_RESOLUTION → ESCALATED (auto after 48h)
Any → CLOSED (SUPER_ADMIN force only)

## BullMQ Queue Names — Use EXACTLY these
````typescript
import { QUEUES } from '@ruit/shared-queue';
QUEUES.LIQUIDITY     // 'ruit:liquidity'   — CRITICAL, 10 retries
QUEUES.SHOCK         // 'ruit:shock'       — CRITICAL, 5 retries
QUEUES.OPTIMIZER     // 'ruit:optimizer'   — HIGH, 5 retries
QUEUES.INCIDENT      // 'ruit:incident'    — HIGH, 5 retries
QUEUES.NOTIFICATIONS // 'ruit:notifications' — HIGH, 10 retries
QUEUES.FRAUD         // 'ruit:fraud'       — HIGH, 5 retries
QUEUES.IDENTITY      // 'ruit:identity'    — NORMAL, 3 retries
QUEUES.CORRIDOR      // 'ruit:corridor'    — NORMAL, 3 retries
QUEUES.BEHAVIOR      // 'ruit:behavior'    — LOW, 3 retries
QUEUES.DATA          // 'ruit:data'        — LOW, 3 retries
````

## Notification — Internal Call Pattern
````typescript
// Engines call notification-engine via HTTP (not direct import)
await fetch('http://localhost:3013/internal/sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, message })
});
// In dev mode (no AFRICAS_TALKING_API_KEY): logs [SMS MOCK] to console
````

## Seed Data IDs — Reference These Exactly
Strategy version: sv_phase1_growth
Commission config: cc_default_8pct
Super admin user: usr_super_admin_001
Corridors:
  corr_aab_hws  Addis–Hawassa    275km SOUTH
  corr_aab_drd  Addis–Dire Dawa  515km EAST
  corr_aab_mkl  Addis–Mekele     783km NORTH
  corr_aab_bhr  Addis–Bahir Dar  578km NORTH
  corr_aab_jmm  Addis–Jimma      352km WEST
  corr_aab_gnd  Addis–Gondar     738km NORTH
  corr_aab_adm  Addis–Adama      100km CENTRAL
  corr_aab_shm  Addis–Shashamane 250km SOUTH
  corr_mkl_axm  Mekele–Axum      230km NORTH
  corr_hws_myl  Hawassa–Moyale   520km SOUTH

## Build Verification — Run After Every File Change
````
pnpm -r build
````
Expected output: "X successful, X total" with ZERO error lines.
If ANY errors: fix them before writing the next file.
NEVER proceed with a broken build.

## Engine Health Endpoint — Every engine must have this
````typescript
fastify.get('/api/v1/{engine-prefix}/health', async () => ({
  status: 'UP',
  engine: '{engine-name}',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));
````

## Engine Build Order — Never Deviate
1 → 10 → 2 → 4 → 3 → 5 → 6 → 7 → 9 → 8 → 11(stub) → 12

## Current Status (Update After Each Prompt)
- [x] Phase 0: Monorepo scaffold
- [x] Engine 10: Strategy versioning
- [x] Engine 1: Identity, KYC, Trust
- [ ] Engine 2: Optimizer, WDM, Pricing
- [ ] Engine 4: Liquidity, Escrow, COD
- [ ] Engine 3: Corridor Intelligence
- [ ] Engine 5: Shock Absorption
- [ ] Engine 6: Incident & Disputes
- [ ] Engine 7: Behavioral Shaping
- [ ] Engine 9: Fraud Detection
- [ ] Engine 8: Data Capture & GPS
- [ ] Engine 12: System Health