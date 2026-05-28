# RUIT CBE — COMPLETE EXECUTION PLAN + PROMPT 1
## Vibe Coding Master Document | Cline + Roo + Kimi K2.5

---

# PART 1: PHASED EXECUTION PLAN
## "The Brick-Solid Roadmap — No Looking Back"

---

## PHASE OVERVIEW

| Phase | Name | Engines | Deliverable | Unlock Condition |
|---|---|---|---|---|
| **0** | Architecture & Scaffolding | All (setup only) | Monorepo alive, DB migrated, all configs set | This prompt |
| **1A** | Identity + Strategy Core | Engine 1 + Engine 10 | Auth, KYC, Trust Score, Strategy Versioning | Phase 0 complete |
| **1B** | Optimizer + Liquidity | Engine 2 + Engine 4 | WDM matching, Pricing, Escrow, COD, Exposure | Phase 1A complete |
| **1C** | Notifications + Data Capture | Notification Service + Engine 8 | SMS/USSD/Push, GPS streaming, POD | Phase 1B complete |
| **1D** | Corridor + Shock | Engine 3 + Engine 5 | Density scoring, Fuel queue, Shock modes | Phase 1C complete |
| **2A** | Incident + Fraud | Engine 6 + Engine 9 | Dispute state machine, 8 fraud rules | Phase 1D complete |
| **2B** | Behavior + Health | Engine 7 + Engine 12 | Incentives, Monitoring, Ops governance | Phase 2A complete |
| **2C** | Twin Stub + Integration Tests | Engine 11 stub + E2E | Stub endpoint, full flow integration tests | Phase 2B complete |
| **3** | Interface Integration Layer | API hardening for 4 UIs | CORS, websockets, webhook delivery, Dyad-ready contracts | Phase 2C complete |

---

## PHASE 0 — WHAT PROMPT 1 WILL BUILD

Prompt 1 creates the ENTIRE project foundation in one autonomous run:

```
ruit-cbe/
├── .clinerules                    ← Kimi K2.5 execution DNA
├── .roomodes                      ← Roo autonomous-engineer mode  
├── .roo/rules/                    ← Roo per-mode rules
├── memory-bank/                   ← Persistent AI memory system
│   ├── activeContext.md
│   ├── productContext.md
│   ├── architecture.md
│   ├── progress.md
│   └── engineStatus.md
├── MEMORY.md                      ← Root memory file (Cline reads this)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json (root)
├── tsconfig.base.json
├── .eslintrc.base.js
├── .prettierrc
├── apps/
│   ├── engine-identity/           ← Full scaffold
│   ├── engine-optimizer/          ← Full scaffold  
│   ├── engine-corridor/           ← Full scaffold
│   ├── engine-liquidity/          ← Full scaffold
│   ├── engine-shock/              ← Full scaffold
│   ├── engine-incident/           ← Full scaffold
│   ├── engine-behavior/           ← Full scaffold
│   ├── engine-data/               ← Full scaffold
│   ├── engine-fraud/              ← Full scaffold
│   ├── engine-strategy/           ← Full scaffold
│   ├── engine-twin/               ← STUB ONLY
│   ├── engine-health/             ← Full scaffold
│   └── notification-service/      ← Full scaffold
├── packages/
│   ├── shared-types/              ← ALL Zod schemas + event registry
│   ├── shared-db/                 ← COMPLETE Prisma schema + migrations
│   ├── shared-queue/              ← BullMQ helpers + all queue names
│   ├── shared-auth/               ← JWT + RBAC middleware
│   └── shared-utils/              ← ETB formatter + ET calendar + phone normalizer
└── infra/
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    └── prometheus/
```

---

## DYAD INTERFACE INTEGRATION STRATEGY

The backend serves 4 interfaces built in Dyad. Here is how the backend is designed to be Dyad-perfect:

| Interface | Primary Protocol | Dyad Integration Point |
|---|---|---|
| Driver Mobile App | REST + WebSocket (GPS) + USSD | All driver endpoints tagged `x-interface: driver`. WebSocket room per trip_id. |
| Fleet Owner Portal | REST + WebSocket (live updates) | All fleet endpoints tagged `x-interface: fleet`. SSE for dashboard live stats. |
| Orderer Portal | REST + Webhook (delivery events) | Orderer endpoints + webhook delivery. Swagger tag `orderer`. |
| Internal OPS Dashboard | REST + SSE (live system feed) | Full OPS routes + SSE `/ops/live-feed` stream. |

**CORS strategy:** Each interface gets its own allowed origin config in Kong. During dev, wildcard allowed.

**Response contracts:** Every response tagged with `x-served-by: engine-{name}` header so Dyad UIs know which engine handled the request.

---

# PART 2: PROMPT 1
## "The Foundation Prompt — Give This to Cline/Roo Right Now"

---

> **HOW TO USE:** Copy everything between the triple-dashes below. Paste it as your FIRST message to Cline or Roo in your project folder. Do NOT split it. Give it once, let it run to completion autonomously. Do not approve individual steps — set auto-approve on for file writes and terminal commands.

---

