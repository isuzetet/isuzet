# RUIT CBE — Developer Guide

**Version:** 1.0.0 (Phase 1)  
**Last Updated:** March 5, 2026  
**Platform:** Ethiopian Logistics-as-a-Service (LaaS)

---

# CHAPTER 1 — WHAT IS THIS SYSTEM? (Zero Jargon)

## 1.1 The Problem We Are Solving

### What is Freight Logistics in Ethiopia?

Ethiopia is a landlocked country in East Africa with over 120 million people. Everything the country needs — food, medicine, building materials, electronics — must be moved by trucks across vast distances. The capital, Addis Ababa, sits in the middle of the country. Goods travel along "corridors" (major highways) to cities like Dire Dawa (east), Bahir Dar (north), Hawassa (south), and Jimma (west).

### Why Is It Hard Today?

**The Informal Market:** Today, moving freight in Ethiopia works like this: someone who needs goods moved (an "orderer") calls a phone number they got from a friend. They negotiate a price verbally. They have no way to know if the driver will show up, if the truck is safe, or if the cargo will arrive intact. Trust is based entirely on personal relationships.

**Trust Issues:** If the driver doesn't show up, the orderer loses money and time. If the cargo is damaged, there's no clear way to resolve who's at fault. If the orderer doesn't pay, the driver worked for nothing. Everyone is exposed to risk.

**No Escrow:** When an orderer pays, that money goes directly to the driver or fleet owner immediately — or sometimes promised later. There's no middle ground where money is held safely until the job is confirmed complete. This means either side can cheat the other.

### What Does RUIT CBE Do to Fix This?

RUIT CBE (pronounced "Root C-B-E," where CBE stands for Commercial Bank of Ethiopia) is a digital platform that brings structure to this chaotic market. It works like an "Uber for trucks, but designed for Ethiopia" — with crucial differences:

- **Trust Scoring:** Every driver and fleet owner gets a trust score (0-100) based on their actual behavior. High scores unlock better jobs and faster payments. Low scores restrict access.
- **Escrow System:** Money is held "in the middle" by the system until delivery is confirmed. Both sides are protected.
- **Smart Matching:** When an orderer posts a load, the system automatically finds the best available driver based on location, trust, past performance, and current demand.
- **Ethiopian Calendar Support:** The system understands Ethiopian holidays, seasons, and the Ethiopian calendar (which has 13 months).
- **Shock Mode:** When things go wrong — fuel shortages, political unrest, natural disasters — the system can automatically adjust pricing and operations.

## 1.2 The Main Players (Who Uses This System?)

### Fleet Owner

**Who They Are:** People who own trucks. Some own one truck they drive themselves. Others own fleets of 10, 20, or 100 trucks and hire drivers. These are small business owners in the Ethiopian transport sector.

**What They Want:**
- Steady work for their trucks (no idle trucks losing money)
- Reliable payment (not chasing customers for money)
- Protection if things go wrong (accidents, cargo damage)
- Ability to grow their business

**What They Can Do:**
- Register their trucks with documents (insurance, inspection certificates)
- See available loads on their routes
- Accept or negotiate on loads
- Track their trucks and drivers
- Receive payment automatically when delivery is confirmed

### Driver

**Who They Are:** Professional truck drivers in Ethiopia, licensed to drive heavy vehicles. Some own their trucks (also fleet owners). Many work for fleet owners. They spend days or weeks on the road between cities.

**What They Want:**
- Fair pay for their work
- Safe, well-maintained trucks
- Clear instructions on pickups and deliveries
- Protection from unfair blame
- Ability to build a reputation and get better jobs

**What They Can Do:**
- Receive load offers via SMS or app
- Accept loads with one click
- Upload proof of delivery (photos, signatures)
- Report incidents or problems
- Build trust score through good performance

### Orderer (Cargo Shipper)

**Who They Are:** Businesses or individuals who need goods moved. This includes:
- Manufacturing companies moving products to market
- Impporters bringing goods from Djibouti port
- Farmers sending produce to cities
- Retailers restocking shops
- Individuals relocating

**What They Want:**
- Reliable pickup and delivery times
- Fair, transparent pricing
- Ability to track their shipment
- Protection if cargo is damaged
- Easy payment options

**What They Can Do:**
- Post loads with details (what, where, when)
- Get instant price quotes
- Choose payment methods (escrow, cash on delivery, credit)
- Track shipments in real-time
- Rate drivers after delivery

### OPS Team (Operations)

**Who They Are:** RUIT CBE employees who keep the platform running smoothly. They monitor the system, resolve disputes, review KYC documents, and handle emergencies.

