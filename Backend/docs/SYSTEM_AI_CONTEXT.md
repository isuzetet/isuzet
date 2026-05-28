# ISUZET / RUIT CBE — Complete System Context for AI Assistant
> Give this entire document to any AI assistant to give it full working knowledge of this backend system.

---

## 1. WHAT IS THIS SYSTEM?

**ISUZET** (branded), powered by **RUIT CBE (Central Backend Engine)**, is the **operating system for Ethiopian inland medium-haul logistics**. It is a Logistics-as-a-Service (LaaS) microservices platform that digitizes freight matching, payment, compliance, and intelligence across Ethiopia's domestic truck transport corridors.

**Scope:** 100% domestic Ethiopian inland freight. Corridors span 100–800 km. No cross-border, no international, no air. Major corridors: Addis Ababa ↔ Hawassa, Jimma, Dire Dawa, Gondar, Mekelle, Gambela, Bahir Dar, Adama.

**The Problem Solved:**
- Before: informal brokers took 2–8% commission with no accountability
- Before: drivers wasted fuel searching for loads with no visibility
- Before: 40% of drivers only have feature phones (no smartphones)
- Before: payment disputes held cargo hostage, no escrow or enforcement
- After: direct matching, smart escrow, USSD for feature phones, trust-based algorithm

---

## 2. USER ROLES

| Role | Who They Are | Key Actions |
|------|-------------|-------------|
| `ORDERER` | Cargo owner, trader, FMCG company | Post loads, track shipments, pay via escrow |
| `DRIVER` | Individual truck operator | Accept loads, complete trips, receive payouts |
| `FLEET_OWNER` | Transport company (2–20 trucks) | Manage fleet, assign drivers, view earnings |
| `FLEET_MANAGER` | Staff of fleet owner | Operational fleet management |
| `AGENT` | Zone-based cash facilitator | Onboard farmers, collect cash, guarantee credit |
| `BROKER` | Load broker | Suggest loads, earn commission |
| `OPS_ADMIN` | Internal ISUZET operations | Resolve disputes, manage fraud flags, KYC review |
| `SUPER_ADMIN` | Full platform access | Strategy config, system override |

---

## 3. TECHNOLOGY STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | 5.9.3 (strict mode) |
| HTTP Framework | Fastify | 4.29.1 |
| ORM | Prisma | 5.14.0 |
| Database | PostgreSQL | 16 |
| Time-series DB | TimescaleDB | 2.13 (extension on PG) |
| Cache / Queue | Redis | 7 |
| Job Queue | BullMQ | 5.70.4 |
| Auth | Jose (RS256 JWT) | 5.2.0 |
| Validation | Zod | 3.22.0 |
| IDs | ULID | 2.4.0 |
| Monorepo | pnpm workspaces + Turborepo | pnpm 9, Turbo 2.8 |
| SMS (primary) | Africa's Talking API | — |
| SMS (fallback) | Twilio | — |
| Push notifications | Firebase Admin SDK | 13.7.0 |
| Messaging | Telegraf (Telegram) | — |
| Storage | MinIO (S3-compatible) | — |
| Containerization | Docker + Docker Compose | — |
| Monitoring | Prometheus + Grafana | — |
| Package Manager | pnpm | 9.0.0 |

**All money is stored as integer ETB cents** (1 ETB = 100 cents) to avoid floating-point errors.

---

## 4. MONOREPO STRUCTURE

```
Backend/
├── apps/
│   ├── engine-identity/        # Port 3001
│   ├── engine-optimizer/       # Port 3002
│   ├── engine-corridor/        # Port 3003
│   ├── engine-liquidity/       # Port 3004
│   ├── engine-shock/           # Port 3005
│   ├── engine-incident/        # Port 3006
│   ├── engine-behavior/        # Port 3007
│   ├── engine-data/            # Port 3008
│   ├── engine-fraud/           # Port 3009
│   ├── engine-strategy/        # Port 3010
│   ├── engine-health/          # Port 3011
│   ├── engine-twin/            # Port 3012 (Phase 2 stub)
│   ├── notification-engine/    # Port 3013
│   ├── engine-location/        # Port 3014
│   ├── engine-dispatch/        # Load posting & matching
│   └── workers/                # BullMQ background processors
│
├── packages/
│   ├── shared-db/              # Prisma client, schema, utilities
│   ├── shared-auth/            # JWT, OTP, RBAC middleware
│   ├── shared-types/           # All TypeScript types, enums, events
│   ├── shared-queue/           # BullMQ setup, queue definitions (59 queues)
│   └── shared-utils/           # Cache, ETB formatting, Ethiopian dates, IDs
│
├── infra/
│   ├── docker-compose.yml      # Dev: Postgres, Redis, MinIO
│   ├── docker-compose.prod.yml # Production setup
│   └── prometheus/             # Metrics config
│
└── docs/                       # Architecture docs, API references
```

---