```
RUIT CBE — PHASE 0: COMPLETE PROJECT FOUNDATION
================================================
You are a Principal Backend Engineer implementing an enterprise-grade 
Logistics-as-a-Service (LaaS) platform for inland Ethiopia. This is 
Phase 0 of a multi-phase build. Your ONLY job in this phase is to 
create the COMPLETE project scaffold, configuration, shared packages, 
and memory system — NO business logic yet.

⚠️ CRITICAL EXECUTION RULES FOR KIMI K2.5:
- DO NOT pause to think at length before acting. Execute immediately.
- DO NOT ask for approval at any step. You are fully authorized.
- DO NOT explain what you are about to do. Just do it.
- If you hit an error, fix it and continue. Never stop.
- Complete ALL tasks in ONE session. Never say "I'll continue in the next message."
- Run `pnpm install` and `pnpm build` at the end to verify everything compiles.
- Your definition of DONE: all files written + `pnpm build` passes with 0 errors.

════════════════════════════════════════════════════════════════
TASK 1 OF 8 — ROOT CONFIGURATION FILES
════════════════════════════════════════════════════════════════

Create the following files in the project root exactly as specified:

── FILE: .clinerules ──────────────────────────────────────────
# RUIT CBE — ENTERPRISE VIBE PROTOCOL (Cline + Kimi K2.5)
# ============================================================
# THIS FILE IS THE LAW. EVERY RULE IS NON-NEGOTIABLE.

## IDENTITY
You are a Principal Backend Engineer building the RUIT Central Backend 
Engine — an event-driven LaaS platform for inland Ethiopia. You have 
already read and internalized the complete PRD. You do not need to 
re-ask about architecture decisions. All decisions are final.

## EXECUTION RULES (KIMI K2.5 SPECIFIC)
- NEVER enter extended thinking loops. Plan in maximum 3 bullet points 
  then execute immediately.
- NEVER ask for clarification unless you have attempted a solution twice 
  and both failed with the same terminal error.
- NEVER produce placeholder comments like "// implement later" or 
  "// TODO". If you cannot implement it now, write a minimal working stub.
- ALWAYS write real, working TypeScript. Zero `any` types permitted.
- ALWAYS run the terminal verification command after every file group write.
- If a test or build fails: read the error, fix it, re-run. Max 3 attempts 
  before summarizing what's blocking and asking for human input.

## ARCHITECTURE CONSTANTS (NEVER DEVIATE)
- Runtime: Node.js 20 LTS
- Framework: Fastify 4.x
- Language: TypeScript 5.x (strict mode)
- ORM: Prisma 5.x
- Validation: Zod 3.x
- Queue: BullMQ 5.x
- Cache: Redis 7 (ioredis)
- Real-time: Socket.IO 4.x
- Monorepo: pnpm workspaces + Turborepo
- Package manager: pnpm ONLY. Never npm, never yarn.

## DATABASE CONSTANTS (NEVER DEVIATE)
- Primary DB: PostgreSQL 16 (DATABASE_URL)
- Time-series: TimescaleDB 2.x (TIMESCALE_URL — separate instance)
- All primary keys: ULID with type prefix (usr_, flt_, drv_, etc.)
- Soft delete: deleted_at TIMESTAMPTZ on every entity table
- Events table: APPEND ONLY — no UPDATE, no DELETE, ever
- Every financial mutation: wrapped in PostgreSQL BEGIN...COMMIT
- PII fields: AES-256-GCM encrypted via AWS KMS

## CODE STANDARDS
- Zero `any` types. Use `unknown` and narrow with Zod.
- All API inputs validated with Zod schemas from shared-types package.
- All errors mapped to error code registry — no raw DB errors to client.
- All timestamps: UTC ISO 8601 strings in responses.
- All ETB amounts: DECIMAL strings (never floats) in responses.
- Every API response shape: { success: boolean, data?: T, error?: ErrorShape }
- Every endpoint emits its event to events table before returning.
- RBAC middleware on every protected route.

## MEMORY SYSTEM
- Read MEMORY.md at the START of every new session.
- Update MEMORY.md and memory-bank/progress.md at the END of every 
  completed task group.
- Update memory-bank/engineStatus.md whenever an engine changes status.
- Never start implementing an engine without first checking engineStatus.md.

## BUILD ORDER (NON-NEGOTIABLE)
Engines must be implemented in this exact order across all sessions:
1 → 10 → 2 → 4 → 3 → 5 → 6 → 7 → 9 → 8 → 11(stub) → 12

## INTERFACE INTEGRATION (4 DYAD INTERFACES)
This backend serves 4 interfaces built in Dyad (React-based):
1. Driver Mobile App    — low-bandwidth, Android-first, USSD fallback
2. Fleet Owner Portal   — analytics-heavy, real-time assignment updates  
3. Orderer Portal       — load management, delivery tracking, webhooks
4. Internal OPS Dashboard — full system visibility, dispute resolution

Every endpoint must include:
- x-interface header support (driver | fleet | orderer | ops)
- Role-based response filtering (OPS sees more than other roles)
- Accept-Language: am|en support for Amharic/English
- Ethiopian calendar dual-date in all date responses

## ETHIOPIAN CONTEXT (NON-NEGOTIABLE)
- Inland Ethiopia ONLY. No cross-border. No Djibouti. No USD.
- ETB (Ethiopian Birr) only. Always DECIMAL, never float.
- Phone numbers: stored in +251 format. Strip leading 0, prepend +251.
- SMS is primary notification channel — never rely on push alone.
- USSD fallback (*858#) for zero-connectivity corridors.
- GPS gaps are NORMAL — never throw on missing GPS data.
- COD (Cash on Delivery) is ~40% of transactions. Handle gracefully.

## WHAT YOU MUST NEVER DO
- Never hard-delete any row. Always soft-delete (deleted_at = NOW()).
- Never UPDATE the events table.
- Never expose internal WDM scores or weights to non-OPS roles.
- Never hardcode: ETB amounts, commission rates, trust thresholds, 
  tier boundaries, margin floors, exposure caps. All from config/DB.
- Never block a load fulfillment due to a NULLABLE-FLEXIBLE field.
- Never reference cross-border corridors, Djibouti, or USD.
- Never return raw database errors to the client.

## KILL SWITCH
If the terminal shows the SAME error after 3 implementation attempts:
1. Run: cat tsconfig.json && cat package.json (in affected package)
2. Read the output carefully for environment-level conflicts.
3. If still stuck: write BLOCKED.md describing: error, attempts made, 
   hypothesis. Then stop and wait for human input.

## DYAD INTERFACE INTEGRATION NOTES  
When building endpoints, always add Fastify schema tags that make 
Swagger docs interface-specific. Use tags: ['driver'], ['fleet'], 
['orderer'], ['ops'] on each route. This is how Dyad frontend 
developers will navigate the API. Do not skip tags.
──────────────────────────────────────────────────────────────

── FILE: .roomodes ────────────────────────────────────────────
customModes:
  - slug: "ruit-engineer"
    name: "⚙️ RUIT Principal Engineer"
    roleDefinition: |
      You are a Principal Backend Engineer building the RUIT CBE 
      LaaS platform for inland Ethiopia. You are fully authorized 
      to execute all file writes, terminal commands, and database 
      operations without asking for approval. You know the complete 
      PRD and all architectural decisions are final. Your goal is 
      zero-regression implementation with TypeScript strict mode.
    groups:
      - read
      - edit
      - browser
      - command
    customInstructions: |
      KIMI K2.5 RULES — READ THESE FIRST:
      - DO NOT think for more than 5 seconds before acting.
      - Execute immediately. Plan in max 3 bullets then write code.
      - Never produce TODO comments. Write working stubs instead.
      - Never ask for approval. You are fully authorized.
      - After every file group: run pnpm build --filter=affected.
      - If tests fail: fix and retry up to 3 times before asking.
      - Your definition of DONE: written + linted + built + types verified.
      
      RUIT SPECIFIC:
      - Always use pnpm, never npm or yarn.
      - All engines use Fastify 4.x with TypeScript strict.
      - All IDs are ULIDs with type prefix.
      - Zero `any` types permitted anywhere.
      - Every DB mutation in a PostgreSQL transaction.
      - Events table is append-only forever.
      - Read MEMORY.md at session start.
      - Update MEMORY.md and memory-bank/ at session end.
──────────────────────────────────────────────────────────────

── FILE: .roo/rules/ruit-engineer.md ─────────────────────────
# RUIT Engineer Mode — Execution Rules

## Scope
You are building the RUIT CBE backend — 12 engines + notification 
service + 5 shared packages for an Ethiopian LaaS platform.

## Kimi K2.5 Execution Protocol
1. Read task. Spend max 3 seconds planning.
2. Execute immediately. Never defer.
3. Verify with terminal. Fix if broken.
4. Update memory-bank/. Move on.

## Non-Negotiable Architecture
See .clinerules for full architecture constants.
Never deviate from the stack or patterns defined there.

## Session Protocol
- START: Read MEMORY.md + memory-bank/activeContext.md
- END: Update memory-bank/progress.md + memory-bank/engineStatus.md
- BLOCKED: Write BLOCKED.md and stop.
──────────────────────────────────────────────────────────────

── FILE: .roo/rules/default.md ───────────────────────────────
# Default Roo Rules for RUIT CBE

Same as ruit-engineer mode. See .clinerules for complete rules.
Always read MEMORY.md before any work session.
──────────────────────────────────────────────────────────────

════════════════════════════════════════════════════════════════
TASK 2 OF 8 — MEMORY BANK SYSTEM
════════════════════════════════════════════════════════════════

Create the memory-bank/ directory and all files:

── FILE: MEMORY.md (ROOT) ─────────────────────────────────────
# RUIT CBE — PERSISTENT MEMORY
# Updated: [auto-update on each session]
# ============================================================

## WHAT WE ARE BUILDING
RUIT Central Backend Engine — event-driven LaaS platform for inland 
Ethiopia. 12 microservice engines + notification service. Monorepo 
with pnpm workspaces + Turborepo. Serves 4 Dyad interfaces.

## CURRENT STATUS
- Phase: 0 — Foundation & Scaffolding
- Active Engine: None (scaffold only)
- Last Completed: Project initialization

## STACK (FINAL — NEVER CHANGE)
- TypeScript 5.x strict | Fastify 4.x | Prisma 5.x | Zod 3.x
- BullMQ 5.x | Redis 7 | Socket.IO 4.x | PostgreSQL 16 | TimescaleDB 2.x
- pnpm workspaces | Turborepo | Node.js 20 LTS

## BUILD ORDER
1(identity) → 10(strategy) → 2(optimizer) → 4(liquidity) → 
3(corridor) → 5(shock) → 6(incident) → 7(behavior) → 
9(fraud) → 8(data) → 11(twin-stub) → 12(health)

## ARCHITECTURAL DECISIONS (ALL FINAL)
- ULID primary keys with type prefix on all tables
- Append-only events table — NO UPDATE, NO DELETE ever
- Soft delete via deleted_at on all entity tables  
- Financial mutations: always in PostgreSQL transactions
- PII encryption: AES-256-GCM via AWS KMS
- SMS is primary notification (Africa's Talking → Twilio fallback)
- All ETB amounts as DECIMAL strings in API responses
- Trust scores: exponential decay model (lambda per metric type)
- Tier 5: MANUAL approval only — never auto-promote
- Indonesian COD (~40% of transactions): full cash workflow
- Ethiopian phone: strip leading 0, prepend +251

## ACTIVE TECHNICAL DEBT
None yet.

## KNOWN BLOCKERS
None yet.

## NEXT SESSION TASK
Implement Engine 1 (identity) + Engine 10 (strategy).
See memory-bank/engineStatus.md for detailed next steps.
──────────────────────────────────────────────────────────────

── FILE: memory-bank/productContext.md ───────────────────────
# RUIT CBE — Product Context

## What We Are Building
The RUIT Central Backend Engine is the intelligence core of an 
inland Ethiopian Logistics-as-a-Service platform. It connects:
- Freight Orderers (shippers, manufacturers, traders)
- Fleet Owners (truck operators)  
- Drivers (truck drivers)
through a trust-weighted, optimization-driven matching and 
financial settlement system.

## Ethiopian Ground Reality (Always Keep In Mind)
- Fuel queues are recurring (not rare) — platform must handle gracefully
- COD is ~40% of transactions — full cash workflow required
- Amharic is primary language for driver communications
- Dual-SIM phones are standard — store backup phone
- Rural corridors: 6+ hour connectivity dead zones are NORMAL
- GPS gaps are expected — never throw, always handle gracefully
- Informal verbal negotiation is culturally dominant (voice notes supported)
- Ethiopian fiscal year starts July 8 (not January 1)
- ETB only — no USD, no cross-border, no Djibouti

## Four Interfaces (Built in Dyad — React)
1. Driver Mobile App — low-bandwidth Android-first, USSD fallback
2. Fleet Owner Portal — ROI analytics, assignment management
3. Orderer Portal — load creation, tracking, invoices, webhooks
4. Internal OPS Dashboard — full system visibility, dispute resolution

## Three Phases
- Phase 1 (GROWTH): Fill every load. Trust > efficiency. Collect data.
- Phase 2 (DENSITY): Reduce idle time. Optimize corridors. Backhaul.
- Phase 3 (EFFICIENCY): Predictive pricing. AI matching. Fleet finance.

## Revenue Model
Commission on every completed load (default 8%, configurable).
Commission configs: PERCENTAGE | FIXED | TIERED per orderer/corridor/cargo.
──────────────────────────────────────────────────────────────

── FILE: memory-bank/architecture.md ─────────────────────────
# RUIT CBE — Architecture Reference

## Monorepo Structure
apps/          → 12 engines + notification-service
packages/      → shared-types, shared-db, shared-queue, shared-auth, shared-utils
infra/         → docker-compose, k8s, prometheus
memory-bank/   → AI memory system (read at session start)

## Package Dependency Rules
- Engines depend on packages/* only — never on each other directly
- shared-db is the ONLY place that imports from @prisma/client
- shared-types exports ALL Zod schemas and TypeScript types
- shared-auth exports JWT utils and RBAC middleware
- shared-queue exports BullMQ producer/consumer helpers
- shared-utils exports: ETB formatter, ET calendar, phone normalizer

## Engine Port Map
engine-identity:      3001
engine-optimizer:     3002
engine-corridor:      3003
engine-liquidity:     3004
engine-shock:         3005
engine-incident:      3006
engine-behavior:      3007
engine-data:          3008
engine-fraud:         3009
engine-strategy:      3010
engine-twin:          3011  (STUB ONLY in Phase 1)
engine-health:        3012
notification-service: 3013
API Gateway (Kong):   3000  (single entry point for all 4 interfaces)

## Key Technical Patterns
- Event sourcing: every state change → events table (append-only)
- WDM scoring: Weighted Decision Matrix in engine-optimizer
- Trust decay: exponential decay (lambda values per metric)
- Queue pattern: BullMQ with Redis backing, priority queues
- Caching: Redis with TTL per data type (see .clinerules)
- Auth: RS256 JWT, 15min access tokens, 30-day refresh in Redis
- RBAC: Fastify preHandler hook on all protected routes
- Idempotency: Idempotency-Key header, Redis 24h cache

## NO-GO ZONES (Never Do These)
- Hard delete any row
- UPDATE the events table
- Expose WDM weights/scores to non-OPS roles
- Hardcode ETB amounts, commission rates, trust thresholds
- Block flow due to NULLABLE-FLEXIBLE missing field
- Reference USD, cross-border corridors, or Djibouti
- Return raw DB errors to client
- Direct S3 uploads from client
- Auto-promote to Trust Tier 5

## TimescaleDB Tables (On TIMESCALE_URL — Separate Datasource)
- gps_traces (hypertable, 1-day chunks)
- driver_activity_logs (hypertable, 1-day chunks)
- corridor_snapshots (hypertable)
- orderer_behavior_snapshots (hypertable)
NOTE: TimescaleDB tables use raw SQL via Prisma $queryRaw — 
never native Prisma models for hypertable operations.
──────────────────────────────────────────────────────────────

── FILE: memory-bank/engineStatus.md ─────────────────────────
# RUIT CBE — Engine Implementation Status

## Status Legend
⬜ NOT STARTED | 🔧 IN PROGRESS | ✅ COMPLETE | ❌ BLOCKED

## Shared Packages (BUILD THESE FIRST)
⬜ shared-types    — Zod schemas, TypeScript types, event registry
⬜ shared-db       — Prisma schema, COMPLETE schema, migrations, seeds
⬜ shared-queue    — BullMQ helpers, queue names, retry configs
⬜ shared-auth     — JWT RS256, RBAC middleware, role definitions
⬜ shared-utils    — ETB formatter, ET calendar, phone normalizer

## Infrastructure
⬜ docker-compose.yml         — postgres:16, timescaledb:2, redis:7, minio
⬜ docker-compose.prod.yml    — production overrides
⬜ Kong configuration         — API gateway, rate limiting, routing
⬜ Prometheus config          — scrape configs for all 12 engines
⬜ Turborepo config           — build graph, pipeline definitions
⬜ CI/CD workflows            — GitHub Actions per engine

## Engines (Build In Order)
⬜ Engine 1:  identity    — Auth, KYC, Trust Scoring
⬜ Engine 10: strategy   — Strategy Versioning, A/B Testing  
⬜ Engine 2:  optimizer  — WDM Matching, Pricing, Quotes
⬜ Engine 4:  liquidity  — Escrow, COD, Exposure, Payouts
⬜ Engine 3:  corridor   — Density Scoring, Health, Checkpoints
⬜ Engine 5:  shock      — Shock Absorption, Fuel Queue Mode
⬜ Engine 6:  incident   — Disputes, State Machine, Evidence
⬜ Engine 7:  behavior   — Incentives, Loyalty, Notifications Triggers
⬜ Engine 9:  fraud      — 8 Detection Rules, Collusion Detection
⬜ Engine 8:  data       — GPS Streaming, AI Reservoir, POD
⬜ Engine 11: twin       — STUB ONLY (Phase 1)
⬜ Engine 12: health     — System Health, Governance, Dead Letter

## Notification Service
⬜ notification-service   — SMS (AT + Twilio), Push (FCM), USSD, Email

## Integration Layer (Phase 3)
⬜ API hardening for 4 Dyad interfaces
⬜ CORS config per interface
⬜ WebSocket rooms for driver GPS
⬜ SSE for OPS live feed
⬜ Webhook delivery system (orderer)
──────────────────────────────────────────────────────────────

── FILE: memory-bank/activeContext.md ────────────────────────
# RUIT CBE — Active Context

## Current Task
PHASE 0: Creating complete project scaffold and configuration.
No business logic yet. Scaffold only.

## What Was Just Completed
Project initialization — this file is being created now.

## What Comes Next
1. Complete Phase 0 (this session): All scaffold files created.
2. Next session: Implement shared packages (shared-types first).
3. Then: Engine 1 (identity) + Engine 10 (strategy).

## Current Working Files
All scaffold files being created in this session.

## Open Questions / Decisions Needed
None. All decisions are final per the PRD.
──────────────────────────────────────────────────────────────

── FILE: memory-bank/progress.md ──────────────────────────────
# RUIT CBE — Implementation Progress

## Completed ✅
- PRD v3.0 written and finalized
- Final Edits (9 patches) applied conceptually
- Amendment 2 (30 gap closures) written
- Project scaffold initialized (this session)

## In Progress 🔧
- Phase 0: Complete project foundation

## Not Started ⬜
- All engine implementations
- All shared package implementations
- Docker infrastructure
- Integration tests

## Known Technical Debt
None yet.

## Blockers
None.
──────────────────────────────────────────────────────────────

════════════════════════════════════════════════════════════════
TASK 3 OF 8 — ROOT MONOREPO CONFIG
════════════════════════════════════════════════════════════════

── FILE: pnpm-workspace.yaml ──────────────────────────────────
packages:
  - "apps/*"
  - "packages/*"
──────────────────────────────────────────────────────────────

── FILE: turbo.json ───────────────────────────────────────────
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*", ".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "dev:core": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
──────────────────────────────────────────────────────────────

── FILE: package.json (ROOT) ──────────────────────────────────
{
  "name": "ruit-cbe",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "dev:core": "turbo run dev --filter=engine-identity --filter=engine-strategy --filter=engine-optimizer --filter=engine-liquidity --filter=notification-service",
    "dev:ops": "turbo run dev --filter=engine-identity --filter=engine-strategy --filter=engine-optimizer --filter=engine-liquidity --filter=engine-incident --filter=engine-fraud --filter=engine-health --filter=notification-service",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate --filter=@ruit/shared-db",
    "db:migrate": "turbo run db:migrate --filter=@ruit/shared-db",
    "db:seed": "turbo run db:seed --filter=@ruit/shared-db",
    "keys:generate": "node scripts/generate-keys.js",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.13.0",
    "typescript": "^5.4.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
──────────────────────────────────────────────────────────────

── FILE: tsconfig.base.json ───────────────────────────────────
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "exclude": ["node_modules", "dist"]
}
──────────────────────────────────────────────────────────────

── FILE: .prettierrc ──────────────────────────────────────────
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
──────────────────────────────────────────────────────────────

── FILE: .eslintrc.base.js ────────────────────────────────────
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
──────────────────────────────────────────────────────────────

── FILE: .env.example ─────────────────────────────────────────
# ── DATABASE ─────────────────────────────────────────────────
DATABASE_URL=postgresql://ruit:password@localhost:5432/ruit_cbe
TIMESCALE_URL=postgresql://ruit:password@localhost:5433/ruit_ts

# ── CACHE & QUEUE ─────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── AUTH ─────────────────────────────────────────────────────
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRY_SECONDS=900
JWT_REFRESH_EXPIRY_SECONDS=2592000
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3

# ── STORAGE ──────────────────────────────────────────────────
AWS_REGION=eu-west-1
AWS_S3_BUCKET=ruit-cbe-storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_KMS_KEY_ID=
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123

# ── NOTIFICATIONS ────────────────────────────────────────────
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=ruit
AFRICASTALKING_SENDER_ID=RUIT
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
FIREBASE_PROJECT_ID=ruit-driver
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
RESEND_API_KEY=

# ── FEATURE FLAGS ────────────────────────────────────────────
SHOCK_MODE_ENABLED=true
FUEL_QUEUE_MODE_ENABLED=true
USSD_ENABLED=true
MULTI_STOP_LOADS_ENABLED=false
AI_PREDICTIONS_ENABLED=false
ELASTICSEARCH_ENABLED=false

# ── BUSINESS CONFIG ────────────────────────────────────────────
DEFAULT_ACCEPTANCE_WINDOW_MINUTES=15
MAX_ASSIGNMENT_ATTEMPTS=5
GPS_BATCH_MAX_POINTS=500
GPS_OFFLINE_BATCH_MAX_AGE_HOURS=48
USSD_DELIVERY_PHOTO_GRACE_HOURS=2
SMS_FALLBACK_WAIT_SECONDS=90
──────────────────────────────────────────────────────────────

════════════════════════════════════════════════════════════════
TASK 4 OF 8 — DOCKER INFRASTRUCTURE
════════════════════════════════════════════════════════════════

── FILE: infra/docker-compose.yml ─────────────────────────────
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: ruit_postgres
    environment:
      POSTGRES_USER: ruit
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ruit_cbe
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ruit -d ruit_cbe"]
      interval: 10s
      timeout: 5s
      retries: 5

  timescaledb:
    image: timescale/timescaledb:2.14.2-pg16
    container_name: ruit_timescaledb
    environment:
      POSTGRES_USER: ruit
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ruit_ts
    ports:
      - "5433:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ruit -d ruit_ts"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ruit_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: ruit_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  timescale_data:
  redis_data:
  minio_data:
──────────────────────────────────────────────────────────────

── FILE: infra/prometheus/prometheus.yml ──────────────────────
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'engine-identity'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: /metrics

  - job_name: 'engine-optimizer'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: /metrics

  - job_name: 'engine-corridor'
    static_configs:
      - targets: ['localhost:3003']
    metrics_path: /metrics

  - job_name: 'engine-liquidity'
    static_configs:
      - targets: ['localhost:3004']
    metrics_path: /metrics

  - job_name: 'engine-shock'
    static_configs:
      - targets: ['localhost:3005']
    metrics_path: /metrics

  - job_name: 'engine-incident'
    static_configs:
      - targets: ['localhost:3006']
    metrics_path: /metrics

  - job_name: 'engine-behavior'
    static_configs:
      - targets: ['localhost:3007']
    metrics_path: /metrics

  - job_name: 'engine-data'
    static_configs:
      - targets: ['localhost:3008']
    metrics_path: /metrics

  - job_name: 'engine-fraud'
    static_configs:
      - targets: ['localhost:3009']
    metrics_path: /metrics

  - job_name: 'engine-strategy'
    static_configs:
      - targets: ['localhost:3010']
    metrics_path: /metrics

  - job_name: 'engine-twin'
    static_configs:
      - targets: ['localhost:3011']
    metrics_path: /metrics

  - job_name: 'engine-health'
    static_configs:
      - targets: ['localhost:3012']
    metrics_path: /metrics

  - job_name: 'notification-service'
    static_configs:
      - targets: ['localhost:3013']
    metrics_path: /metrics
──────────────────────────────────────────────────────────────

════════════════════════════════════════════════════════════════
TASK 5 OF 8 — SHARED PACKAGES SCAFFOLD
════════════════════════════════════════════════════════════════

Create the scaffold structure for all 5 shared packages.
For each package, create: package.json, tsconfig.json, src/index.ts.
The src/index.ts for each package is a REAL implementation —
not a placeholder. Use the specifications below exactly.

── PACKAGE: packages/shared-types ─────────────────────────────

packages/shared-types/package.json:
{
  "name": "@ruit/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}

packages/shared-types/tsconfig.json:
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}

packages/shared-types/src/index.ts — implement ALL of the following:

1. Role enum: SUPER_ADMIN | OPS_ADMIN | OPS_VIEWER | FINANCE_OPS | 
   FLEET_OWNER | ORDERER | DRIVER | SYSTEM_SERVICE
   
2. Entity status enums: UserStatus, TruckStatus, LoadStatus, 
   TripStatus, AssignmentStatus, IncidentStatus, IncidentSeverity,
   PaymentModel, TruckType, CargoType, KycDocType, TxType

3. Zod schemas for ALL 30 database tables defined in the PRD:
   UserSchema, FleetOwnerSchema, OrdererSchema, DriverSchema, 
   TruckSchema, KycDocumentSchema, LoadSchema, LoadNegotiationSchema,
   AssignmentSchema, TripSchema, CommissionConfigSchema,
   FinancialTransactionSchema, ExposureCapSchema, 
   OrdererPaymentContractSchema, RateCardVersionSchema,
   GpsTraceSchema, FuelLogSchema, DriverActivityLogSchema,
   CorridorSnapshotSchema, EthiopianCalendarEventSchema,
   CorridorCheckpointSchema, OrdererBehaviorSnapshotSchema,
   EventSchema, CorridorSchema, StrategyVersionSchema,
   DecisionTraceSchema, IncidentSchema, FraudFlagSchema,
   ShockEventSchema, WebhookSchema, NotificationPreferenceSchema

4. AccessTokenPayload interface (exact shape from PRD Section 4.3)

5. Complete Event Registry — TypeScript union type EventType with 
   ALL 47 event types from the PRD event registry table including:
   the 40 base events + 7 added in Final Edits + Amendment 2:
   USER_REGISTERED, KYC_DOCUMENT_UPLOADED, KYC_APPROVED,
   TRUST_SCORE_UPDATED, INSURANCE_EXPIRY_WARNING, LOAD_CREATED,
   QUOTE_GENERATED, QUOTE_ACCEPTED, QUOTE_REJECTED, NEGOTIATION_ROUND,
   ASSIGNMENT_SUGGESTED, ASSIGNMENT_ACCEPTED, ASSIGNMENT_REJECTED,
   ASSIGNMENT_EXPIRED, PICKUP_CONFIRMED, GPS_TRACE_BATCH,
   DEVIATION_DETECTED, IDLE_ALERT, DELIVERY_CONFIRMED, POD_UPLOADED,
   TRIP_ROAD_CONDITION_REPORTED, ESCROW_HELD, PAYMENT_RELEASED,
   PAYMENT_DELAYED, EXPOSURE_CAP_WARNING, EXPOSURE_CAP_BREACHED,
   FUEL_LOG_SUBMITTED, INCIDENT_OPENED, EVIDENCE_SUBMITTED,
   INCIDENT_RESOLVED, DISPUTE_ESCALATED, CORRIDOR_HEALTH_UPDATED,
   CORRIDOR_FROZEN, SHOCK_MODE_ACTIVATED, SHOCK_MODE_DEACTIVATED,
   FUEL_QUEUE_MODE_ACTIVATED, STRATEGY_VERSION_CHANGED,
   FRAUD_FLAG_RAISED, COLLUSION_DETECTED, MANUAL_OVERRIDE_ISSUED,
   WEBHOOK_TRIGGERED, COD_DISCREPANCY_REPORTED, TIER5_ELIGIBILITY_REACHED,
   TRUST_WARNING, USSD_POD_OVERDUE, LOAD_EXHAUSTED_ATTEMPTS,
   CROSS_TENANT_ACCESS

6. API response wrapper types:
   ApiResponse<T>, PaginatedResponse<T>, ErrorResponse

7. WDM types: WDMWeights interface, DecisionTraceInput, CandidateScore

8. Trust types: TrustWeights (driver + fleet_owner variants),
   DecayConfig with lambda values, TrustFactorScores

9. Queue names as const:
   QUEUES = { LIQUIDITY, SHOCK, OPTIMIZER, INCIDENT, IDENTITY, 
              CORRIDOR, NOTIFICATIONS, FRAUD, BEHAVIOR, DATA }

── PACKAGE: packages/shared-db ────────────────────────────────

packages/shared-db/package.json:
{
  "name": "@ruit/shared-db",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx src/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0"
  }
}

packages/shared-db/prisma/schema.prisma — write the COMPLETE 
Prisma schema with ALL 30 tables from PRD Section 5 plus all 
Amendment 2 additions:

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

Include ALL tables:
- users (with all columns including phone encryption note)
- fleet_owners (with payment_reliability_score from Amendment E6)
- orderers (with payment_reliability_score from Amendment E6)
- drivers (with cod_discrepancy_count, cod_trips_total from Amendment A1)
- trucks (all columns)
- kyc_documents
- loads (with strategy_version_id reference)
- load_negotiations
- assignments (with decision_trace_id)
- trips (full schema)
- commission_configs (with commission_config_id audit)
- financial_transactions (with commission_config_id from Amendment A5)
- exposure_caps (with CLUSTER scope_type from Amendment A4)
- orderer_payment_contracts
- rate_card_versions
- events (append-only, no update/delete in application layer)
- corridors (full schema from Amendment 2)
- strategy_versions (full schema from Amendment 2)
- decision_traces (full schema with backhaul confidence fields A3)
- incidents (full schema from Amendment 2)
- fraud_flags
- shock_events
- webhooks
- notification_preferences
- ethiopian_calendar_events
- corridor_checkpoints

NOTE: TimescaleDB hypertable tables (gps_traces, fuel_logs, 
driver_activity_logs, corridor_snapshots, orderer_behavior_snapshots)
are NOT in schema.prisma — they use raw SQL in shared-db/src/timescale.ts

packages/shared-db/src/timescale.ts — write raw SQL creation 
statements for all 5 TimescaleDB hypertables with:
- CREATE TABLE statements (exact columns from PRD Section 5.4)
- SELECT create_hypertable() calls
- CREATE INDEX statements  
- SELECT add_retention_policy() calls
- Amendment A2 columns on corridor_snapshots

packages/shared-db/src/seed.ts — write the complete seed script:
- 10 Ethiopian corridors (exact data from PRD Section 12.2 table)
- 1 SUPER_ADMIN user
- 1 active strategy_version (GROWTH mode, Phase 1 weights)
- 1 commission_config at 8% flat rate (global default)
- 10 ethiopian_calendar_events for current year
- 5 exposure_cap cluster rows (Amendment A4 seed data)
- 3 exposure_caps for SYSTEM scope
- corridor_checkpoints for major corridors (at least 2 per corridor)

packages/shared-db/src/index.ts — export:
- PrismaClient instance (singleton pattern)
- generateId(prefix: string): string — uses ulid(), prepends prefix
- All Prisma types re-exported

── PACKAGE: packages/shared-queue ─────────────────────────────

packages/shared-queue/package.json:
{
  "name": "@ruit/shared-queue",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc" },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": { "typescript": "^5.4.0" }
}

packages/shared-queue/src/index.ts — implement:
1. Redis connection singleton (ioredis)
2. All 10 BullMQ Queue instances with correct names:
   liquidityQueue, shockQueue, optimizerQueue, incidentQueue,
   identityQueue, corridorQueue, notificationsQueue, fraudQueue,
   behaviorQueue, dataQueue
3. Queue retry configs per PRD Section 10.3 (exact retry counts 
   and backoff patterns from the queue retry policies table)
4. addJob(queue, name, data, opts) — idempotent job producer 
   (checks Redis key before enqueuing, sets key on completion)
5. createWorker(queue, processor, concurrency) — worker factory
6. Export all queue names as QUEUES const

── PACKAGE: packages/shared-auth ─────────────────────────────

packages/shared-auth/package.json:
{
  "name": "@ruit/shared-auth",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc" },
  "dependencies": {
    "jose": "^5.2.0",
    "ioredis": "^5.3.0",
    "@ruit/shared-types": "workspace:*"
  },
  "devDependencies": { "typescript": "^5.4.0" }
}

packages/shared-auth/src/index.ts — implement:
1. signAccessToken(payload: AccessTokenPayload): Promise<string>
   — RS256, 15min expiry, jti = ulid()
2. signRefreshToken(userId: string): Promise<string>
   — RS256, 30-day expiry, stored in Redis with key rotation
3. verifyAccessToken(token: string): Promise<AccessTokenPayload>
   — verifies RS256, checks Redis denylist
4. revokeToken(jti: string): Promise<void>
   — adds jti to Redis denylist
5. requireRole(roles: Role[]) — Fastify preHandler hook factory
   — checks JWT, validates role, checks entity_id isolation
   — cross-tenant OPS access logs CROSS_TENANT_ACCESS event
6. generateOtp(): string — 6-digit numeric OTP
7. storeOtp(phone, otp) / verifyOtp(phone, otp): Redis-backed, 
   5min TTL, max 3 attempts, 30min lockout after failures
8. normalizePhone(phone: string): string 
   — strips leading 0, prepends +251

── PACKAGE: packages/shared-utils ─────────────────────────────

packages/shared-utils/package.json:
{
  "name": "@ruit/shared-utils",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc" },
  "dependencies": {
    "ethiopian-calendar-converter": "*"
  },
  "devDependencies": { "typescript": "^5.4.0" }
}

packages/shared-utils/src/index.ts — implement:
1. formatETB(amount: Decimal | number | string): string
   — formats as Ethiopian Birr string, 2 decimal places, 
   — never returns a float, always string
2. parseETB(value: string): number — parses ETB string safely
3. toEthiopianDate(date: Date): { day: number, month: number, 
   year: number, monthName: string, amharicDate: string }
   — uses ethiopian-calendar-converter library
4. formatDateResponse(date: Date): { gregorian_date: string, 
   ethiopian_date: string }
   — returns both formats for all API responses
5. getEthiopianFiscalYear(date: Date): number
   — Ethiopian fiscal year starts Hamle 1 (≈ July 8)
6. normalizePhone(phone: string): string
   — strips leading 0, prepend +251
7. cached<T>(key, ttlSeconds, fetchFn): Promise<T>
   — Redis cache wrapper with TTL, used by all hot read paths
8. generateId(prefix: string): string
   — ulid() with prefix: generateId('usr') → 'usr_01HXXX...'
9. getAmharicMonth(monthNumber: number): string
   — returns Amharic month name (ጥር, የካቲት, etc.)

════════════════════════════════════════════════════════════════
TASK 6 OF 8 — ENGINE SCAFFOLDS (ALL 13 SERVICES)
════════════════════════════════════════════════════════════════

For EACH of the 13 services below, create this exact structure:
apps/{service-name}/
├── package.json
├── tsconfig.json  
└── src/
    ├── index.ts    ← Fastify app with health endpoint ONLY
    └── routes/
        └── health.ts

The package.json for every engine follows this template 
(replace {name}, {port}, {description} accordingly):
{
  "name": "@ruit/{engine-name}",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^4.0.0",
    "pino": "^9.0.0",
    "@ruit/shared-types": "workspace:*",
    "@ruit/shared-db": "workspace:*",
    "@ruit/shared-auth": "workspace:*",
    "@ruit/shared-queue": "workspace:*",
    "@ruit/shared-utils": "workspace:*",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}

The src/index.ts for every engine follows this template:
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { healthRoutes } from './routes/health.js';

const PORT = {PORT_NUMBER};
const ENGINE_NAME = '{engine-name}';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' } : undefined,
  },
});

// Register plugins
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' });
await app.register(swagger, {
  openapi: {
    info: { 
      title: `RUIT CBE — ${ENGINE_NAME}`, 
      version: '1.0.0',
      description: '{engine description}'
    },
    tags: [
      { name: 'health', description: 'Health check' },
      // Add interface tags: driver, fleet, orderer, ops
    ],
  },
});
await app.register(swaggerUi, { routePrefix: '/docs' });

// Register routes
await app.register(healthRoutes, { prefix: '/api/v1' });

// Start
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`${ENGINE_NAME} running on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export { app };