**What They Do:**
- Verify identity documents (driver's licenses, truck registrations)
- Resolve disputes between orderers and drivers
- Activate "shock mode" during emergencies
- Monitor corridor health and performance
- Approve high-tier (Tier 5) fleet owners manually
- Generate reports for CBE (the bank)

### CBE (Commercial Bank of Ethiopia)

**Their Role:** CBE is Ethiopia's largest bank and the financial partner for this platform. They provide:
- Banking infrastructure for holding escrow funds
- Regulatory oversight and compliance requirements
- Loan portfolio monitoring (ensuring the platform remains financially healthy)
- Credibility and trust with Ethiopian users

CBE requires regular reports on:
- Loan portfolio quality
- Financial transaction summaries
- Corridor performance metrics
- Ethiopian calendar-based reporting periods

## 1.3 A Day in the Life of a Shipment

Let me walk you through a complete shipment, step by step.

### Morning: The Coffee Exporter

Beza owns a coffee export business in Addis Ababa. She has received an order from a European buyer for 20,000 kg of specialty coffee beans. The beans are currently in a warehouse in Hawassa (275 km south of Addis). She needs them transported to her processing facility in Addis by Thursday.

**Step 1: Posting the Load**

Beza opens the RUIT CBE app on her phone. She creates a new load:
- Origin: Hawassa Industrial Zone Warehouse
- Destination: Addis Ababa, her processing facility
- Cargo: Green coffee beans, 20,000 kg
- Type: Refrigerated (reefer) required
- Pickup: Tomorrow morning
- Delivery deadline: Thursday 5 PM
- Preferred payment: Escrow

The system immediately checks:
- Is Beza verified? (Yes, she's Tier 2 orderer)
- Does she have credit available? (Yes, 100,000 ETB)
- Is the corridor active? (Yes, Addis-Hawassa is healthy)

**Step 2: Price Calculation (WDM Algorithm)**

The system calculates a price using the WDM (Weight-Distance-Mode) algorithm:

```
Base calculation:
- Distance: 275 km
- Weight: 20,000 kg = 20 metric tons
- Base rate: 15 ETB per km for standard cargo
- Cargo multiplier: 1.5x for coffee (high value, requires care)
- Urgency: 1.2x (2-day deadline is tight)
- Trust adjustment: 0.95x (Beza is reliable payer)
- Corridor density: 1.1x (Hawassa-Addis is busy route)

Base price = 275 km × 15 ETB/km = 4,125 ETB
With adjustments = 4,125 × 1.5 × 1.2 × 0.95 × 1.1 = 7,747 ETB

RUIT Commission (8%) = 620 ETB
Fleet Payout = 7,127 ETB

Negotiation band: ±15%
Orderer sees: 6,585 ETB — 8,909 ETB
System quote: 7,747 ETB
```

Beza sees that the system has already calculated Ethiopian calendar integration — next week is the week before Meskel (a major religious festival), so demand is higher. The price reflects this.

Beza accepts the system quote and posts the load.

**Step 3: Matching Algorithm**

The Optimizer Engine now finds the best driver. It considers:

1. **Location:** Which drivers have trucks currently in or near Hawassa?
2. **Availability:** Who is not currently on a job?
3. **Truck match:** Who has a refrigerated truck with 20-ton capacity?
4. **Trust score:** Who has a score above 60 (Tier 2+)?
5. **Performance:** Who has high on-time delivery rates?
6. **Corridor familiarity:** Who has done this route before?

Two candidates emerge:

**Driver A:** Girma
- Trust score: 78 (Tier 3)
- Location: Hawassa (just delivered a load)
- Truck: 25-ton reefer, insured
- On-time rate: 94%
- Favorite route: Hawassa-Addis (done it 40 times)

**Driver B:** Desta
- Trust score: 52 (Tier 2)
- Location: Shashemene (80 km north, could be in Hawassa by morning)
- Truck: 20-ton reefer
- On-time rate: 81%
- Never done Hawassa-Addis before

The algorithm calculates scores:
- Girma: 0.85 (location) × 0.78 (trust) × 0.94 (on-time) × 0.90 (familiarity) = 0.56
- Desta: 0.60 (location) × 0.52 (trust) × 0.81 (on-time) × 0.40 (familiarity) = 0.10

Girma wins.

**Step 4: Offer and Acceptance**

[Girma receives SMS in Amharic: "New shipment request: Hawassa→Addis, Coffee 20tn, 7,747 birr. Accept? Reply 1"]

Girma calls his fleet owner Abebe, who confirms. Girma accepts by replying "1".

**Step 5: Assignment and Escrow**

When Girma accepts:
1. System creates an Assignment record
2. Liquidity Engine checks Beza's credit (100,000 ETB limit, 40,000 used)  
3. New exposure: 47,747 ETB (under limit ✓)
4. 7,747 ETB held in escrow
5. Both parties notified

**Step 6: Execution**

Tuesday: Girma arrives at 7:45 AM for 8:00 AM pickup. Warehouse loads coffee. Girma uploads POD photo via USSD (*847*photo#). System confirms pickup with GPS.

Girma drives north on A7 highway. GPS tracks every 15 minutes:
- 9:30 AM: 45 km north
- 11:00 AM: 120 km, entering Shashemene  
- 12:30 PM: Lunch stop in Ziway
- 2:00 PM: 240 km, approaching Addis
- 2:30 PM: Arrives at Beza's facility

Receiving manager inspects and signs POD on tablet. Photo uploaded.

**Step 7: Escrow Release**

1. OPS reviews POD (2 hours)
2. Escrow releases:
   - 620 ETB → RUIT (commission)
   - 7,127 ETB → Abebe (Girma's fleet owner)
3. Abebe is Tier 3 = T1 payout (next business day)
4. Thursday: Money in Abebe's CBE account

**Step 8: Trust Updates**

- Beza rates Girma: 5 stars
- Girma rates Beza: 5 stars
- Girma's on-time rate: now 94.2%
- Trust Worker recalculates scores overnight

## 1.4 What Makes This System Special

### The Trust Tier System

Everyone starts at Tier 0 (trust score 50/100). Your score comes from actual behavior:

| Metric | What It Tracks |
|--------|----------------|
| On-time rate | Were you late? |
| Dispute count | Complaints against you |
| Route deviation | Unauthorized detours |
| Cancellation rate | Accepted then cancelled |
| Incident count | Accidents, damage |
| COD discrepancy | Cash collected matches? |

**Decay weighting:** Recent events hurt more. A dispute last week > dispute 3 months ago.

| Tier | Score | Payout | Credit | Corridors |
|------|-------|--------|--------|-----------|
| 0 | 0-39 | T7 | 0 | Home only |
| 1 | 40-54 | T7 | 0 | Home + 1 |
| 2 | 55-69 | T3 | 25,000 | Home + 3 |
| 3 | 70-79 | T1 | 100,000 | All |
| 4 | 80-89 | T0 | 250,000 | All |
| 5 | 90-100 | Pre-funded | 500,000 | All + priority |

**Tier 5 gate:** Even if score hits 90+, OPS must manually approve Tier 5 (fraud protection).

### The Shock Mode System

Ethiopia faces: fuel shortages, political unrest, seasonal flooding, religious holidays.

**4 Severity Levels:**

| Severity | Margin Floor | Band Max | Exposure Cap |
|----------|--------------|----------|--------------|
| 1 - Advisory | +5% | 1.15x | Standard |
| 2 - Moderate | +15% | 1.10x | -20% |
| 3 - Severe | +30% | 1.05x | -40% |
| 4 - Critical | +50% | 1.00x | -60% |

Activation: Automatically (incident rate thresholds) or manually (OPS team).

### The Escrow System

Money flow:
1. Load posted → payment method verified
2. Driver accepts → funds held (not transferred)
3. Delivery confirmed → OPS reviews POD
4. Escrow releases → RUIT commission + fleet payout
5. Every ETB tracked in `financial_transactions` table

If problems: escrow frozen until incident resolution.

### Ethiopian Calendar Integration

Ethiopian calendar = 13 months, 7-8 years behind Gregorian.

```json
{
  "created_at": "2026-09-27T10:30:00Z",
  "created_at_et": "2019-01-17 መስከረም 17 2019"
}
```

System knows holidays, adjusts pricing, reports to CBE in Ethiopian fiscal years.

### Strategy Engine — Dynamic Pricing

No fixed prices. **Strategy versions** = configurable rule sets.

- **Weight set:** Factor importance (trust vs location vs truck type)
- **Threshold set:** Limits (max penalties, tier minimums)
- **Pricing params:** Base rates, multipliers
- **Optimization mode:** GROWTH | DENSITY | EFFICIENCY | SHOCK

OPS admins create versions → test with A/B → activate → rollback if needed.

---

# CHAPTER 2 — TECHNICAL DEEP DIVE

## 2.1 System Architecture

### Microservices Pattern

13 separate engines, each responsible for one domain:
- Independent scaling/fault isolation
- Direct DB access via Prisma (no HTTP between engines)
- Shared PostgreSQL database

### ASCII Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENTS                                                             │
│  Mobile Apps  │  USSD/SMS  │  OPS Dashboard                          │
└───────────────┴────────────┴──────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         13 ENGINES                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 3001 Identity   │ 3002 Optimizer │ 3003 Corridor    │ 3004 Liquidity│
│ ─────────────   │ ────────────   │ ─────────────   │ ────────────   │
│ Auth, KYC,      │ WDM, Pricing,  │ Density, Health, │ Escrow, COD,  │
│ Trust           │ Assignment     │ Snapshots        │ Exposure      │
├─────────────────────────────────────────────────────────────────────┤
│ 3005 Shock      │ 3006 Incident  │ 3007 Behavior    │ 3008 Data     │
│ ─────────────   │ ─────────────  │ ────────────     │ ────────────  │
│ Severity, Fuel  │ State Machine, │ Anomalies,       │ Aggregations, │
│ Queue           │ Disputes       │ Stats            │ Reports       │
├─────────────────────────────────────────────────────────────────────┤
│ 3009 Fraud      │ 3010 Strategy  │ 3011 Health      │ 3012 Twin     │
│ ─────────────   │ ─────────────│ ────────────     │ ────────────  │
│ 8 Rules,        │ Versions, A/B  │ Monitoring, DLQ  │ STUB (Ph2)    │
│ Flags           │ Testing        │                  │               │
├─────────────────────────────────────────────────────────────────────┤
│ 3013 Notification                                                  │
│ SMS, Push, Africa's Talking, Firebase                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SHARED RESOURCES                                                    │
│  PostgreSQL (5432)  │  TimescaleDB (5433)  │  Redis (6379)         │
│  Users, Loads, etc  │  Time-series data    │  Cache, Queues, OTP   │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Technology Stack

| Technology | Version | Purpose | Where |
|------------|---------|---------|-------|
| Node.js | 20 LTS | Runtime | All engines |
| TypeScript | 5.x | Language | All engines |
| Fastify | 4.29.x | HTTP framework | All engines |
| Prisma | 5.22.x | ORM | All engines |
| PostgreSQL | 16 | Primary database | Shared |
| TimescaleDB | 2.13 | Time-series | Port 5433 |
| Redis | 7 | Cache + queues | Port 6379 |
| BullMQ | 5.x | Job queues | Worker process |
| pnpm | 9.x | Package manager | Monorepo |

**Why Fastify over Express?**
- 20% faster in benchmarks
- Built-in validation with Typebox/Zod
- Better async/await handling
- Lower memory footprint

**Why TimescaleDB?**
- PostgreSQL-compatible but optimized for time-series
- Automatic partitioning
- Better compression for corridor snapshots
- 15-minute interval data

**Why BullMQ?**
- Redis-backed (no extra message broker needed)
- Priority queues
- Delayed jobs
- Built-in retry logic

## 2.3 Monorepo Structure

```
Backend/
├── apps/                          # 13 microservice engines
│   ├── engine-identity/           # Port 3001 - Auth, KYC, Trust
│   │   ├── src/
│   │   │   ├── index.ts          # Server bootstrap
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── identity.routes.ts
│   │   │   └── services/
│   │   │       ├── trust.service.ts
│   │   │       └── expiry.service.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── engine-optimizer/          # Port 3002 - WDM, Pricing
│   ├── engine-corridor/             # Port 3003 - Corridor intelligence
│   ├── engine-liquidity/            # Port 3004 - Escrow, COD
│   ├── engine-shock/                # Port 3005 - Shock absorption
│   ├── engine-incident/             # Port 3006 - Incidents
│   ├── engine-behavior/             # Port 3007 - Behavioral analytics
│   ├── engine-data/                 # Port 3008 - Data aggregation
│   ├── engine-fraud/                # Port 3009 - Fraud detection
│   ├── engine-strategy/             # Port 3010 - Strategy versions
│   ├── engine-health/               # Port 3011 - Health monitoring
│   ├── engine-twin/                 # Port 3012 - Digital Twin (STUB)
│   ├── notification-engine/         # Port 3013 - Notifications
│   └── workers/                     # Background job processors
│       └── src/
│           └── workers/
│               ├── trust.worker.ts
│               ├── escrow.worker.ts
│               ├── incident-escalation.worker.ts
│               ├── corridor-snapshot.worker.ts
│               ├── shock-monitor.worker.ts
│               └── notification.worker.ts
│
├── packages/                      # Shared libraries
│   ├── shared-types/              # TypeScript types, enums
│   ├── shared-db/                 # Prisma client + schema
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Database schema
│   │   └── src/
│   │       └── index.ts          # Export prisma client
│   ├── shared-queue/              # BullMQ helpers
│   │   └── src/
│   │       └── index.ts          # QUEUES constants
│   ├── shared-auth/               # JWT, OTP, Encryption
│   │   └── src/
│   │       ├── index.ts          # JWT functions
│   │       ├── otp.ts            # OTP generation
│   │       └── encrypt.ts        # PII encryption
│   └── shared-utils/              # Utilities
│       └── src/
│           ├── index.ts          # formatETB, toEthiopianDate
│           └── cache.ts          # Redis caching helpers
│
├── infra/                          # Infrastructure
│   ├── docker-compose.yml          # Dev environment
│   └── docker-compose.prod.yml     # Production
│
├── docs/                           # Documentation
│   ├── API_REFERENCE.md
│   └── ARCHITECTURE.md
│
├── memory-bank/                    # Project context
│   ├── FINAL_STATUS.md
│   ├── engineStatus.md
│   ├── progress.md
│   └── productContext.md
│
└── scripts/                        # Helper scripts
    ├── start-all.ps1
    ├── stop-all.ps1
    └── build-all.ps1
```

**apps/ vs packages/:**
- `apps/` = Runnable microservices (13 engines + workers)
- `packages/` = Shared libraries imported by apps

**Why two tsconfig strategies?**
- `tsx` for development: Uses tsconfig paths for module resolution
- `tsc` for building: Compiles to `dist/` then runs from there

## 2.4 Database Schema

### Key Models

**User** (Central identity)
- `id` (ULID), `phone` (unique), `fullName`, `role`
- `kycTier`, `status`, `preferredLanguage`
- One-to-one with FleetOwner, Driver, or Orderer

**FleetOwner**
- `trustScore`, `trustTier`, `creditLimitEtb`
- `payoutSpeed`, `regionAccess` (array of corridor IDs)
- `paymentReliabilityScore`, `totalTripsCompleted`

**Driver**  
- `licenseNumber`, `licenseExpiry`
- `onTimeRate`, `deviationRate`, `cancellationRate`
- `disputeCount30d/90d`, `incidentCount90d`

**Truck**
- `plateNumber` (unique), `capacityKg`, `capacityCbm`
- `insuranceExpiry`, `roadWorthinessExpiry`
- `fuelConsumptionLp100km`, `odometerKm`

**Load**
- `originCity`, `destinationCity`, `corridorId`
- `weightKg`, `cargoType`, `requiresReefer`
- `systemQuoteEtb`, `finalRateEtb`, `status`
- `paymentModel`: ESCROW | COD | ROLLING_CREDIT

**Assignment**
- `loadId`, `truckId`, `driverId`, `fleetOwnerId`
- `status`: SUGGESTED | PENDING | ACCEPTED | REJECTED | COMPLETED | CANCELLED
- `optimizationScore`, `attemptNumber`

**Trip**
- `assignmentId`, `status`, `scheduledPickup`
- `actualPickupAt`, `actualDeliveryAt`
- `deviationDetected`, `podS3Key`

**FinancialTransaction**
- `txType`: ESCROW_HOLD | ESCROW_RELEASE | COD_COLLECT | PAYOUT
- `amountEtb` (Decimal - NEVER float)
- `tripId`, `ordererId`, `fleetOwnerId`

**Event** (Audit log - Append only)
- `eventType`, `aggregateId`, `aggregateType`
- `actorId`, `actorRole`, `strategyVersionId`
- `payload` (JSON), `metadata` (JSON)

**StrategyVersion**
- `versionName`, `isActive`, `scope`
- `weightSet` (JSON), `thresholdSet` (JSON), `pricingParams` (JSON)
- `optimizationMode`: GROWTH | DENSITY | EFFICIENCY | SHOCK

**Incident**
- `tripId`, `incidentType`, `severity`
- `status`: OPEN | UNDER_INVESTIGATION | EVIDENCE_COLLECTION | AWAITING_RESOLUTION | ESCALATED | RESOLVED | CLOSED
- `penaltyEtb`, `compensationEtb`

**ShockEvent**
- `shockType`, `severity` (1-4)
- `affectedCorridors` (array)
- `startedAt`, `endedAt`, `isActive`

## 2.5 The 13 Engines — Complete Reference

### Engine 1: Identity (Port 3001)
**Purpose:** User registration, authentication, KYC, trust scoring

**Key Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/v1/auth/register | PUBLIC | Register with phone + OTP |
| POST | /api/v1/auth/verify-otp | PUBLIC | Verify SMS OTP |
| POST | /api/v1/auth/refresh | PUBLIC | Refresh access token |
| POST | /api/v1/auth/logout | AUTH | Invalidate token |
| GET | /api/v1/identity/me | AUTH | Get current user |
| POST | /api/v1/identity/drivers | AUTH | Create driver profile |
| GET | /api/v1/identity/drivers/:id | AUTH | Get driver details |
| POST | /api/v1/identity/trucks | AUTH | Register truck |
| GET | /api/v1/identity/trust/:type/:id | AUTH | Get trust score breakdown |

**Key Business Logic:**
- JWT with RS256 signing (RSA keys in `keys/`)
- OTP stored in Redis with 5 min TTL
- Trust decay formula: `Math.exp(-lambda * daysSince)`
- Tier 5 requires manual approval

### Engine 2: Optimizer (Port 3002)
**Purpose:** WDM matching, pricing, load/assignment management

**Key Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/v1/loads | ORDERER | Create new load |
| GET | /api/v1/loads/:id | AUTH | Get load details |
| POST | /api/v1/loads/:id/negotiate | ORDERER | Negotiate price |
| GET | /api/v1/assignments | AUTH | List assignments |
| POST | /api/v1/assignments/:id/accept | DRIVER | Accept assignment |
| POST | /api/v1/pricing/quote | AUTH | Get price quote |

**WDM Algorithm:**
```
Score = Σ(weight_i × normalized_factor_i)

Factors normalized 0-1:
- Distance (closer = better)
- Trust score (higher = better)
- On-time rate (higher = better)
- Corridor familiarity (more trips = better)
- Truck match (exact match = 1.0)

Weights come from active strategy version
```

### Engine 3: Corridor (Port 3003)
**Purpose:** Corridor health, density scoring, strategic detection

**Key Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /api/v1/corridor/corridors | AUTH | List all corridors |
| GET | /api/v1/corridor/corridors/:id | AUTH | Get corridor details |
| GET | /api/v1/corridor/density/:id | AUTH | Get density index |
| PUT | /api/v1/corridor/corridors/:id/freeze | OPS | Manual freeze |

**Density Index Calculation:**
```
LTR (Load-to-Truck Ratio) × 0.35
+ Fill Rate × 0.30
+ Payment Reliability × 0.20
+ Backhaul % × 0.15
= Density Index (0-100)
```

### Engine 4: Liquidity (Port 3004)
**Purpose:** Escrow management, COD, exposure caps

**Key Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/v1/liquidity/escrow/hold | AUTH | Hold escrow |
| POST | /api/v1/liquidity/escrow/release | OPS | Release escrow |
| GET | /api/v1/liquidity/exposure/:type/:id | AUTH | Check exposure |
| POST | /api/v1/finance/cod-collect | DRIVER | Record COD collection |
| POST | /api/v1/finance/cod-verify | OPS | Verify COD |

**Exposure Calculation:**
```
Exposure = Σ(open_escrow_amounts)
         + Σ(contingent_liabilities)
         - Σ(completed_pending_payouts)

Cap enforced per tier:
Tier 0: 0 ETB
Tier 1: 0 ETB
Tier 2: 25,000 ETB
Tier 3: 100,000 ETB
Tier 4: 250,000 ETB
Tier 5: 500,000 ETB
```

(Additional engines to be documented...)

## 2.6 The 6 BullMQ Workers

### TrustWorker
- **Queue:** `TRUST_SCORE_UPDATE`
- **Trigger:** Trip completion, incident resolution
- **Logic:** Compute decay-weighted trust score and tier

### EscrowWorker
- **Queue:** `ESCROW_RELEASE`
- **Trigger:** POD verification, incident resolution
- **Logic:** Process escrow release with financial transaction logging

### NotificationWorker
- **Queue:** `NOTIFICATION`
- **Trigger:** Assignment creation, payout initiation
- **Logic:** Route to SMS/Push/Email based on preferences

### IncidentEscalationWorker
- **Queue:** `INCIDENT_ESCALATION`
- **Trigger:** Timer-based (SLA breach detection)
- **Logic:** Auto-escalate incidents past SLA

### CorridorSnapshotWorker
- **Queue:** `CORRIDOR_SNAPSHOT`
- **Trigger:** Every 15 minutes
- **Logic:** Record corridor density to TimescaleDB

### ShockMonitorWorker
- **Queue:** `SHOCK_MONITOR`
- **Trigger:** Every 5 minutes
- **Logic:** Scan for shock conditions (fuel, incidents)

## 2.7 Shared Packages

### @ruit/shared-db
```typescript
// Exports:
export { prisma, db }          // PrismaClient singleton
export { generateId }          // ULID generator

// Usage:
import { db } from '@ruit/shared-db'
const user = await db.user.findUnique({ where: { id: userId } })
```

### @ruit/shared-auth
```typescript
// Exports:
export { signAccessToken }     // JWT signing
export { verifyAccessToken }   // JWT verification
export { generateOtp }         // 6-digit OTP
export { storeOtp, verifyOtp } // OTP with Redis
export { encryptPII }          // PII encryption
export { requireRole }         // RBAC middleware

// Usage:
const token = await signAccessToken(payload)
```

### @ruit/shared-queue
```typescript
// Exports:
export const QUEUES = { ... }  // All queue names
export { getQueue, addJob }    // Queue management
export { createWorker }        // Worker factory

// Usage:
import { QUEUES, addJob } from '@ruit/shared-queue'
await addJob(QUEUES.ESCROW_RELEASE, { tripId, amount })
```

### @ruit/shared-utils
```typescript
// Exports:
export { formatETB }           // "1000.00"
export { toEthiopianDate }     // { day, month, year, amharicDate }
export { normalizePhone }      // +251912345678
export { cached }              // Redis caching

// Usage:
import { cached } from '@ruit/shared-utils'
const strategy = await cached('cache:strategy:active:GLOBAL', 300, () => fetchStrategy())
```

## 2.8 Authentication & Authorization

### OTP Flow

```
1. POST /api/v1/auth/register
   { phone: "+251911234567", fullName: "Abebe", role: "FLEET_OWNER" }

2. System generates 6-digit OTP, stores in Redis (TTL: 300s)

3. SMS sent via Africa's Talking (or mocked in dev)

4. POST /api/v1/auth/verify-otp
   { phone: "+251911234567", otp: "123456" }

5. OTP verified in Redis, tokens issued:
   - Access token (JWT, 15 min expiry)
   - Refresh token (Redis, 30 days)

6. Subsequent requests: Authorization: Bearer {access_token}
```

**OTP Lockout:** After 3 failed attempts, phone locked for 1 hour.

### JWT Structure

```typescript
interface AccessTokenPayload {
  sub: string              // User ID
  role: Role               // FLEET_OWNER, DRIVER, etc.
  entity_id: string        // FleetOwner/Driver ID
  entity_type: string      // "FLEET_OWNER" | "DRIVER"
  trust_tier: number       // 0-5
  iat: number             // Issued at
  exp: number             // Expires
  jti: string             // Unique token ID (for revocation)
}
```

### 8 Roles

| Role | Code | Description |
|------|------|---------------|
| SUPER_ADMIN | super_admin | Full system access |
| OPS_ADMIN | ops_admin | Operations management |
| OPS_VIEWER | ops_viewer | Read-only ops |
| FINANCE_OPS | finance_ops | Financial reconciliation |
| FLEET_OWNER | fleet_owner | Fleet management |
| DRIVER | driver | Delivery operations |
| ORDERER | orderer | Load creation |

### RBAC Middleware

```typescript
// In route definition:
app.get('/admin-only', {
  preHandler: (app as any).requireRole([ROLES.SUPER_ADMIN])
}, handler)
```

## 2.9 Strategy Engine

### Creating a Strategy Version

```typescript
POST /api/v1/strategy/versions
{
  "version_name": "holiday_surge_2026",
  "optimizationMode": "DENSITY",
  "scope": "GLOBAL",
  "weightSet": {
    "trust": 0.35,
    "location": 0.25,
    "truck_match": 0.20,
    "history": 0.15,
    "price": 0.05
  },
  "thresholdSet": {
    "min_trust_for_tier2": 55,
    "max_negotiation_rounds": 3,
    "trust_decay": {
      "dispute_lambda": 0.023,
      "incident_lambda": 0.008
    }
  },
  "pricingParams": {
    "base_rate_per_km": 15.0,
    "cargo_multipliers": { "coffee": 1.5, "grain": 1.1 }
  },
  "acceptance_window_minutes": 15,
  "max_assignment_attempts": 5
}
```

**WeightSet Validation:** All weights must sum to 1.0 (±0.001).

### Activating a Version

```typescript
PUT /api/v1/strategy/versions/:id/activate
{ "scope": "GLOBAL" }

// Deactivates current active version in scope
// Activates new version
// Emits STRATEGY_VERSION_CHANGED event
// Invalidates Redis caches
```

---

# CHAPTER 3 — HOW TO RUN THIS SYSTEM

## 3.1 Prerequisites

| Software | Version | Verify |
|----------|---------|--------|
| Node.js | 20 LTS | `node --version` |
| pnpm | 9.x | `pnpm --version` |
| Docker Desktop | Latest | `docker --version` |
| Git | 2.x | `git --version` |

**Windows Users:** Use PowerShell (not CMD) for scripts.

## 3.2 First Time Setup

```powershell
# 1. Clone repository
git clone <repo-url>
cd Backend

# 2. Install dependencies
pnpm install

# 3. Environment setup
copy .env.example .env
# Edit .env with your settings

# 4. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 5. Database migrations
pnpm --filter @ruit/shared-db db:migrate

# 6. Seed database (if seed exists)
pnpm --filter @ruit/shared-db db:seed

# 7. Generate RSA keys for JWT
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 4096 });
const fs = require('fs');
fs.writeFileSync('./keys/private.pem', privateKey.export({ type: 'pkcs1', format: 'pem' }));
fs.writeFileSync('./keys/public.pem', publicKey.export({ type: 'pkcs1', format: 'pem' }));
console.log('Keys generated');
"

# 8. Build packages
pnpm -r build

# 9. Start all engines
.\scripts\start-all.ps1

# 10. Verify health
curl http://localhost:3001/api/v1/identity/health
curl http://localhost:3002/api/v1/optimizer/health
# ... check each port
```

## 3.3 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| DATABASE_URL | PostgreSQL connection | Yes |
| REDIS_URL | Redis connection | Yes |
| JWT_PRIVATE_KEY_PATH | RSA private key | Yes |
| JWT_PUBLIC_KEY_PATH | RSA public key | Yes |
| AFRICAS_TALKING_API_KEY | SMS provider | No (mock in dev) |
| FIREBASE_PROJECT_ID | Push notifications | No (mock in dev) |

Example `.env`:
```
DATABASE_URL=postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe
REDIS_URL=redis://localhost:6379
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
```

## 3.4 Daily Development Workflow

```powershell
# Start all engines
$env:DATABASE_URL="postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe"
.\scripts\start-all.ps1

# Run specific engine
cd apps\engine-identity
pnpm dev

# Check logs
Get-Content logs\engine-identity.log -Tail 50 -Wait

# Restart after code change
pnpm -r build
# Or just restart the affected engine
```

## 3.5 Running Tests

```powershell
# E2E tests (requires running engines)
cd tests\e2e
.\full-flow.ps1

# Verify results
cat e2e-results.txt
```

---

# CHAPTER 4 — HOW TO MAKE CHANGES

## 4.1 Adding a New API Endpoint

```typescript
// 1. In routes file
app.post('/new-endpoint', {
  preHandler: (app as any).requireRole([ROLES.DRIVER]),
  schema: { body: T.Object({ id: T.String() }) }
}, async (request, reply) => {
  // 2. Validate
  const { id } = request.body as { id: string }
  
  // 3. Query Prisma
  const data = await db.table.findUnique({ where: { id } })
  
  // 4. Emit event
  await emitEvent({ ... })
  
  // 5. Return
  return { success: true, data }
})
```

**Don't forget:**
- Add RBAC if needed
- Validate with Typebox/Zod
- Use Prisma camelCase (not snake_case in queries)
- Emit events for audit trail

## 4.2 Changing Strategy Parameters

No code needed! Create new strategy version:

```powershell
# SUPER_ADMIN only
curl -X POST http://localhost:3010/api/v1/strategy/versions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version_name": "new_pricing_v2",
    "optimizationMode": "DENSITY",
    "weightSet": { "trust": 0.40, "location": 0.30, ... },
    ...
  }'

# Activate

## 4.3 Adding a Database Table

1. Edit `packages/shared-db/prisma/schema.prisma`
2. Add model with @map for snake_case columns
3. Run `pnpm --filter @ruit/shared-db db:migrate`
4. Rebuild: `pnpm -r build`
5. Use in engines: `import { db } from '@ruit/shared-db'`

## 4.4 Adding a Worker

1. Add queue name to `packages/shared-queue/src/index.ts`
2. Create worker file in `apps/workers/src/workers/`
3. Register in `apps/workers/src/index.ts`
4. Enqueue from engine using `addJob(QUEUES.YOUR_QUEUE, data)`

## 4.5 Common Mistakes

| Mistake | Why Wrong | Correct |
|---------|-----------|---------|
| `prisma.loads` | Table is singular | `prisma.load` |
| `{ data: { updatedAt: new Date() } }` | Auto-managed | Don't set manually |
| `


| `{ data: { updatedAt: new Date() } }` | Auto-managed | Don't set manually |
| `prisma.load.find` | Use camelCase | `prisma.load.findUnique` |
| Missing `await` on Prisma queries | Returns promise | `await prisma.load.find...` |

## 4.6 Debugging Guide

### Get Exact Error from 500 Response

```powershell
# Engine logs show full stack trace
cat logs\engine-name.log

# Add explicit error logging
app.setErrorHandler((error, request, reply) => {
  console.error('FULL ERROR:', error)  // Add this line
  ...
})
```

### Check DATABASE_URL Loaded

```typescript
// In index.ts
console.log('DATABASE_URL:', process.env.DATABASE_URL?.slice(0, 30) + '...')
```

### Check Redis for OTP

```powershell
# Connect to Redis
redis-cli

# Check OTP exists
GET otp:+251911234567

# Check TTL
TTL otp:+251911234567
```

### Check Prisma Query Errors

```powershell
# Enable Prisma query logging
export DEBUG="prisma:*"

# Or set in code
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

### Test Endpoint Manually

```powershell
# GET request
curl http://localhost:3001/api/v1/identity/me `
  -H "Authorization: Bearer $TOKEN"

# POST with body
curl -X POST http://localhost:3001/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"phone":"+251911234567","fullName":"Test","role":"DRIVER"}'
```

---

# CHAPTER 5 — PRODUCTION DEPLOYMENT

## 5.1 What Changes for Production

### Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| DATABASE_URL | Local Postgres | RDS/Cloud SQL |
| REDIS_URL | Local Redis | Redis Enterprise |
| AFRICAS_TALKING_API_KEY | Stub/mock | Real API key |
| FIREBASE_PROJECT_ID | Stub | Real project |
| JWT_PRIVATE_KEY_PATH | ./keys/ | Secrets manager |

### Real SMS Provider (Africa's Talking)

```env
AFRICAS_TALKING_API_KEY=your_real_key
AFRICAS_TALKING_USERNAME=your_username
```

### Real Push Notifications (Firebase)

1. Create Firebase project
2. Download service account key
3. Set `FIREBASE_SERVICE_ACCOUNT` env var
4. Register device tokens in database

### RSA Key Generation for Production

```bash
# Generate production keys (4096 bit, RSA)
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -in private.pem -pubout -out public.pem
```

**Store securely:** Use AWS Secrets Manager, Azure Key Vault, or similar.

## 5.2 Using docker-compose.prod.yml

```powershell
# Build production images
docker compose -f infra/docker-compose.prod.yml build

# Start all services
docker compose -f infra/docker-compose.prod.yml up -d

# View logs
docker compose -f infra/docker-compose.prod.yml logs -f

# Check health
curl https://api.ruit-cbe.com/api/v1/health/ping
```

## 5.3 What is NOT Production Ready (Phase 2 Items)

| Component | Status | Phase 2 Work |
|-----------|--------|--------------|
| Digital Twin | STUB | Full simulation engine |
| Payment Gateway | Mock | Integrate real CBE API |
| SMS Provider | Mock | Africa's Talking integration |
| Push Notifications | Mock | Firebase integration |
| Kubernetes | N/A | Write K8s manifests |
| CDN/Assets | N/A | CloudFront/CloudFlare |
| Monitoring | Basic | Datadog/New Relic |
| Alerting | Basic | PagerDuty/Opsgenie |

---

# APPENDIX A — Complete Engine Port Reference

| Engine | Port | Base Path | Purpose |
|--------|------|-----------|---------|
| engine-identity | 3001 | /api/v1/identity | Auth, KYC, Trust |
| engine-optimizer | 3002 | /api/v1/optimizer | WDM, Pricing, Loads |
| engine-corridor | 3003 | /api/v1/corridor | Corridor health |
| engine-liquidity | 3004 | /api/v1/liquidity | Escrow, Exposure |
| engine-shock | 3005 | /api/v1/shock | Shock mode |
| engine-incident | 3006 | /api/v1/incident | Disputes |
| engine-behavior | 3007 | /api/v1/behavior | Analytics |
| engine-data | 3008 | /api/v1/data | Reports, Aggregations |
| engine-fraud | 3009 | /api/v1/fraud | Fraud detection |
| engine-strategy | 3010 | /api/v1/strategy | Strategy versions |
| engine-health | 3011 | /api/v1/health | Monitoring |
| engine-twin | 3012 | /api/v1/twin | Digital Twin (STUB) |
| notification-engine | 3013 | - | SMS, Push |

---

# APPENDIX B — Quick Reference Card

## Start Development
```powershell
# 1. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. Set DATABASE_URL
$env:DATABASE_URL="postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe"

# 3. Start all engines
.\scripts\start-all.ps1

# 4. Check health
foreach ($port in 3001..3013) {
  curl "http://localhost:$port/api/v1/identity/health" -ErrorAction SilentlyContinue
}
```

## Database Migration
```powershell
# Edit schema.prisma, then:
pnpm --filter @ruit/shared-db db:migrate --name migration_name
pnpm --filter @ruit/shared-db db:generate
pnpm -r build
```

## Test API
```powershell
# Auth flow
$resp = curl -X POST http://localhost:3001/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"phone":"+251911234567","fullName":"Test","role":"FLEET_OWNER"}' | ConvertFrom-Json

# OTP verification (use code from SMS mock)
$token = (curl -X POST http://localhost:3001/api/v1/auth/verify-otp `
  -H "Content-Type: application/json" `
  -d '{"phone":"+251911234567","otp":"123456"}' | ConvertFrom-Json).data.access_token

# Authenticated request
curl http://localhost:3001/api/v1/identity/me -H "Authorization: Bearer $token"
```

---

# APPENDIX C — Architecture Decisions

## Why RS256 instead of HS256?

**HS256 (HMAC):** Single shared secret
- Fast, simple
- Compromised secret = all tokens exposed

**RS256 (RSA):** Public/private key pair
- Public key can be distributed safely
- Private key never leaves identity engine
- Better for microservices

## Why BullMQ over RabbitMQ?

| Feature | BullMQ | RabbitMQ |
|---------|--------|----------|
| Setup | Redis already running | Separate broker |
| Persistence | Redis persistence | Dedicated persistence |
| Retry | Built-in | Plugin |
| Monitoring | Built-in dashboard | Separate UI |

## Why Typebox over Zod?

Both used in codebase (Typebox in auth, Zod in optimizer). Typebox:
- Works with Fastify type provider
- Generates JSON Schema automatically
- Better TypeScript inference

Zod used where simpler validation needed.

---

# APPENDIX D — Data Flow Diagrams

## Trust Score Update Flow

```
Trip Complete
    ↓
TripWorker creates TRUST_SCORE_UPDATE job
    ↓
TrustWorker processes:
1. Load events from prisma.event (last 90 days)
2. Calculate decay-weighted penalties
3. Compute score = 100 - Σ(penalties × weights)
4. Check tier advancement
5. Update driver/fleetOwner record
6. Emit TRUST_SCORE_UPDATED event
7. Invalidate Redis cache
```

## Escrow Release Flow

```
POD Confirmed
    ↓
OPS reviews (or auto-approve if Tier 4+)
    ↓
Liquidity Engine creates ESCROW_RELEASE job
    ↓
EscrowWorker processes:
1. Verify trip status = COMPLETED
2. Calculate final amount (minus penalties)
3. Update financial_transaction record
4. Move money from escrow to payable
5. Queue payout based on tier:
   - T0-T3: Scheduled job
   - T4: Immediate transfer initiated
   - T5: Pre-funded, no action needed
6. Emit PAYOUT_INITIATED event
```

## Incident Resolution Flow

```
Incident Opened
    ↓
Escrow frozen on affected trips
    ↓
Evidence collection phase (24h SLA)
    ↓
OPS review → Decision:
    - RESOLVED: Release escrow, apply penalties
    - ESCALATED: Management review
    - CLOSED: No fault found, full release
    ↓
Update incident.status
    ↓
Emit INCIDENT_RESOLVED event
    ↓
Trust Worker recalculates affected parties
```

---

# Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-05 | System | Initial comprehensive developer guide |

---

**End of Document**

*For questions or issues, refer to the GitHub repository or contact the development team.*