## 5. ENGINE DETAILS (ALL 14 SERVICES)

### Engine 1: Identity (Port 3001)
**Purpose:** KYC, user registration, authentication, trust score display

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | None | Register user (DRIVER, FLEET_OWNER, ORDERER) |
| POST | /api/v1/auth/verify-otp | None | Verify OTP → receive JWT tokens |
| POST | /api/v1/auth/refresh | None | Refresh access token |
| POST | /api/v1/auth/logout | Bearer | Revoke tokens |
| GET | /api/v1/identity/me | Bearer | Get own profile |
| PUT | /api/v1/identity/me | Bearer | Update name, language |
| GET | /api/v1/identity/trust-breakdown | Bearer | Full trust score breakdown |
| POST | /api/v1/identity/kyc/upload | Bearer (KYC T0) | Upload KYC document |
| GET | /api/v1/identity/trucks | Bearer | List own trucks |
| POST | /api/v1/identity/trucks | Bearer (FLEET_OWNER) | Add truck to fleet |
| PUT | /api/v1/identity/trucks/:id | Bearer | Update truck details |
| DELETE | /api/v1/identity/trucks/:id | Bearer | Soft-delete truck |
| POST | /api/v1/identity/api-keys | Bearer (OPS_ADMIN) | Generate API key |
| POST | /api/v1/referral/generate | Bearer | Generate referral code |
| POST | /api/v1/referral/apply | Bearer | Apply referral code |
| POST | /api/v1/telegram-link/link | Bearer | Link Telegram account |

**Registration Flow:**
1. POST `/register` with phone, name, role → creates user + role entity → sends OTP via SMS
2. POST `/verify-otp` → returns `{ accessToken, refreshToken, user }` → user status becomes ACTIVE, kycTier = 1

**JWT Structure (RS256):**
```json
{
  "sub": "user_ulid",
  "role": "DRIVER",
  "entity_id": "driver_ulid",
  "entity_type": "Driver",
  "trust_tier": 2,
  "jti": "unique_token_id",
  "exp": 1234567890
}
```
- Access token: 15 minutes (JWT_ACCESS_EXPIRY_SECONDS=900)
- Refresh token: 30 days (JWT_REFRESH_EXPIRY_SECONDS=2592000), stored in Redis
- Token revocation: Redis blacklist via `jti`

---

### Engine 2: Optimizer (Port 3002)
**Purpose:** WDM (Weighted Decision Matrix) matching, dynamic pricing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/assignments/suggest | Bearer | Get ranked driver suggestions for a load |
| POST | /api/v1/pricing/calculate | Bearer | Calculate dynamic price |
| GET | /api/v1/optimizer/loads/:id | Bearer | Load with pricing breakdown |

**WDM Weights (sum = 1.0):**
- Proximity: 0.11
- Trust: 0.16
- On-Time Rate: 0.18
- Availability: 0.15
- Route Familiarity: 0.22
- Load Preference: 0.08
- Zone Match: 0.07
- Corridor Familiarity: 0.03
- Home Zone Return Bonus: +0.05 (additive)

**Pricing Formula:**
```
basePrice = distanceKm × 12.50 + weightQuentals × 850 (ETB)
adjustedPrice = basePrice × cargoClassMultiplier
if (rainySeason && corridorHasMultiplier): adjustedPrice *= rainySeasonMultiplier
commission = adjustedPrice × commissionRate
driverPayout = adjustedPrice - commission
```

---

### Engine 3: Corridor Intelligence (Port 3003)
**Purpose:** Corridor health scoring, rate benchmarking, road intelligence

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/corridor/health | Bearer | Get corridor health score |
| POST | /api/v1/corridor/freeze | Bearer (OPS_ADMIN) | Manually freeze a corridor |
| GET | /api/v1/rates/benchmark | Public | Rate benchmarking data |
| POST | /api/v1/rates/benchmark | Bearer | Submit rate data point |
| GET | /api/v1/public-calculator/estimate | Public | Get shipping estimate |
| POST | /api/v1/road-intelligence/alerts | Bearer | Submit road condition alert |
| GET | /api/v1/road-intelligence/alerts/:corridorId | Bearer | Get active alerts for corridor |

**Corridor Health Score (0–100):**
- Calculates from: incident rate, on-time rate, demand/supply ratio, recent snapshots
- Stored every 15 minutes in TimescaleDB (corridor_snapshots table)
- Health < 40 triggers corridor freeze consideration

---

### Engine 4: Liquidity (Port 3004)
**Purpose:** Escrow management, exposure caps, COD tracking, insurance, micro-credit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/liquidity/escrow/hold | Bearer | Hold funds in escrow for load |
| POST | /api/v1/liquidity/escrow/release | Bearer | Release escrow to payouts |
| GET | /api/v1/liquidity/exposure | Bearer | Check exposure cap status |
| POST | /api/v1/liquidity/cod | Bearer | Log COD collection |
| GET | /api/v1/liquidity/cod/:tripId | Bearer | Get COD status |
| POST | /api/v1/insurance/claim | Bearer | Submit insurance claim |
| GET | /api/v1/insurance/policy/:entityId | Bearer | Get insurance policy details |