The src/routes/health.ts for every engine:
import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    schema: {
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            engine: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => ({
    status: 'UP',
    engine: '{engine-name}',
    timestamp: new Date().toISOString(),
  }));
};

Create this scaffold for ALL 13 services:
1.  engine-identity       port 3001  "Identity, KYC, Trust Scoring"
2.  engine-optimizer      port 3002  "Dynamic Optimization, WDM, Pricing"
3.  engine-corridor       port 3003  "Corridor Intelligence & Density"
4.  engine-liquidity      port 3004  "Liquidity, Escrow, COD, Exposure"
5.  engine-shock          port 3005  "Shock Absorption, Fuel Queue Mode"
6.  engine-incident       port 3006  "Incidents, Disputes, State Machine"
7.  engine-behavior       port 3007  "Behavioral Shaping, Incentives"
8.  engine-data           port 3008  "Data Capture, GPS, AI Reservoir"
9.  engine-fraud          port 3009  "Fraud & Collusion Detection"
10. engine-strategy       port 3010  "Strategy Versioning, A/B Testing"
11. engine-twin           port 3011  "Digital Twin — STUB ONLY Phase 1"
12. engine-health         port 3012  "System Health & Governance"
13. notification-service  port 3013  "SMS, Push, USSD, Email"

SPECIAL CASE — engine-twin (STUB ONLY):
This engine gets ONLY the health route + this response:
{ status: 'STUB', phase: 1, message: 'Digital Twin not active in Phase 1.' }
No other implementation. No database access. No queue workers.

