# ISUZET — System Overview

## Platform Identity

ISUZET is the **operating system for Ethiopian inland medium-haul logistics**.

It connects:
- **Orderers** (cargo owners, traders, FMCG companies) → need reliable freight
- **Drivers** (individual truckers, often on feature phones, 40-60% smartphone penetration)
- **Fleet Owners** (small-to-medium transport companies, 2-20 truck operations)
- **Community Agents** (zone-based cash facilitators and client acquisition partners)
- **Transport Cooperatives** (dispatcher-led groups with shared accountability)

**Scope:** Domestic Ethiopian inland medium-haul only. All cargo stays within Ethiopia. Corridors range 100-800km (Addis to zones like Hawassa, Jimma, Gambela, Mekelle, Gondar).

This is **NOT** an international logistics platform, cross-border system, or air-cargo interface.

---

## Problem ISUZET Solves

### Before ISUZET
1. **Cargo owners** relied on informal brokers → 2-8% commission loss, poor accountability
2. **Drivers** had no load visibility, wasted fuel searching for cargo
3. **Payment disputes** common → cargo held hostage, court delays
4. **No route history** → new drivers had no competitive advantage
5. **Trust opaque** → cargo owners paid premium for known drivers, new drivers starved
6. **Seasonal blindness** → no demand prediction for rainy season, market days
7. **Rural exclusion** → no phone access for 40% of drivers
8. **Finance dead** → small traders couldn't access credit or insurance

### After ISUZET
1. **Direct matching** → drivers and orderers connect, zero brokers, 5-12% shipping savings
2. **Transparent WDM algorithm** → trust + location + availability scores drivers fairly
3. **Smart escrow** → payment held until delivery confirmed, disputes rare
4. **Route intelligence** → every trip adds data; algorithm learns preferences
5. **Fair trust model** → new drivers can compete on metrics (on-time, damage-free), not network
6. **Seasonal pricing** → rainy season premiums reflect actual risk
7. **USSD + SMS** → feature phones work (40% of drivers), no smartphone required
8. **Micro-credit** → small traders get working capital, agent-guaranteed, 7-day terms

---

## Architecture at Scale

### 15 Purpose-Built Engines (Microservices)

Each engine is a Fastify 4.x service on a dedicated port (3001-3015).

| Port | Engine | Purpose |
|------|--------|---------|
| 3001 | dispatch | Load posting, matching, WDM algorithm |
| 3002 | identity | User registration, KYC, phone verification |
| 3003 | liquidity | Cash flows, escrow settlement, payouts |
| 3004 | optimizer | Price calculation, route optimization |
| 3005 | location | Real-time GPS, SSE tracking, geofencing |
| 3006 | incident | Emergencies, road alerts, detention escalation |
| 3007 | corridor | Route master data, market days, seasonal data |
| 3008 | behavior | Trust scoring, rating system, reputation |
| 3009 | strategy | Configuration management, business rules |
| 3010 | shock | Price surge detection, fraud patterns |
| 3011 | twin | Digital twin for analytics, forecasting |
| 3012 | health | System health checks, monitoring |
| 3013 | fraud | Duplicate accounts, shadow brokers, cheating detection |
| 3014 | data | Data warehouse integration, reporting |
| 3015 | agenda | Scheduled tasks (future reserved) |
| — | notification-engine | SMS/Push notifications (async bus) |
| — | workers | BullMQ background jobs (async processing) |

### Shared Libraries (Private npm)

| Package | Purpose |
|---------|---------|
| `@ruit/shared-db` | Prisma ORM, database client, seed data |
| `@ruit/shared-types` | TypeScript types, enums, constants (source of truth for units) |
| `@ruit/shared-utils` | Validators, formatters, helpers |
| `@ruit/shared-auth` | JWT + HMAC (signed operations) |
| `@ruit/shared-queue` | BullMQ configuration, queue names |

### Database

**PostgreSQL 16 + TimescaleDB** (time-series for GPS, fuel prices, demand forecasts)