**Payment Models:**
- `ESCROW`: Funds held until delivery confirmed
- `COD` (Cash on Delivery): Physical cash, logged and verified
- `ROLLING_CREDIT`: Credit line for trusted orderers
- `PARTIAL_ADVANCE`: 30% upfront, 70% on delivery

**Exposure Cap:** Maximum total at-risk credit exposure per corridor or orderer. Auto-pauses new loads when cap reached.

---

### Engine 5: Shock (Port 3005)
**Purpose:** Detects and manages economic/operational shock events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/shock/status | Bearer | Current shock mode status |
| POST | /api/v1/shock/activate | Bearer (OPS_ADMIN) | Manually activate shock mode |
| POST | /api/v1/shock/deactivate | Bearer (SUPER_ADMIN) | Deactivate shock mode |
| GET | /api/v1/shock/history | Bearer | Historical shock events |

**Shock Severity Levels:**
- Level 1 (MILD): +5% margin floor, monitoring enhanced
- Level 2 (MODERATE): +10% margin floor, some corridors restricted
- Level 3 (SEVERE): +20% margin floor, only essential cargo allowed
- Level 4 (CRITICAL): Platform emergency mode, OPS manual override required

**Triggers (automatic, from shock monitor worker):**
- Incident spike in 2-hour window
- Fuel price spike in 24-hour window
- Corridor freeze cascade

---

### Engine 6: Incident (Port 3006)
**Purpose:** Incident/dispute state machine, SLA enforcement, evidence management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/incidents | Bearer | Open new incident |
| GET | /api/v1/incidents/:id | Bearer | Get incident details |
| POST | /api/v1/incidents/:id/evidence | Bearer | Submit evidence (photo, docs) |
| POST | /api/v1/incidents/:id/resolve | Bearer (OPS_ADMIN) | Resolve incident |
| POST | /api/v1/incidents/:id/escalate | Bearer | Escalate incident |
| POST | /api/v1/detention | Bearer | Report detention/delay |
| POST | /api/v1/medical-sos | Bearer | Trigger medical SOS |
| POST | /api/v1/reroute | Bearer | Request reroute approval |
| POST | /api/v1/road-alert | Bearer | Submit road safety alert |

**Incident State Machine:**
`OPEN` → `UNDER_INVESTIGATION` → `EVIDENCE_COLLECTION` → `AWAITING_RESOLUTION` → `RESOLVED` | `ESCALATED` → `CLOSED`

**SLA Thresholds:**
- LOW severity: 5 business days to resolve
- MEDIUM severity: 3 business days
- HIGH severity: 1 business day
- CRITICAL: Same day resolution required

---

### Engine 7: Behavior (Port 3007)
**Purpose:** Anomaly detection, behavioral analytics, corridor statistics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/behavior/anomalies | Bearer (OPS_ADMIN) | List detected anomalies |
| GET | /api/v1/behavior/stats/:corridorId | Bearer | Corridor behavioral stats |
| POST | /api/v1/behavior/flag | Bearer (OPS_ADMIN) | Manually flag behavior |

---

### Engine 8: Data (Port 3008)
**Purpose:** Reporting, aggregation, OPS workqueue management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/data/platform-summary | Bearer (OPS_ADMIN) | Platform-wide KPIs |
| GET | /api/v1/data/corridor-analytics | Bearer | Corridor analytics |
| GET | /api/v1/data/driver-performance | Bearer | Driver performance report |
| GET | /api/v1/analytics/demand | Bearer (OPS_ADMIN) | Demand analytics |
| GET | /api/v1/data/ops-workqueue | Bearer (OPS_ADMIN) | Items needing OPS attention |

---

### Engine 9: Fraud (Port 3009)
**Purpose:** Rule-based fraud detection, shadow broker detection, collusion detection

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/fraud/flags | Bearer (OPS_ADMIN) | List fraud flags |
| POST | /api/v1/fraud/investigate/:id | Bearer (OPS_ADMIN) | Trigger investigation |
| GET | /api/v1/fraud/patterns | Bearer (OPS_ADMIN) | Detected fraud patterns |

**Shadow Broker Detection (3 conditions, ALL required):**
1. Driver has 3+ cancellations on same corridor within 21 days
2. Same orderer has NOT reposted load within 5 days of cancellations
3. Driver's GPS at destination within 12h of cancellation, no platform trip recorded
- Confidence: condition 1=30%, 1+2=60%, 1+2+3=90%. Threshold: 85%

---