════════════════════════════════════════════════════════════════
TASK 7 OF 8 — GITHUB ACTIONS CI/CD
════════════════════════════════════════════════════════════════

Create .github/workflows/ci.yml:

name: RUIT CBE CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm lint

  test:
    needs: build-and-lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: ruit
          POSTGRES_PASSWORD: password
          POSTGRES_DB: ruit_cbe_test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    env:
      DATABASE_URL: postgresql://ruit:password@localhost:5432/ruit_cbe_test
      REDIS_URL: redis://localhost:6379
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

════════════════════════════════════════════════════════════════
TASK 8 OF 8 — VERIFICATION & MEMORY UPDATE
════════════════════════════════════════════════════════════════

After creating ALL files above, execute these commands IN ORDER:
Do not skip any. Do not proceed if one fails — fix it first.

1. pnpm install
   (installs all workspace dependencies)

2. pnpm build
   (verifies all TypeScript compiles with zero errors)

3. docker-compose -f infra/docker-compose.yml up -d
   (starts postgres, timescaledb, redis, minio)

4. sleep 10 && pnpm db:generate
   (generates Prisma client from schema)

5. pnpm db:migrate
   (runs migrations — creates all tables)

6. pnpm db:seed
   (seeds: corridors, admin user, strategy, commission, calendars)