Schema includes:
- **User** models (drivers, orderers, fleet, agents, admins)
- **Logistics** models (Load, Trip, Stop, Checkpoint)
- **Financial** models (EscrowLedgerEntry, MicroCreditLoan, Commission, AgentWallet)
- **Geographic** models (Zone, Corridor, MarketDay, CheckpointIntelligence)
- **Behavioral** models (Event, Incident, RoadAlert, TrustScore)
- **Configuration** models (StrategyConfig versioning)

### Message Queue

**Redis 7 + BullMQ**

Queues:
- `ESCROW_SETTLEMENT`: Financial ledger processing
- `MICRO_CREDIT_DUE`: Loan reminders and defaults
- `ROAD_ALERT_CLEANUP`: Route alert expiry
- `AGENT_CASH_SETTLEMENT`: 2-hour agent escrow settlement
- `SHADOW_BROKER_SCAN`: Daily fraud pattern detection
- `REFERRAL_BONUS`: Trigger verification for bonus payments
- `HOS_PERIODIC_CHECK`: Hours of service monitoring
- `SMS_QUEUE`: Bulk SMS delivery (Africa's Talking)

### External Integrations

| Service | Purpose | Provider |
|---------|---------|----------|
| SMS/USSD | Notifications + USSD menus | Africa's Talking API |
| Mobile Money | Payment settlement | Telebirr, CBE, Ethio Telecom (stubs only) |
| File Storage | Photos, certificates, documents | MinIO (S3-compatible) |
| Logging | Structured logs | (Configurable backend) |

---

## User Roles & Capabilities

### ORDERER (Cargo Owner)
- **Page 1:** Post loads → select corridors, cargo type, weight, pickup date
- **Page 2:** See matched drivers (WDM ranked), accept, track in real-time
- **Page 3:** Rate driver, report incidents, receive cold-chain certificate
- **Earnings:** Savings vs informal brokers (5-12% cheaper)
- **Trust Score:** Built from payment consistency, cargo readiness

### DRIVER (Operator)
- **Signup:** Phone + ID verification → trust score of 30 (cold start)
- **App/USSD:** View available loads, accept within 20-min window
- **Trip:** GPS tracking confirms location, deliver to stops, collect signature/OTP
- **Earnings:** Per-km + cargo class bonus, 7-day settlement via mobile money
- **Trust Score:** On-time %, damage-free %, cancellation rate

### FLEET OWNER (Small Transport Company)
- **Signup:** Register 1-100 trucks, verify ownership
- **Dashboard:** Assign loads to drivers, track fleet utilization, view earnings
- **Earnings:** Commission on driver payouts (configured per fleet)
- **Cooperative Option:** Join or create dispatcher-led group

### COMMUNITY AGENT (Zone-Based)
- **Signup:** Zone assignment, phone verified, no smartphone required for basic ops
- **Client Onboarding:** Register up to 50 farmers/traders (phone + name only)
- **Load Creation:** Create on behalf of clients, fund from wallet
- **Earnings:** 80% of per-kg commission (platform takes 20%)
- **Credit:** Guarantee up to 5 borrowers at a time, penalty if default > 20%

### TRANSPORT COOPERATIVE DISPATCHER
- **Role:** Manages 5-50 member fleets
- **Authority:** Accept loads on behalf of members, assign to specific drivers
- **Earnings:** Members take full payout, cooperative takes small coordination fee
- **Accountability:** 40% of member penalties apply to cooperative entity

### ADMIN
- **OPS Control:** Flag fraud, resolve disputes, approve detention claims
- **Finance:** View all payouts, handle failed settlements, approve chargebacks
- **Configuration:** Adjust weights, pricing tiers, seasonal multipliers (via UI or DB)
- **Analytics:** Dashboard of platform KPIs

---

## Load Lifecycle (7 Steps)

### Step 1: POST
**Orderer posts load**
- Corridor (origin → destination zone)
- Cargo type (grains, livestock, perishables, khat, etc.)
- Weight (kg) + dimensions
- Pickup date/time window
- Escrow amount (platform calculates based on pricing formula)
- Special instructions (cold chain, fragile, livestock permits, etc.)

**State:** DRAFT → OPEN

### Step 2: MATCH
**WDM algorithm ranks eligible drivers**
- Proximity (11%): nearest available drivers
- Trust (16%): proven on-time, damage-free track record
- On-Time Rate (18%): historical delivery punctuality
- Availability (15%): current capacity and schedule
- Route Familiarity (22%): previous trips on this corridor
- Load Preference (8%): driver's preferred cargo types
- Zone Match (7%): driver's home zone overlap
- Corridor Familiarity (3%): driver frequency on this specific corridor
- Bonus (5% additive): driver returning to home zone

**State:** OPEN → MATCHED (driver selected by algorithm)

### Step 3: ACCEPTANCE
**Driver accepts or declines within 20 minutes**
- Reject: load re-enters queue, next driver ranked
- Accept: load transitions to ACCEPTED, escrow locked

**State:** MATCHED → ACCEPTED

### Step 4: PICKUP
**Driver arrives at pickup location**
- GPS confirms arrival
- Orderer provides cargo at checkpoint
- Driver confirms cargo condition (photos)
- Departure recorded

**State:** ACCEPTED → IN_TRANSIT

### Step 5: EN-ROUTE
**Real-time tracking with SSE updates**
- GPS ping every 10 minutes
- Deviations detected (>2km off-route) → driver prompted: legitimate obstacle?
- Checkpoint delays logged (police check, fuel stop, etc.)
- Temperature monitoring (cold-chain cargo)

**State:** IN_TRANSIT (continuous)

### Step 6: DELIVERY
**Driver arrives at stop**
- GPS + timestamp proof
- OTP sent to recipient (mobile) or agent (USSD/SMS for feature phone)
- Recipient or agent confirms OTP + signs physically or digitally
- Cargo photo taken
- Escrow marked for release

**Special case:** Multi-stop load → escrow released proportionally at each stop (70% at first, 20% at second, 10% at third, etc.)

**State:** IN_TRANSIT → STOPPING (each stop), final stop → COMPLETED

### Step 7: PAYMENT
**Escrow released to driver, settlement to platform + agent**
- Driver payout: freight cost minus platform commission (12-20% tiered)
- Platform revenue: commission + platform premium (insurance, fraud, admin)
- Agent commission (if applicable): 20% to agent, 80% to platform
- Settlement: 7-day cycle, mobile money (Telebirr, CBE, Ethio Telecom)

**State:** COMPLETED → SETTLED

---

## Financial Model

### Money Unit: ETB Cents (Integers)

All money stored as **cents** (1 ETB = 100 cents) to avoid floating-point errors.

Example: ETB 4,500 = 450,000 cents in database.

### Pricing Formula

```
basePrice = distanceKm × 12.50 ETB/km + weightQuentals × 850 ETB/quintal

cargoClassMultiplier = config.cargoClassMultipliers[cargoType] (1.0 - 1.5)
adjustedPrice = basePrice × cargoClassMultiplier

if (isRainySeason && corridorHasSeasonalMultiplier):
  adjustedPrice *= config.rainySeasonCorridorMultipliers[corridorId]

platformCommissionRate = config.commissionTiers.find(tier)
platformCommission = adjustedPrice × platformCommissionRate
driverPayout = adjustedPrice - platformCommission
```

### Escrow Ledger

Every money movement creates an `EscrowLedgerEntry`:

| Entry Type | From | To | Amount | Status |
|-----------|------|----|---------|---------| 
| LOAD_ESCROW | Orderer | Platform | Freight | PENDING |
| DRIVER_PAYOUT | Platform | Driver | Freight - Commission | COMPLETED |
| PLATFORM_COMMISSION | Freight Transaction | Platform | Commission | COMPLETED |
| AGENT_COMMISSION | Freight Transaction | Agent | Agent's Cut | (depends) |
| MICRO_CREDIT_ADVANCE | Platform | Borrower | Loan Amount | PENDING |
| MICRO_CREDIT_REPAY | Borrower | Platform | Repayment | COMPLETED |
| NO_SHOW_PENALTY | Driver | Platform | Cancellation Fee | COMPLETED |
| INSURANCE_PREMIUM | Orderer | Insurance | Premium | COMPLETED |

All financial operations are **wrapped in `prisma.$transaction()`** for atomicity.

### Commission Tiers (Example)

| Load Value | Commission Rate |
|-----------|-----------------|
| < ETB 2,000 | 15% |
| ETB 2,000 - 5,000 | 12% |
| ETB 5,000 - 10,000 | 10% |
| > ETB 10,000 | 8% |

---

## Trust Scoring System

### Score Range: 0-100

Tiers:
- **90-100:** Platinum (top 5% drivers, can access premium loads)
- **75-89:** Gold (standard users, full access)
- **50-74:** Silver (limited load access, higher scrutiny)
- **25-49:** Bronze (watchlist, restricted features)
- **0-24:** Red (restricted, may require OPS approval)

### Trust Inputs

**For Drivers:**
- On-time delivery rate (18% weight)
- Cargo damage rate (12%)
- Cancellation rate (15%)
- Load acceptance rate (10%)
- Orderer ratings (20%)
- Incident history (15%)
- Age on platform (10%)

**For Orderers:**
- Payment timeliness (30%)
- Cargo readiness (25%)
- Dispute initiation rate (15%)
- Load accuracy (15%)
- Orderer ratings (15%)

**For Fleet Owners:**
- Average driver trust (50%)
- Driver compliance (50%)

### Trust Penalties

| Incident | Penalty | Duration |
|----------|----------|----------|
| Late delivery (1h grace) | -2 | 30 days |
| Cargo damage | -5 | 60 days |
| Cancellation (driver) | -8 | 45 days |
| No-show (driver) | -10 | 60 days |
| Payment default (orderer) | -5 | 90 days |
| Road accident | -15 | 90 days |

---

## Weighted Decision Model (WDM) Algorithm

The engine that ranks drivers for each load.

### Weights Sum to Exactly 1.0
- Proximity: 0.11 (nearest available driver)
- Trust: 0.16 (proven on-time, damage-free track record)
- On-Time Rate: 0.18 (historical punctuality)
- Availability: 0.15 (current schedule capacity)
- Route Familiarity: 0.22 (previous trips on corridor)
- Load Preference: 0.08 (driver's preferred cargo types)
- Zone Match: 0.07 (home zone overlap)
- Corridor Familiarity: 0.03 (prior trips on exact corridor)

**Additive Bonuses (not counted in sum):**
- Home Zone Return: +0.05 (if driver returning to home zone)

### Cold-Start Treatment

New drivers (< 3 completed trips) get:
- Trust factor assumed 0.50 (middle of scale)
- Route Familiarity assumed 0.30 (benefit of the doubt)
- Premium on matching loads: first 3 loads priced 10% above market (platform absorbs cost to accelerate driver acquisition)

---

## Cargo Types & Pricing

### Standard Cargo
- **Bagged Grain** (1.00x multiplier): Commodity pricing
- **Beverages** (1.10x): Slightly sensitive to temperature
- **Coffee** (1.10x): Premium, handling care
- **Cotton/Sesame** (1.00x): Commodity pricing
- **Cement** (1.10x): Heavy, specialized loading
- **Honey** (1.15x): Liquid, temp-sensitive

### Special Cargo (Higher Multipliers & Restrictions)
- **Fresh Produce** (1.15x): Max transit 8h, temp 2-8°C, cold-chain tracking
- **Livestock** (1.35x): Per-head payment, vet certificate, heat restrictions (no 11am-3pm May-Sep)
- **Khat** (1.40x): TIME-CRITICAL, 6h max, 5-min acceptance window, harvest timestamp
- **Fresh Fish** (1.40x): TIME-CRITICAL, 8h max, cold-chain 0-4°C, wet ice confirmed
- **Cut Flowers** (1.50x): TIME-CRITICAL, 6h max, temp 4-8°C, humidity controlled
- **Hazmat** (1.40x): Dangerous goods permit, specialized truck required

---

## Seasonal Model

### Rainy Season: June 1 - September 30

**Impact on Pricing:**
- Corridor-specific multipliers: 8-15% premium on affected routes
- Transit time estimates increase 20-30%
- Road condition risk premium: high-incident corridors get multiplier boost

**Affected Corridors (Example):**
- Addis ↔ Jimma: 1.20x multiplier
- Addis ↔ Bahir Dar: 1.15x
- Addis ↔ Gambela: 1.18x (highest risk)
- Addis ↔ Gondar: 1.12x (lower elevation, less rain)

**Orderer Notification:**
> "Rainy season active. Expect 30% longer transit on Gambela route, ETB 450 premium. Road conditions variable."

**Driver Notification:**
> "Rainy season active on Jimma route. Enhanced bonus (15%) for on-time delivery. Road alerts enabled."

### Market Days (Demand Surge)

15+ seasonal markets across the country:

| Market | Zone | Peak Day | Products | Demand Boost |
|--------|------|----------|----------|--------------|
| Addis Ababa Merkato | Addis | Sunday | All | +25% |
| Jimma Cattle Market | Jimma | Wednesday | Livestock | +40% |
| Hawassa Grain Terminal | Hawassa | Tuesday | Grains | +30% |
| Gondar Coffee Auction | Gondar | Friday | Coffee | +35% |
| Gambela Sesame Hub | Gambela | Monday | Sesame | +45% |

**Pricing Impact:**
- Days before market: load prices +10-20%
- Market day itself: prices spike +30-50%
- Algorithm prioritizes newer, hungrier drivers for market day loads

---

## Matching Scenarios

### Scenario 1: Standard Load
**Orderer posts:** 12 tons grains, Addis → Hawassa, pickup tomorrow 8am
- Distance: 300km
- Base: 300 × 12.50 + 1.2 × 850 = 4,620 ETB
- Cargo class mult: 1.00
- Final: 4,620 ETB
- Algorithm ranks drivers by WDM within 2-hour acceptance window
- Driver with highest combined score gets offer first

### Scenario 2: Time-Critical Load (Khat)
**Orderer posts:** 2 tons fresh khat, Addis → Dire Dawa, pickup NOW
- Distance: 410km
- Base: 410 × 12.50 + 0.2 × 850 = 5,340 ETB
- Cargo class mult: 1.40 (khat)
- Time-critical premium: +20%
- Final: 5,340 × 1.40 × 1.20 = **8,973 ETB**
- Algorithm SKIPS WDM queue, selects top 3 nearest available drivers
- 5-minute acceptance window (vs standard 20 min)
- If top 3 decline: next 3 notified immediately

### Scenario 3: Rainy Season Consolidation
**Agent posts:** 5 loads, 40 tons total mixed cargo, Addis → Jimma corridor
- Rainy season: June 15
- Base pricing: varies by cargo type
- Rainy season corridor mult: 1.20
- Consolidation discount: agent bundling saves 5%
- Algorithm finds one or two large trucks (consolidation preferred in rainy season)

### Scenario 4: Agent Platform Onboarding
**Community Agent creates:** Load on behalf of farmer (no app)
- Farmer's phone: +2519XXXXXXXXX (only identifier)
- 8 tons honey, Addis → Hawassa
- Escrow funded from agent's wallet (already top-up via cash)
- Driver accepts load (sees farmer via agent coordination)
- At delivery: agent confirms OTP (agent may be present)
- Payout split: 80% to agent wallet, 20% platform revenue

---

## Hours of Service Regulation

### Graduated Actions (5 Levels)

| Active Hours | Action | UI/Notification |
|---|---|---|
| 0-8h | None | No indicator |
| 8h+ | Advisory | "You've been active 8+ hours. Consider a rest break." |
| 10h+ | Soft Block | Tap to acknowledge ("I understand") → can continue |
| 12h+ | Strong Advisory | Requires voice note: "Why do you need to continue?" |
| 14h+ | Hard Block | **Cannot accept new loads.** In-progress trips continue. |

### Rest Definition
- 6+ continuous stationary hours between 9pm-5am (overnight rest)
- Resets the active-hours counter to zero

### Enforcement
- Background HoS worker checks every 30 minutes
- Never interrupts an active trip (drivers keep current load)
- Applies only to **new load acceptance**

---

## Security & Fraud

### Shadow Broker Detection
Old model (DISABLED): GPS correlation < 5km (false positives on short urban delivery)

**New behavioral model** (3 conditions, ALL must be met):
1. Driver has 3+ cancellations on same corridor within 21 days
2. Same orderer has NOT reposted load within 5 days of cancellations
3. Driver's GPS at destination within 12h of cancellation, no platform trip recorded

**Confidence Calculation:**
- Condition 1 alone: 30%
- Conditions 1+2: 60%
- Conditions 1+2+3: 90%

**Threshold:** 85% confidence required
- Below threshold: log only, no action
- Above threshold: flag for OPS Admin manual investigation (never auto-restrict)

**Action:** IF confirmed shadow broker:
- Account restricted
- Previous fraudulent trips under review
- Penalties assessed to fake orderers if any

### Duplicate Account Detection
- Phone number uniqueness enforced (regex SMS verification)
- IMEI tracking (if mobile app), flag same phone = different users
- GPS patterns: same location multiple accounts = alert

### Chargeback Fraud
- Orderer disputes freight payment after successful delivery
- Platform checks: OTP confirmed, photos, driver GPS, cold-chain (if applicable)
- Chargeback <5% of disputed amount: orderer trust -10
- Chargeback >3 times in 90 days: account restricted pending review

---

## Integration Points

### Africa's Talking SMS/USSD
- **SMS:** Load offers, OTP, notifications to drivers (Africa's Talking API)
- **USSD Menu:** Feature-phone drivers dial *862#:
  - 1. My Loads → SMS list of active loads
  - 2. Report Location → simple zone code entry
  - 3. Confirm Delivery → OTP entry for delivery confirmation
  - 4. SOS → one-tap emergency alert to OPS
  - 5. Fuel Report → station name + price + availability

### MinIO (S3-Compatible)
- Driver photos at pickup/delivery
- Orderer cargo photos
- Vet certificates (livestock)
- Cold-chain certificates (PDF generated post-delivery)
- Dispute evidence uploads

---

## Deployment Architecture

### Production Services
- **15 Engines** (Fastify microservices)
- **1 Notification Engine** (async SMS/push)
- **1 Workers Service** (BullMQ consumer)
- **PostgreSQL 16** (primary database)
- **Redis 7** (cache + queue)
- **MinIO** (blob storage)
- **Africa's Talking Account** (SMS/USSD provider)

### Infrastructure
- Containerized (Docker)
- Orchestrated (Docker Compose for medium scale, Kubernetes for large scale)
- Load balanced (nginx or similar)
- Monitoring (Prometheus/Grafana)
- Logging (ELK or Google Cloud Logging)

### Environment Variables
All sensitive config (API keys, DB passwords, provider credentials) stored in `.env`.
Non-sensitive business config (multipliers, weights, thresholds) in **StrategyConfig table** (database-driven).

---

## Adoption Phases

### Phase 1: Early Launch (Months 1-3)
- Addis Ababa metro (Addis → Hawassa route as pilot)
- 500 drivers, 200 orderers, 50 agents
- Manual OPS oversight for disputes

### Phase 2: Expansion (Months 4-8)
- Add 3 major routes (Jimma, Gondar, Gambela)
- 2,000 drivers, 500 orderers, 150 agents
- Automated fraud detection active

### Phase 3: Scale (Months 9+)
- Full 15+ corridor network
- 5,000+ drivers, 2,000+ orderers, 500+ agents
- Regional cooperatives active
- Market day demand forecasting live

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Driver on-time rate | 94%+ |
| Cargo damage rate | <2% |
| Payment disputes | <1% of loads |
| User trust score avg | 70+ (gold tier) |
| Platform commission margin | 12-15% |
| Driver utilization | 4+ loads per week |
| Agent new orderers/month | 10+ |
| Referral conversion | 15%+ |
| USSD adoption (feature phones) | 25-30% of drivers |
| Micro-credit default rate | <8% |

---

## Next Steps (Post-Launch)

1. **Real-time map** (not in MVP): integrate with map engine for live driver location broadcast
2. **Predictive pricing:** ML model for demand surge, seasonal multiplier auto-tuning
3. **Driver onboarding flow:** in-app KYC with liveness check (currently manual)
4. **Bulk pricing UI:** orderers upload CSV for 20+ loads at once
5. **Insurance partnerships:** real claims integration with underwriter
6. **Cross-border expansion:** Rwanda, Kenya (future phases)

---

## Contact & Support

For technical questions or deployment support, refer to:
- [API Reference](./API.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Architecture Document](./architecture.md)

For business logic and feature documentation:
- [Business Logic Guide](./ISUZET-BUSINESS-LOGIC.md)
- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)