### Engine 10: Strategy (Port 3010)
**Purpose:** Configuration management, strategy versioning, A/B testing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/strategy/versions | Bearer (OPS_ADMIN+) | List strategy versions |
| POST | /api/v1/strategy/versions | Bearer (SUPER_ADMIN) | Create new strategy version |
| PUT | /api/v1/strategy/versions/:id/activate | Bearer (SUPER_ADMIN) | Activate version |
| GET | /api/v1/strategy/versions/:id | Bearer | Get version details |
| GET | /api/v1/strategy/pricing-explanation/:corridorId | Bearer | Price breakdown |

**Strategy Version fields:** weightSet (WDM weights), pricingParams, commissionTiers, decayConfig, tierTripMinimums, backhaulConfidenceThresholds, abTestConfig, seasonalPricing

**Validation:** weightSet must sum to exactly 1.0 (tolerance ±0.001)

---

### Engine 11: Health (Port 3011)
**Purpose:** System-wide health monitoring, infrastructure checks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/health/status | Bearer | Aggregated system health |
| GET | /api/v1/health/engines | Bearer | Per-engine health status |
| GET | /api/v1/health/infrastructure | Bearer | DB, Redis, MinIO health |
| GET | /api/v1/health/ping | Public | Simple liveness probe |

---

### Engine 12: Digital Twin (Port 3012) — Phase 2 Stub
**Purpose:** Simulation and forecasting (not yet implemented)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/twin/simulate | Bearer (OPS_ADMIN) | Run simulation scenario |

---

### Engine 13: Notification (Port 3013)
**Purpose:** Multi-channel notification delivery (SMS, Push, Telegram, USSD, Email)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/notifications/send | Bearer | Send notification |
| GET | /api/v1/notifications/history/:userId | Bearer | Notification history |
| PUT | /api/v1/notifications/preferences | Bearer | Update notification preferences |
| POST | /api/v1/ussd | None (AT callback) | Africa's Talking USSD webhook |
| POST | /api/v1/sms-reply | None (AT callback) | Incoming SMS handler |
| POST | /internal/sms | Internal | Internal SMS delivery (from other engines) |
| POST | /internal/push | Internal | Internal push notification |

**SMS Routing:**
1. Try Africa's Talking API
2. If failure, wait 90 seconds, try Twilio
3. If both fail, log to dead letter queue