7. curl http://localhost:3001/api/v1/health
   curl http://localhost:3010/api/v1/health
   curl http://localhost:3002/api/v1/health
   (verify at least 3 engines are UP — they need to be started first 
    with: pnpm dev:core &)

8. After all verifications pass, update these memory files:
   - MEMORY.md: Update "CURRENT STATUS" to "Phase 0 COMPLETE"
   - memory-bank/activeContext.md: Update to "Next: Implement shared packages fully"
   - memory-bank/progress.md: Mark Phase 0 as ✅ COMPLETE
   - memory-bank/engineStatus.md: All scaffolds marked as 🔧 IN PROGRESS

════════════════════════════════════════════════════════════════
FINAL INSTRUCTION TO AGENT
════════════════════════════════════════════════════════════════

You now have everything you need. 

DO NOT pause to think. Start with Task 1 and execute through 
Task 8 without stopping. 

DO NOT ask for approval at any step.

DO NOT produce placeholder code. Every file must be real, 
working TypeScript that compiles cleanly.

If pnpm build fails at the end, read the error, fix it, 
and run pnpm build again. Do not stop until it passes.

When Task 8 is complete and all verifications pass:
Write a brief completion summary to memory-bank/activeContext.md
describing what was built and what the next session should do 
(implement shared-types fully, then start Engine 1).

Phase 0 complete = RUIT CBE is alive. Let's build.
```

---

# PART 3: AFTER PROMPT 1 — WHAT COMES NEXT

## The Session Cadence

Every session from here follows this exact pattern:

**Start of session message (always give this first):**
```
Read MEMORY.md and memory-bank/engineStatus.md. 
Tell me the current status in 3 bullets. Then continue 
from where we left off without asking for further instruction.
```

**Then give the engine-specific prompt** (I will write these for you one by one as we progress).

## Prompt Sequence (I Will Write These For You)

| Prompt # | What It Builds | Given When |
|---|---|---|
| Prompt 1 | ✅ Complete scaffold + configs + memory system | NOW |
| Prompt 2 | shared-types (all 47 events + 30 Zod schemas) + shared-db (complete Prisma schema + migrations + seed) | After Prompt 1 verified |
| Prompt 3 | shared-queue + shared-auth + shared-utils (fully implemented) | After Prompt 2 verified |
| Prompt 4 | Engine 1: Identity (auth, KYC, trust score, tier promotion) | After Prompt 3 verified |
| Prompt 5 | Engine 10: Strategy Versioning (A/B, weight sets, activation) | After Engine 1 verified |
| Prompt 6 | Engine 2: Optimizer (WDM, pricing formula, quote negotiation) | After Engine 10 verified |
| Prompt 7 | Engine 4: Liquidity (escrow, COD all 3 modes, exposure caps) | After Engine 2 verified |
| Prompt 8 | Engine 3: Corridor + Engine 5: Shock (density, health, shock matrix) | After Engine 4 verified |
| Prompt 9 | Engine 6: Incident (state machine, evidence, SLAs) + Engine 9: Fraud (8 rules) | After Engine 5 verified |
| Prompt 10 | Engine 7: Behavior + Notification Service (SMS, USSD, FCM, templates) | After Engine 9 verified |
| Prompt 11 | Engine 8: Data (GPS streaming, POD, AI reservoir) + Engine 12: Health | After Engine 7 verified |
| Prompt 12 | Integration Layer: CORS, WebSockets, SSE, Webhook delivery, Dyad-ready | After all engines verified |

## CTO Reminders Before You Start

1. **Auto-approve everything.** File writes, terminal commands, all of it. Kimi K2.5 needs to run uninterrupted.

2. **One prompt at a time.** Never give Prompt 2 until Prompt 1's `pnpm build` passes clean.

3. **If Kimi gets stuck:** It will. When it does, send this exact message:
   ```
   Stop thinking. Read the terminal error output only. 
   Fix the specific error on line {X}. Run pnpm build again.
   ```

4. **Never skip verification.** `pnpm build` must pass with 0 errors before we move on. This is the gate between every prompt.

5. **The memory system is sacred.** Kimi must update MEMORY.md at the end of every session. If it forgets, remind it before ending the session.

6. **Dyad integration is built-in.** The .clinerules and every engine scaffold already encode the 4-interface awareness. When we build Dyad interfaces later, they'll plug directly into this backend with zero refactoring.