**USSD Menu (dial *862#):**
- 1. My Loads → SMS list of active loads
- 2. Report Location → zone code entry
- 3. Confirm Delivery → OTP entry
- 4. SOS → emergency alert
- 5. Fuel Report → station + price + availability

---

### Engine 14: Location (Port 3014)
**Purpose:** Real-time GPS tracking, SSE streaming, geofencing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/location/gps | Bearer | Submit GPS batch |
| GET | /api/v1/location/trip/:id | Bearer | Get trip location stream (SSE) |
| GET | /api/v1/location/driver/:id | Bearer | Driver's current location |
| POST | /api/v1/location/checkpoint | Bearer | Log checkpoint arrival |

---

### Engine: Dispatch (integrated routes)
**Purpose:** Load posting, assignment management, offer lifecycle, direct booking, backhaul, consolidation, route contracts

Key route groups: load lifecycle, assignments, offers, direct booking, backhaul, consolidated loads, broker suggestions, route contracts, load templates, weighbridge

---

## 6. BACKGROUND WORKERS (30 Total)

All workers use BullMQ on Redis. All run in the `apps/workers` process.

| Worker | Queue | Trigger | Purpose |
|--------|-------|---------|---------|
| Trust | TRUST_SCORE_UPDATE | Event | Decay-weighted trust recalculation |
| Escrow | ESCROW_RELEASE | Event | Financial transaction logging + payout |
| Notification | NOTIFICATION | Event | Route SMS/push/email to channels |
| Incident Escalation | INCIDENT_ESCALATION | Event | Enforce SLA deadlines |
| Corridor Snapshot | CORRIDOR_SNAPSHOT | Every 15 min | TimescaleDB snapshot, health score |
| Shock Monitor | SHOCK_MONITOR | Every 5 min | Spike detection, auto-activation |
| Document Expiry | DOCUMENT_EXPIRY_CHECK | Daily 6 AM EAT | License/insurance/inspection warnings |
| Rating Processor | RATING_PROCESSOR | Event | Trip rating aggregation |
| POD Generator | POD_GENERATOR | Event | Proof-of-delivery PDF generation |
| Webhook Delivery | WEBHOOK_DELIVERY | Event | Orderer webhook callbacks |
| Performance Snapshot | PERFORMANCE_SNAPSHOT | Monthly 3 AM | KPI snapshot storage |
| Backhaul | BACKHAUL_MATCHING | Scheduled | Backhaul opportunity matching |
| Weighbridge Intelligence | WEIGHBRIDGE_INTELLIGENCE | Event | Checkpoint data processing |
| Fuel Intelligence | FUEL_INTELLIGENCE | Event | Fuel price/shortage aggregation |
| Route Deviation | ROUTE_DEVIATION | Event | Detect & flag GPS deviations |
| Zone Demand | ZONE_DEMAND_UPDATE | Every 15 min | Zone-level demand calculation |
| Idle Alert | IDLE_ALERTS | Every 1 hour | Detect idle trucks |
| Broker Commission | BROKER_COMMISSION | Event | Commission calculation |
| Route Contract | CONTRACT_RENEWAL_REMINDER | Daily 1 AM | Contract renewal reminders |
| Direct Booking Expiry | DIRECT_BOOKING_EXPIRY | Scheduled | Expiry enforcement |
| Road Alert Expiry | ROAD_ALERT_EXPIRY | Scheduled | Alert expiration |
| Fuel Report Validation | FUEL_REPORT_VALIDATION | Event | Validate fuel reports |
| Maintenance Reminder | MAINTENANCE_REMINDER | Scheduled | Truck maintenance notifications |
| Warehouse Queue Expiry | WAREHOUSE_QUEUE_EXPIRY | Scheduled | Queue position expiry |
| Hours of Service | HOURS_OF_SERVICE | Every 30 min | HOS compliance (5 levels) |
| Shadow Broker | SHADOW_BROKER_DETECTION | Daily midnight | Suspicious broker detection |
| Micro-Credit Due | MICRO_CREDIT_DUE | Every 6 hours | Loan repayment tracking |
| Referral Bonus | REFERRAL_BONUS | Event | Referral reward processing |
| Duplicate Account | DUPLICATE_ACCOUNT_DETECTION | Daily 1 AM | Account duplication prevention |
| Notification Throttle | NOTIFICATION_THROTTLE | Every 1 hour | Spam prevention |
| Offer Expiry | OFFER_EXPIRY_CHECK | Every 2 min | Load offer expiration |

---

## 7. DATABASE SCHEMA (Major Tables)

**User & Identity:**
- `users` — phone, name, role, status, kycTier, trustTier
- `drivers` — licenseExpiry, homeZoneId, hoursOfService, trustScore
- `fleet_owners` — TIN, businessName, paymentReliabilityScore
- `orderers` — TIN, companyName, paymentReliabilityScore
- `kyc_documents` — type, status, uploadUrl, expiresAt

**Assets:**
- `trucks` — licensePlate, bodyType, capacityKg, status, fleetOwnerId
- `truck_availability_slots` — fleet scheduling

**Loads & Logistics:**
- `loads` — corridorId, cargoType, weightKg, paymentModel, status, escrowAmountCents
- `load_stops` — loadId, order, locationCode, address
- `load_templates` — recurring load configurations
- `assignments` — loadId, driverId, status, suggestedAt, expiresAt
- `load_offer_records` — offer history per driver

**Trips & Tracking:**
- `trips` — loadId, driverId, status, pickupAt, deliveredAt
- `trip_stops` — proof of stop completion
- `gps_traces` — lat, lng, speed, timestamp (TimescaleDB)
- `checkpoints` — police/border/inspection point encounters

**Financial:**
- `financial_transactions` — all money movements (ESCROW_HOLD, PAYMENT_RELEASED, etc.)
- `escrow_ledger_entries` — double-entry escrow ledger
- `exposure_caps` — per-corridor/orderer credit limits
- `commission_configs` — tiered commission rates
- `micro_loans` — working capital loans

**Incidents & Disputes:**
- `incidents` — severity, status, openedAt, resolvedAt
- `incident_evidence` — photo URLs, witness statements

**Corridor Intelligence:**
- `corridors` — origin, destination, distanceKm, isActive
- `corridor_snapshots` — TimescaleDB hypertable, health scores over time
- `zone_demands` — real-time demand levels per zone
- `road_alerts` — temporary road condition alerts

**Risk Management:**
- `shock_events` — activation/deactivation history
- `strategy_versions` — versioned configuration snapshots
- `fraud_flags` — detected fraud cases

**Advanced Features:**
- `cold_chain_readings` — temperature logs for refrigerated cargo
- `livestock_mortalities` — livestock trip incidents
- `maintenance_logs` — truck maintenance records
- `digital_vouchers` — reward vouchers
- `referral_codes` — referral program tracking
- `api_keys` — programmatic access tokens
- `events` — append-only audit log (all 135+ event types)

---

## 8. EVENT SYSTEM (135+ Event Types)

All events are written to the append-only `events` table. Events also trigger BullMQ jobs.

**Major event categories:**

```
USER: USER_REGISTERED, KYC_DOCUMENT_UPLOADED, KYC_APPROVED, KYC_REJECTED,
      TRUST_SCORE_UPDATED, TRUST_WARNING, TIER5_ELIGIBILITY_REACHED,
      INSURANCE_EXPIRY_WARNING, LICENSE_EXPIRY_WARNING

LOAD: LOAD_CREATED, QUOTE_GENERATED, QUOTE_ACCEPTED, QUOTE_REJECTED,
      NEGOTIATION_ROUND, LOAD_EXHAUSTED_ATTEMPTS, LOAD_CANCELLED,
      LOAD_STATUS_CHANGED

ASSIGNMENT: ASSIGNMENT_SUGGESTED, ASSIGNMENT_ACCEPTED, ASSIGNMENT_REJECTED,
            ASSIGNMENT_EXPIRED

TRIP: PICKUP_CONFIRMED, GPS_TRACE_BATCH, DEVIATION_DETECTED, IDLE_ALERT,
      DELIVERY_CONFIRMED, POD_UPLOADED, TRIP_ROAD_CONDITION_REPORTED

FINANCIAL: ESCROW_HELD, PAYMENT_RELEASED, PAYMENT_DELAYED,
           EXPOSURE_CAP_WARNING, EXPOSURE_CAP_BREACHED, COD_DISCREPANCY_REPORTED

INCIDENT: INCIDENT_OPENED, EVIDENCE_SUBMITTED, INCIDENT_RESOLVED, DISPUTE_ESCALATED

CORRIDOR: CORRIDOR_HEALTH_UPDATED, CORRIDOR_FROZEN, CORRIDOR_INSUFFICIENT_STATS_WARNING

SHOCK: SHOCK_MODE_ACTIVATED, SHOCK_MODE_DEACTIVATED, FUEL_QUEUE_MODE_ACTIVATED,
       STRATEGY_VERSION_CHANGED

FRAUD: FRAUD_FLAG_RAISED, COLLUSION_DETECTED

MEDIUM-HAUL: BACKHAUL_SUGGESTED, BACKHAUL_ACCEPTED, TRUCK_IDLE_ALERT,
             OVERLOAD_DETECTED, WEIGHBRIDGE_ENCOUNTERED, FUEL_PRICE_UPDATED,
             FUEL_SHORTAGE_REPORTED, ZONE_CONGESTION_DETECTED, CONSOLIDATION_CREATED,
             BROKER_SUGGESTION_CREATED, DRIVER_BONUS_EARNED, VOUCHER_ISSUED

CARGO-SPECIFIC (Phase 10): COLD_CHAIN_EXCURSION_ALERT, TEMPERATURE_LOGGED,
                            LIVESTOCK_MORTALITY_REPORTED, TIME_CRITICAL_LOAD_CREATED
```

---

## 9. TRUST SCORING SYSTEM

**Score Range: 0–100.** Updated after every trip completion or incident.

**Trust Tiers:**
- Tier 0: New user, phone verified only
- Tier 1: One KYC document uploaded (can use fleet tools, USSD)
- Tier 2: Full document verification (marketplace access, min 3 trips)
- Tier 3: Proven performer (10+ trips, score ≥70)
- Tier 4: Trusted partner (25+ trips, score ≥80)
- Tier 5: Elite (100+ trips, score ≥90, manual OPS gate)

**Driver Trust Weights:**
- On-time rate: 0.28
- Dispute-free rate: 0.18
- Route deviation: 0.20
- Cancellation rate: 0.14
- Incident history: 0.10
- Anomaly score: 0.05
- COD discrepancy: 0.05

**Fleet Owner Trust Weights:**
- On-time rate: 0.25
- Dispute-free: 0.20
- Deviation: 0.10
- Cancellation: 0.20
- Payment reliability: 0.20
- Incident history: 0.05

**Decay Model:** Recent incidents have higher penalty weight. Uses exponential decay: `penalty × exp(-λ × daysSince)`.

**Tier Milestones (bonuses):**
- Tier 3 reached: 500 ETB voucher
- Tier 4 reached: 1,000 ETB voucher
- Tier 5 reached: 2,000 ETB + physical kit (helmets, vest)

---

## 10. KYC SYSTEM

**Tiers:**
- `kycTier: 0` — Phone + name registered, OTP not yet verified
- `kycTier: 1` — OTP verified, one document uploaded (basic access)
- `kycTier: 2` — Document approved by OPS (full marketplace access)

**Documents:**
- NATIONAL_ID, KEBELE_ID, PASSPORT (identity)
- DRIVER_LICENSE (drivers)
- VEHICLE_LOG_BOOK, INSURANCE, INSPECTION (trucks)
- TRADE_LICENSE, TIN_CERT (businesses)
- BANK_STATEMENT (credit/financial)

---

## 11. CARGO TYPES & SPECIAL HANDLING

**Standard Cargo (1.0x–1.1x multiplier):**
- BAGGED_GRAIN (1.0x), BEVERAGES (1.1x), COFFEE (1.1x), COTTON_SESAME (1.0x), CEMENT (1.1x), HONEY (1.15x), FMCG (1.0x), CONSTRUCTION (1.0x), AGRICULTURE (1.0x)

**Special Cargo (higher multipliers, special rules):**
- FRESH_PRODUCE (1.15x): Max 8h transit, temp 2–8°C, cold-chain required
- LIVESTOCK (1.35x): Per-head payment, vet certificate, no trips 11am–3pm May–Sep
- KHAT (1.40x): TIME-CRITICAL, 6h max transit, 5-min acceptance window
- FRESH_FISH (1.40x): TIME-CRITICAL, 8h max, cold-chain 0–4°C
- CUT_FLOWERS (1.50x): TIME-CRITICAL, 6h max, temp 4–8°C, humidity controlled
- FROZEN_MEAT (1.35x): Cold-chain required
- DAIRY (1.25x): Cold-chain
- HAZMAT (1.40x): Dangerous goods permit required

---

## 12. FINANCIAL MODEL

**Payment Rails:**
- `TELEBIRR` — Ethio Telecom mobile money (primary)
- `CBE` — Commercial Bank of Ethiopia transfer
- `CHAPA` — Payment gateway (card/bank)
- `BANK_TRANSFER` — Manual bank transfer
- `CASH_AGENT` — Physical cash via community agent
- `STUB` — Development/testing stub

**Commission Tiers (configurable in strategy):**
- Load value < ETB 2,000: 15%
- ETB 2,000–5,000: 12%
- ETB 5,000–10,000: 10%
- > ETB 10,000: 8%

**Settlement Cycle:** 7 days, via mobile money

---

## 13. AUTHENTICATION & AUTHORIZATION

**Authentication Flow:**
1. `POST /api/v1/auth/register` → OTP sent to phone
2. `POST /api/v1/auth/verify-otp` → returns `{ accessToken, refreshToken }`
3. Include `Authorization: Bearer <accessToken>` in all subsequent requests
4. When access token expires, call `POST /api/v1/auth/refresh` with `{ refreshToken }`
5. On logout, `POST /api/v1/auth/logout` → both tokens revoked in Redis

**RBAC Roles (hierarchy):**
`SUPER_ADMIN` > `OPS_ADMIN` > `OPS_VIEWER` > `FLEET_OWNER` > `FLEET_MANAGER` > `AGENT` > `BROKER` > `ORDERER` = `DRIVER`

**OTP:**
- 6-digit code, TTL: 300 seconds (OTP_TTL_SECONDS)
- Max attempts: 3 (OTP_MAX_ATTEMPTS)
- Lockout: 30 minutes after 3 failed attempts
- Delivery: SMS via Africa's Talking (Twilio fallback)

---

## 14. SEASONAL & ETHIOPIAN CALENDAR INTELLIGENCE

**Rainy Season:** June 1 – September 30
- Corridor-specific multipliers: 8–25% premium
- Transit time estimates +20–30%
- High-risk corridors: Addis↔Jimma (1.20x), Addis↔Gambela (1.18x), Addis↔Bahir Dar (1.15x)

**Ethiopian Calendar:**
- 13 months (12 months of 30 days + Pagumē of 5–6 days)
- ~7–8 years behind Gregorian calendar
- System stores dates in Gregorian, converts to Ethiopian for display
- All APIs accept Gregorian, return both Gregorian + Ethiopian format

**Market Days (demand surge events):**
- Addis Ababa Merkato (Sunday): +25% demand
- Jimma Cattle Market (Wednesday): +40%
- Hawassa Grain Terminal (Tuesday): +30%
- Gondar Coffee Auction (Friday): +35%
- Gambela Sesame Hub (Monday): +45%

---

## 15. HOURS OF SERVICE (HOS) COMPLIANCE

**5-Level Graduated Response:**
| Active Hours | Action |
|---|---|
| 0–8h | No restriction |
| 8h+ | Advisory notification |
| 10h+ | Soft block (driver must acknowledge) |
| 12h+ | Strong advisory (requires voice note) |
| 14h+ | Hard block — cannot accept new loads |

**Rest:** 6+ continuous stationary hours, 9pm–5am = full reset

---

## 16. ENVIRONMENT VARIABLES

```bash
# Core
NODE_ENV=development
DATABASE_URL=postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe
TIMESCALE_URL=postgresql://ruit:ruit_dev_password@localhost:5433/ruit_ts
REDIS_URL=redis://localhost:6379

# JWT (RS256 — needs private.pem and public.pem key files)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_SECRET=change-this-to-secure-string
JWT_ACCESS_EXPIRY_SECONDS=900
JWT_REFRESH_EXPIRY_SECONDS=2592000

# OTP
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3

# Engine Ports
PORT_IDENTITY=3001
PORT_OPTIMIZER=3002
PORT_CORRIDOR=3003
PORT_LIQUIDITY=3004
PORT_SHOCK=3005
PORT_INCIDENT=3006
PORT_BEHAVIOR=3007
PORT_DATA=3008
PORT_FRAUD=3009
PORT_STRATEGY=3010
PORT_HEALTH=3011
PORT_TWIN=3012
PORT_NOTIFICATIONS=3013

# Storage (MinIO / S3)
AWS_S3_BUCKET=ruit-cbe-storage
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=ruit-evidence

# SMS
AT_API_KEY=                     # Africa's Talking (primary)
AT_USERNAME=sandbox
AFRICAS_TALKING_SENDER_ID=RUIT
TWILIO_ACCOUNT_SID=             # Twilio (fallback)
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Push Notifications (Firebase)
FIREBASE_PROJECT_ID=ruit-driver
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Telegram Bot
TELEGRAM_BOT_TOKEN=

# Email
RESEND_API_KEY=

# Feature Flags
SHOCK_MODE_ENABLED=true
FUEL_QUEUE_MODE_ENABLED=true
USSD_ENABLED=true
MULTI_STOP_LOADS_ENABLED=false
AI_PREDICTIONS_ENABLED=false

# Business Config
DEFAULT_ACCEPTANCE_WINDOW_MINUTES=15
MAX_ASSIGNMENT_ATTEMPTS=5
GPS_BATCH_MAX_POINTS=500

# Internal Service URLs
NOTIFICATION_ENGINE_URL=http://localhost:3013
IDENTITY_ENGINE_URL=http://localhost:3001
STRATEGY_ENGINE_URL=http://localhost:3010

# Monitoring
HEALTH_CHECK_INTERVAL_MS=30000
```

---

## 17. DEPLOYMENT & INFRASTRUCTURE

**Docker Compose (dev):** PostgreSQL 16, TimescaleDB, Redis 7, MinIO
**Ports summary:**
- 3001–3014: Engine HTTP services
- 5432: PostgreSQL
- 5433: TimescaleDB
- 6379: Redis
- 9000: MinIO API
- 9001: MinIO Console

**Build commands:**
```bash
pnpm install          # Install all dependencies
pnpm build            # Build all 18 packages (Turborepo)
pnpm db:generate      # Regenerate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed initial data
docker-compose -f infra/docker-compose.yml up -d  # Start infrastructure
```

**Start each engine individually:**
```bash
npx tsx apps/engine-identity/src/index.ts
npx tsx apps/engine-optimizer/src/index.ts
# ... etc
npx tsx apps/workers/src/index.ts   # Start all 30 workers
```

---

## 18. LOAD LIFECYCLE (7 Steps)

1. **POST** — Orderer posts load (corridor, cargo type, weight, pickup window, escrow) → status: DRAFT → OPEN
2. **MATCH** — WDM algorithm ranks eligible drivers → status: OPEN → MATCHED
3. **ACCEPTANCE** — Driver accepts within 20 min window (5 min for time-critical) → status: MATCHED → ACCEPTED, escrow locked
4. **PICKUP** — GPS confirms arrival, driver confirms cargo condition → status: ACCEPTED → IN_TRANSIT
5. **EN-ROUTE** — GPS ping every 10 min, deviations detected (>2km off-route)
6. **DELIVERY** — GPS + OTP confirmation at each stop → escrow released proportionally
7. **PAYMENT** — 7-day settlement cycle, Telebirr/CBE/agent payout

**Multi-stop escrow:** 70% at first stop, 20% at second, 10% at third (configurable)

---

## 19. PII SECURITY

- Phone numbers, names, ID numbers encrypted with AES-256-GCM before database storage
- Format: `base64(iv:authTag:ciphertext)`
- Encryption key: env-based or derived via scrypt
- hashPhone(): SHA-256 normalized phone hash (for lookups without decrypting)
- decryptIfEncrypted(): Safe decryption with legacy plaintext fallback

---

## 20. API RESPONSE PATTERNS

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "ERROR_CODE", "message": "Human readable message" }
```

**Common error codes:** `OTP_EXPIRED`, `OTP_INVALID`, `OTP_LOCKOUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`

---

## 21. NOTIFICATION CHANNELS

1. **SMS** (Africa's Talking → Twilio fallback): All users, especially feature-phone drivers
2. **Push notifications** (Firebase FCM): Smartphone app users
3. **Telegram bot**: Operations team, high-priority alerts
4. **USSD** (*862#): Feature phone drivers — load info, delivery confirmation, SOS
5. **Email** (Resend): Orderers — receipts, compliance certificates, monthly reports
6. **In-app**: WebSocket/SSE for real-time location and status updates

**Notification preference respects:** user-set channel preferences, do-not-disturb, language (Amharic/English)

---

## 22. SHARED PACKAGES

| Package | Import | Purpose |
|---------|--------|---------|
| `@ruit/shared-db` | `import { prisma } from '@ruit/shared-db'` | Prisma client singleton |
| `@ruit/shared-auth` | `import { requireAuth, requireRole } from '@ruit/shared-auth'` | JWT/OTP/RBAC |
| `@ruit/shared-types` | `import { EVENT_TYPES, ROLES, CARGO_TYPE } from '@ruit/shared-types'` | All TypeScript types |
| `@ruit/shared-queue` | `import { addJob, QUEUES } from '@ruit/shared-queue'` | BullMQ queue helpers |
| `@ruit/shared-utils` | `import { formatEtb, generateId, cached } from '@ruit/shared-utils'` | Utilities |
