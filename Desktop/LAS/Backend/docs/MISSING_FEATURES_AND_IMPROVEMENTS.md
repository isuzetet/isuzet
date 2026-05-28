# ISUZET — Missing Features & Improvements for Perfect Ethiopian Logistics
> Comprehensive gap analysis and recommendations. Everything needed to make this platform world-class for Ethiopian medium-haul logistics.

---

## EXECUTIVE SUMMARY

The ISUZET backend is architecturally mature and well-designed. All 18 packages build cleanly, core business logic is implemented, and the platform covers the fundamentals of Ethiopian freight logistics. However, several critical gaps remain between current implementation and production-ready perfection. This document categorizes everything into: Critical (must-fix before launch), High Priority (launch+30 days), Medium Priority (launch+90 days), and Strategic (long-term roadmap).

---

## SECTION 1: CRITICAL MISSING IMPLEMENTATIONS (Must Fix Before Launch)

### 1.1 GPS & Real-Time Location
**Status:** Schema exists, engine-location exists, but real-time SSE stream is stub.

**What's Missing:**
- Server-Sent Events (SSE) stream handler for live driver tracking
- Geofencing logic (detect when driver enters/exits delivery zone)
- Route deviation detection algorithm (compare GPS trace against expected corridor)
- Offline batch GPS upload handling (drivers upload accumulated GPS when connection restored)

**Solution:**
```typescript
// In engine-location/src/routes/location.routes.ts
// Add SSE endpoint
fastify.get('/trip/:tripId/stream', {
  config: { requireAuth: true },
  handler: async (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');

    const sub = redis.subscribe(`trip:${req.params.tripId}:gps`);
    sub.on('message', (channel, data) => {
      reply.raw.write(`data: ${data}\n\n`);
    });

    req.socket.on('close', () => sub.unsubscribe());
  }
});

// GPS publisher in batch upload handler:
await redis.publish(`trip:${tripId}:gps`, JSON.stringify(latestPoint));
```

---

### 1.2 USSD Full Menu Flows
**Status:** USSD webhook endpoint exists, basic structure in notification-engine, but menu state machine is incomplete.

**What's Missing:**
Complete USSD session state machine for:
```
*862# → Main Menu (1. Loads | 2. Report Location | 3. Confirm Delivery | 4. SOS | 5. Fuel Report)
  1 → My Active Loads (list last 3 loads with IDs)
     1 → Load details (pickup zone, cargo, price)
     2 → Accept load (within acceptance window)
     3 → Back
  2 → Report Location
     Enter zone code: [input]
     Confirm: "Location updated to [zone name]"
  3 → Confirm Delivery
     Enter OTP: [input]
     Result: "Delivery confirmed. ETB XXX released."
  4 → SOS
     1 → Medical Emergency → alerts OPS
     2 → Breakdown → alerts OPS + fleet owner
     3 → Security Threat → alerts OPS + police integration
     0 → Cancel
  5 → Fuel Report
     Enter station name: [input]
     Fuel type (1=Diesel, 2=Petrol): [input]
     Price (ETB/liter): [input]
     Availability (1=Full, 2=Limited, 3=Empty): [input]
```

**Implementation:** Store USSD session state in Redis with TTL 300s. Each USSD callback includes phone + sessionId + text input.

---

### 1.3 Payment Rail Integration (Currently Stubs)
**Status:** Payment rail enum defined, schema ready, but actual API calls to Telebirr/CBE/Chapa are stubs.

**What's Missing:**
- Telebirr API integration (Ethio Telecom mobile money)
- CBE (Commercial Bank of Ethiopia) API integration
- Chapa payment gateway integration
- Payment webhook handlers (for async payment notifications)
- Payment failure retry logic

**Priority Order:** Telebirr first (largest user base), then CBE, then Chapa.

**Telebirr API Notes:**
- Ethio Telecom provides Telebirr Business API
- Requires merchant code + secret key
- Supports push USSD (charge customer) and C2B (customer pays merchant)
- Webhook for payment confirmation
- Test environment: sandbox.telebirr.com

---

### 1.4 File Storage (KYC Documents & Delivery Photos)
**Status:** MinIO configured in docker-compose, but upload endpoints need pre-signed URL generation.

**What's Missing:**
```typescript
// In engine-identity/src/routes/identity.routes.ts
// KYC upload should:
// 1. Generate MinIO pre-signed upload URL
// 2. Return URL to client
// 3. Client uploads directly to MinIO
// 4. Client calls /kyc/confirm with object key
// 5. Backend stores reference in DB

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function getUploadUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: process.env.MINIO_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
```

---

### 1.5 Structured Logging
**Status:** Currently using `console.log()` everywhere. No structured logging.

**What's Missing:**
Replace all `console.log` with Pino logger (already in Fastify ecosystem):

```typescript
// In each engine's index.ts:
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' }
    } : undefined,
  }
});

// Usage in routes:
req.log.info({ userId: user.id, action: 'KYC_UPLOAD' }, 'KYC document uploaded');
req.log.error({ error: err.message, stack: err.stack }, 'Payment failed');
```

**Log fields to always include:** `requestId`, `userId`, `engineName`, `action`, `durationMs`, `statusCode`

---

### 1.6 API Rate Limiting
**Status:** No rate limiting implemented. Critical for production.

```typescript
// Install: pnpm add @fastify/rate-limit
import rateLimit from '@fastify/rate-limit';

// In each engine's index.ts:
await fastify.register(rateLimit, {
  global: true,
  max: 100,                // 100 requests per window
  timeWindow: '1 minute',
  redis: redisClient,      // Distributed rate limiting
  keyGenerator: (req) => req.headers['x-forwarded-for'] as string || req.ip,
  errorResponseBuilder: (req, context) => ({
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: `Too many requests. Retry after ${context.after}`,
  })
});

// Stricter limit for auth endpoints (prevent OTP brute force):
fastify.register(rateLimit, {
  max: 5,
  timeWindow: '5 minutes',
  routeOptions: { config: { rateLimit: { max: 5 } } }
});
```

---

## SECTION 2: HIGH PRIORITY (Launch + 30 Days)

### 2.1 Weighbridge Integration
**Status:** Worker exists (weighbridge-intelligence.worker.js), schema has checkpoints table, but no integration with actual Ethiopian Roads Authority systems.

**Ethiopian Weighbridge Context:**
- ERA (Ethiopian Roads Authority) operates weighbridges at entry to major towns
- Fines for overloading: 500–5000 ETB
- Maximum legal load: 30 tons gross vehicle weight
- Key stations: Debre Berhan (Addis-Dessie), Adama (ring road), Bishoftu

**Implementation:**
```typescript
// When driver reports encountering weighbridge:
// POST /api/v1/location/checkpoint with type: "WEIGHBRIDGE"
// System should:
// 1. Log weighbridge encounter with load ID
// 2. Record measured weight (driver inputs)
// 3. Compare against load declared weight
// 4. If > 5% discrepancy: flag load, notify OPS
// 5. Track fines: deduct from driver/orderer per contract terms
```

---

### 2.2 ETA Calculation with Ethiopian Road Conditions
**Status:** Transit time estimated with basic km/speed formula. Not accounting for real conditions.

**What's Needed:**
```typescript
interface EtaFactors {
  baseSpeedKmh: number;        // By road type: asphalt 60, gravel 40, dirt 25
  rainySeason: boolean;         // June-Sep: -20% speed
  truckLoadFactor: number;      // Full load -15%
  activeAlerts: RoadAlert[];    // Each ROAD_FLOOD: +2h, ROAD_CLOSED: +4h, POLICE_CHECK: +0.5h
  marketDayNearby: boolean;     // Within 50km of market day: +1h congestion
  nightDriving: boolean;        // Sunset-sunrise: -20% speed (safety)
  corridorHistoricalDelay: number; // From corridor_snapshots average
}

function calculateEta(distanceKm: number, factors: EtaFactors): {
  estimatedHours: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
}
```

---

### 2.3 Multi-Language Content Management
**Status:** SMS templates have hardcoded English + some Amharic. No systematic i18n.

**Languages needed for Ethiopian logistics:**
- **Amharic** ( አማርኛ) — official, Addis Ababa + central Ethiopia
- **Oromifa** (Afaan Oromoo) — Oromia region (largest by area)
- **Tigrinya** (ትግርኛ) — Tigray region
- **Somali** (Af Soomaali) — Somali region (Harar, Jigjiga corridors)

**Implementation:**
```typescript
// packages/shared-utils/src/i18n.ts
const templates = {
  am: {
    otp_message: (otp: string) => `ISUZET: የማረጋገጫ ኮድዎ ${otp} ነው። ለ5 ደቂቃ ብቻ ይሰራል።`,
    load_offered: (corridor: string, price: number) =>
      `${corridor} ጭነት ቀርቧል። ዋጋ: ብር ${price}። ለመቀበል ምላሽ ይስጡ።`,
    delivery_confirmed: (amount: number) => `ደረሰ! ብር ${amount} ለ7 ቀናት ይለቀቃል።`,
  },
  en: {
    otp_message: (otp: string) => `ISUZET: Your OTP is ${otp}. Valid for 5 minutes.`,
    load_offered: (corridor: string, price: number) =>
      `New load on ${corridor} corridor. Price: ETB ${price}. Reply to accept.`,
    delivery_confirmed: (amount: number) => `Delivered! ETB ${amount} will be released in 7 days.`,
  },
  om: { /* Oromifa templates */ },
  ti: { /* Tigrinya templates */ },
};
```

---

### 2.4 Prometheus Metrics Collection
**Status:** Prometheus config file in infra/, but no metrics instrumentation in code.

```typescript
// Install: pnpm add prom-client
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

// Business metrics:
const loadsCreated = new Counter({
  name: 'isuzet_loads_created_total',
  help: 'Total loads posted',
  labelNames: ['cargoType', 'corridor'],
  registers: [register],
});

const apiDuration = new Histogram({
  name: 'isuzet_api_duration_ms',
  help: 'API request duration',
  labelNames: ['engine', 'endpoint', 'statusCode'],
  buckets: [50, 100, 250, 500, 1000, 2500],
  registers: [register],
});

// Expose /metrics endpoint on each engine (no auth, localhost only)
fastify.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

---

### 2.5 Webhook Payload Definitions
**Status:** WEBHOOK_DELIVERY worker exists, but webhook payload structure not formally defined.

**Orderer webhooks to implement:**
```typescript
type WebhookEvent =
  | { event: 'LOAD_MATCHED'; data: { loadId: string; driverName: string; driverPhone: string; estimatedPickup: string } }
  | { event: 'TRIP_STARTED'; data: { loadId: string; tripId: string; driverLocation: { lat: number; lng: number } } }
  | { event: 'DELIVERY_CONFIRMED'; data: { loadId: string; stopId: string; confirmedAt: string; podUrl: string } }
  | { event: 'INCIDENT_OPENED'; data: { incidentId: string; severity: string; description: string } }
  | { event: 'PAYMENT_RELEASED'; data: { loadId: string; amountEtb: number; settlementDate: string } };

// Webhook delivery should include:
// - Retry with exponential backoff (1s, 5s, 30s, 5min, 1hr)
// - HMAC-SHA256 signature in X-ISUZET-Signature header
// - Idempotency key in X-Delivery-ID header
```

---

### 2.6 Dead Letter Queue Dashboard
**Status:** DEAD_LETTER_QUEUE_ENABLED=true in env, but no DLQ processing or visibility.

```typescript
// Add BullMQ Board or custom DLQ viewer
// Failed jobs need:
// 1. Visibility in OPS dashboard
// 2. Manual retry capability
// 3. Alert to OPS when DLQ depth > threshold
// 4. Auto-retry for transient failures (network, DB timeout)
```

---

## SECTION 3: MEDIUM PRIORITY (Launch + 90 Days)

### 3.1 Ethiopian Customs & Border Management
**Relevant for:** Djibouti corridor (Addis ↔ Dire Dawa ↔ Djibouti Port) — Ethiopia's main import/export route

**Features Needed:**
- Customs declaration form attachment to loads
- Customs broker assignment
- Border crossing time tracking (Galafi border post, Dewele)
- Customs clearance status updates
- Transit bond tracking
- ETRS (Ethiopian Transit Road Supervision) compliance

**Note:** Even though ISUZET is domestic-only, many loads originate or terminate at customs-cleared warehouses in Dire Dawa.

---

### 3.2 Ethiopian Revenue Authority (ERA) Tax Integration
**Required for:** Fleet owners and orderers with annual freight volumes

**Features Needed:**
```typescript
// VAT calculation (15% on freight in Ethiopia)
function calculateVAT(freightAmountCents: number): {
  subtotal: number;
  vat: number;
  total: number;
  vatRegistered: boolean;
} {
  // Only VAT-registered businesses required to collect/pay
  // TIN number validation against ERA database (future)
}

// Monthly/quarterly tax report export
// TIN certificate validation on business registration
// Invoice generation with TIN numbers
```

---

### 3.3 Insurance Integration (Ethiopian Insurers)
**Status:** Insurance schema exists, claim submission endpoint exists, but no real insurer integration.

**Ethiopian Insurance Companies to integrate:**
- Ethiopian Insurance Corporation (government-owned, largest)
- Awash Insurance (private)
- Nile Insurance
- Africa Insurance

**Features Needed:**
- Cargo insurance policy purchase at load creation (optional)
- Real-time premium calculation based on cargo type, value, corridor risk
- Automated claim submission to insurer API
- Claim status tracking
- Cold-chain compliance certificate for food cargo insurance

---

### 3.4 Cooperative & Transport Association Management
**Status:** Individual fleet owners and drivers work well; cooperative dispatchers partially implemented.

**Ethiopian Context:**
- Most Ethiopian truckers belong to transport cooperatives
- Cooperatives handle load allocation internally
- Some cooperatives have 100+ trucks
- Payment goes to cooperative, distributed to members

**Features Needed:**
```typescript
// Add Cooperative entity to schema
model TransportCooperative {
  id                String
  name              String
  registrationNo    String   // ERA registration
  zoneId            String
  dispatcherId      String   // User who can assign loads
  members           FleetOwner[]
  coordinationFeePercent Float  // Fee taken from each payout
  accountabilityPercent  Float  // 40% of member penalties apply to coop
}
```

---

### 3.5 Loading/Unloading Labor (Qegna) Management
**Status:** Not implemented at all.

**Ethiopian Context:**
- "Qegna" (ቀኛ) = loading/unloading workers at terminals
- Every load requires 3–15 qegna depending on weight/cargo
- Cost: 100–500 ETB per person per day
- This is a major source of disputes (orderer claims workers weren't provided)

**Features Needed:**
- Labor requirement specification per load
- Qegna cost included in freight quote
- Agent-managed qegna pools at major terminals (Kaliti, Mojo, Awash)
- Qegna confirmation at pickup (who loaded, how many, cost)

---

### 3.6 Cold Chain Certificate Generation (Phase 10 Completion)
**Status:** Cold chain events tracked, but PDF certificate generation is TODO.

**Required for exports:** Coffee, cut flowers, fresh produce going to Addis markets or airports

```typescript
// Generate PDF certificate with:
// - Trip ID, cargo description, weight
// - Temperature log chart (min/max/avg per hour)
// - Compliance status (exceeded excursion limit? how many times?)
// - Driver name and truck details
// - Platform digital signature
// - QR code linking to immutable audit record

import PDFKit from 'pdfkit';
// Or use: @react-pdf/renderer for server-side React → PDF
```

---

### 3.7 Driver Cash Advance (Fuel Advance)
**Status:** Micro-credit exists for orderers, but drivers need fuel advance for long hauls.

**Ethiopian Context:**
- Fuel costs 50–70% of trip revenue on long hauls
- Drivers often can't front fuel cost for Addis→Gambela (900+ km)
- Common request: "Give me ETB 5,000 fuel advance, deduct from payment"

**Implementation:**
```typescript
// POST /api/v1/liquidity/fuel-advance
{
  "tripId": "trip_01...",
  "requestedAmountCents": 500000,  // ETB 5,000
  "justification": "Fuel for Addis-Gambela route"
}
// Deduct from driver payout at settlement
// Requires trust tier >= T2
// Max advance: 30% of load value
```

---

## SECTION 4: ETHIOPIAN-SPECIFIC PLATFORM IMPROVEMENTS

### 4.1 Birr Exchange Rate Monitoring
**Why:** Ethiopia has strict FX controls (National Bank of Ethiopia)
- Official rate vs parallel market rate creates business complexity
- Import costs (spare parts, tires) priced in USD at parallel rate
- Fleet owners calculate their costs in USD equivalent

**Feature:** Track official NBE rate daily, show truck operating cost in both ETB and USD equivalent.

---

### 4.2 Fuel Crisis Mode (Advanced)
**Current status:** Fuel queue mode exists as a simple flag.

**Ethiopian Context:**
- Fuel shortages are frequent (2022, 2023 major crises)
- Stations may have diesel but no petrol, or vice versa
- Queue times at stations can be 4–12 hours

**Enhanced Fuel Crisis Features:**
```typescript
// 1. Station-level fuel status map (powered by driver reports)
// 2. Optimal route calculation to include best fuel stops
// 3. Load priority during fuel shortage (essential goods first: food, medicine)
// 4. Fuel allocation: platform allocates fuel vouchers to highest-trust drivers
// 5. Compensation mechanism: delay pay when fuel shortage causes delay
```

---

### 4.3 Road Type Database (Asphalt / Gravel / Dirt)
**Why:** Speed, wear, and insurance differ dramatically by road type.

**Data needed:**
- Addis→Hawassa (A7): All asphalt, good condition ✓
- Addis→Gambela: Mixed, last 200km poor gravel
- Jimma→Mizan Teferi: Mostly dirt, impassable in heavy rain
- Gondar→Metema: Known for deep ruts in rainy season

**Implementation:** Road type lookup table per corridor segment, used in:
- ETA calculation
- Insurance premium adjustment
- Cargo type restrictions (no refrigerated on dirt roads)
- Truck type recommendations (4WD required for some corridors)

---

### 4.4 Market Day Calendar (Complete Implementation)
**Status:** Market day intelligence is partially implemented in shared-db.

**Ethiopian Market Days (complete list needed):**
```typescript
const ETHIOPIAN_MARKETS = [
  { name: 'Addis Ababa Merkato', zoneId: 'addis', dayOfWeek: 0 /* Sunday */, boostPercent: 25 },
  { name: 'Jimma Cattle Market', zoneId: 'jimma', dayOfWeek: 3 /* Wednesday */, boostPercent: 40 },
  { name: 'Hawassa Grain Terminal', zoneId: 'hawassa', dayOfWeek: 2 /* Tuesday */, boostPercent: 30 },
  { name: 'Gondar Coffee Auction', zoneId: 'gondar', dayOfWeek: 5 /* Friday */, boostPercent: 35 },
  { name: 'Gambela Sesame Hub', zoneId: 'gambela', dayOfWeek: 1 /* Monday */, boostPercent: 45 },
  { name: 'Dire Dawa Kezira Market', zoneId: 'dire_dawa', dayOfWeek: 4 /* Thursday */, boostPercent: 30 },
  { name: 'Bahir Dar Saturday Market', zoneId: 'bahir_dar', dayOfWeek: 6 /* Saturday */, boostPercent: 25 },
  { name: 'Nekemte Cattle Fair', zoneId: 'nekemte', dayOfWeek: 1 /* Monday */, boostPercent: 38 },
  { name: 'Shashemene Thursday Market', zoneId: 'shashemene', dayOfWeek: 4, boostPercent: 28 },
  { name: 'Harar Jugol Friday Market', zoneId: 'harar', dayOfWeek: 5, boostPercent: 32 },
  // Ethiopian New Year (Enkutatash): September 11/12 — massive movement
  // Timkat: January 19/20 — livestock and cattle movement
  // Meskel: September 27/28 — harvest movement
];
```

---

### 4.5 Police/Military Checkpoint Intelligence
**Ethiopian Context:**
- Police checkpoints at town entries are mandatory stops for trucks
- Military checkpoints exist on conflict-adjacent corridors (Afar, Somali region, Amhara/Tigray borders)
- Average delay at checkpoint: 15–45 minutes
- Required documents: driver license, vehicle registration, cargo manifest, load permit

**Implementation:**
```typescript
// Track checkpoint encounters in trips
// POST /api/v1/location/checkpoint with type: "POLICE" | "MILITARY" | "CUSTOMS"
// Platform learns average delay per checkpoint from historical data
// Include in ETA calculation
// Alert OPS if driver takes >2h at checkpoint (potential issue)
// Maintain list of required documents per checkpoint type
```

---

### 4.6 Livestock Season Restrictions (Phase 10 Enhancement)
**Current:** Livestock hours restriction (no 11am–3pm May–Sep) is in schema.

**Missing:**
- Vet certificate upload and verification
- Movement permit requirements (livestock require government movement permit)
- Species-specific restrictions (cattle need dip certificate, poultry need health cert)
- Heat stress monitoring (route temperature data)
- Mortality insurance (mandatory for livestock transport > 500km)
- Quarantine zone maps (some zones have livestock movement bans)

---

## SECTION 5: INFRASTRUCTURE & SECURITY

### 5.1 Database Indexing
**Critical for performance at scale:**
```sql
-- High-frequency query indexes (add to Prisma schema or migrations):
CREATE INDEX CONCURRENTLY idx_loads_status_corridor ON loads(status, corridor_id);
CREATE INDEX CONCURRENTLY idx_assignments_driver_status ON assignments(driver_id, status);
CREATE INDEX CONCURRENTLY idx_gps_traces_trip_ts ON gps_traces(trip_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_events_entity_type ON events(entity_type, entity_id);
CREATE INDEX CONCURRENTLY idx_incidents_status_severity ON incidents(status, severity);
CREATE INDEX CONCURRENTLY idx_users_phone_hash ON users(phone_hash);
CREATE INDEX CONCURRENTLY idx_drivers_trust_tier ON drivers(trust_tier, status);

-- TimescaleDB: Ensure corridor_snapshots has proper chunk intervals
SELECT create_hypertable('corridor_snapshots', 'recorded_at', chunk_time_interval => INTERVAL '1 week');
```

---

### 5.2 Redis Persistence Configuration
**Current:** Default Redis (data lost on restart)

**Fix for production:**
```
# redis.conf
save 900 1      # Save snapshot if 1 key changed in 900s
save 300 10     # Save if 10 keys in 300s
appendonly yes  # Append-only file (AOF) for durability
appendfsync everysec
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

### 5.3 SSL/TLS Setup
**Every engine needs HTTPS in production:**
```typescript
// Using nginx as reverse proxy (recommended):
// nginx.conf: SSL termination at nginx, HTTP internally
// OR: Fastify native HTTPS:
const fastify = Fastify({
  https: {
    key: fs.readFileSync('./ssl/private.key'),
    cert: fs.readFileSync('./ssl/certificate.crt'),
  }
});
```

---

### 5.4 Health Check Improvements
**Current:** Basic ping endpoints.

**Add deep health checks:**
```typescript
// GET /api/v1/health/status
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  checks: {
    database: { status: 'ok', latencyMs: 12 },
    redis: { status: 'ok', latencyMs: 3 },
    minio: { status: 'ok' },
    notificationEngine: { status: 'ok' },
  },
  version: '1.2.3',
  uptime: 3600,
  ethiopianDate: '2016-10-09'
}
```

---

### 5.5 Security Hardening Checklist

- [ ] **Helmet.js** — HTTP security headers on all engines
- [ ] **CORS whitelist** — Only allow known frontend origins (not *)
- [ ] **Input sanitization** — All user inputs sanitized before DB queries
- [ ] **SQL injection** — Prisma parameterized queries (already protected, but verify raw queries)
- [ ] **JWT private key rotation** — Procedure for key rotation without downtime
- [ ] **PII audit** — Confirm all phone numbers, names, ID numbers encrypted at rest
- [ ] **API key scoping** — Orderer API keys limited to their own data only
- [ ] **Admin action logging** — Every OPS admin action logged with user ID, IP, timestamp
- [ ] **Brute force protection** — OTP rate limiting (already implemented, verify Redis TTL)
- [ ] **Dependency audit** — Run `pnpm audit` and fix critical vulnerabilities

---

### 5.6 Backup Strategy

```bash
# Daily PostgreSQL backup (cron job):
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/ruit_$(date +%Y%m%d).sql.gz

# TimescaleDB backup:
0 3 * * * pg_dump $TIMESCALE_URL | gzip > /backups/timescale_$(date +%Y%m%d).sql.gz

# Retain: 7 daily + 4 weekly + 12 monthly
# Store in: MinIO (local) + offsite (AWS S3 or Google Cloud Storage)

# Redis backup:
# If using AOF: copy appendonly.aof daily to offsite storage
# Test restore procedure monthly
```

---

## SECTION 6: API COMPLETENESS GAPS

### 6.1 Missing Endpoints

| Engine | Missing Endpoint | Why Needed |
|--------|-----------------|------------|
| Identity | GET /api/v1/identity/drivers/:id/public | Fleet owners search available drivers |
| Dispatch | GET /api/v1/loads/:id/audit-trail | Full event history for a load |
| Liquidity | GET /api/v1/liquidity/settlements/pending | OPS views all pending settlements |
| Corridor | GET /api/v1/corridor/:id/history | Rate history for pricing analysis |
| Dispatch | POST /api/v1/loads/:id/cancel | Orderer cancels own load (with reason) |
| Identity | GET /api/v1/identity/referral/leaderboard | Gamify referral program |
| Strategy | GET /api/v1/strategy/active | Get just the active strategy (not list) |
| Behavior | GET /api/v1/behavior/driver/:id/trend | Driver behavior trend over 90 days |
| Location | GET /api/v1/location/driver/:id/history | Driver location history for a trip |

---

### 6.2 Pagination Standardization
**Current:** Some endpoints return all results, others have custom pagination.

**Standardize to:**
```typescript
// All list endpoints should accept:
interface PaginationQuery {
  page?: number;     // default 1
  limit?: number;    // default 20, max 100
  sortBy?: string;   // field name
  sortOrder?: 'asc' | 'desc';
}

// All list responses should return:
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

---

## SECTION 7: STRATEGIC ROADMAP (6–18 Months)

### 7.1 AI/ML Predictions (Phase flag: AI_PREDICTIONS_ENABLED)
- **Demand forecasting:** Predict load demand per corridor 7 days ahead
- **Dynamic pricing optimization:** ML model for optimal price to maximize both driver acceptance and orderer satisfaction
- **Route optimization:** Optimal routing considering real-time conditions
- **Driver matching improvement:** A/B test new WDM weight combinations
- **Churn prediction:** Identify drivers/orderers at risk of leaving platform

### 7.2 Driver Finance Products
- **Fuel card integration:** Negotiate bulk fuel pricing for platform drivers
- **Tire/maintenance credit:** Credit facility for truck maintenance
- **Vehicle purchase finance:** Help drivers buy their own trucks
- **Savings product:** Automatic savings from each payout

### 7.3 Orderer Finance Products
- **Inventory finance:** Fund orderer's cargo purchase (not just transport)
- **Trade finance:** Letter of credit integration for large traders
- **Insurance bundling:** Transport + cargo + credit bundle pricing

### 7.4 Data Marketplace
- **Route intelligence reports:** Sell corridor analytics to infrastructure planners
- **Demand signals:** Anonymous aggregate data for FMCG companies
- **Compliance data:** For Ethiopian government road authorities

### 7.5 Platform Expansion
- **Cross-border (Ethiopia → Kenya/Djibouti):** New entity type, customs integration
- **Air freight coordination:** Integration with Ethiopian Airlines Cargo
- **Warehouse integration:** Addis Ababa cold storage facilities
- **Last-mile logistics:** Connection to local delivery platforms in Addis

---

## SECTION 8: DEVELOPMENT PROCESS IMPROVEMENTS

### 8.1 Integration Testing
**Currently:** No automated tests.

**Add with Vitest + Supertest:**
```typescript
// test/identity.test.ts
describe('Auth Flow', () => {
  it('registers user and verifies OTP', async () => {
    const reg = await app.inject({ method: 'POST', url: '/api/v1/auth/register',
      body: { phone: '+251912345678', fullName: 'Test User', role: 'DRIVER' }
    });
    expect(reg.statusCode).toBe(200);

    // Get OTP from Redis (test helper)
    const otp = await testRedis.get(`otp:+251912345678`);

    const verify = await app.inject({ method: 'POST', url: '/api/v1/auth/verify-otp',
      body: { phone: '+251912345678', otp }
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().data.accessToken).toBeDefined();
  });
});
```

### 8.2 OpenAPI / Swagger Documentation
```typescript
// Install: @fastify/swagger + @fastify/swagger-ui
await fastify.register(swagger, {
  openapi: {
    info: { title: 'ISUZET API', version: '1.0.0' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }
  }
});
await fastify.register(swaggerUI, { routePrefix: '/docs' });
// Auto-generates documentation from Fastify route schemas
```

### 8.3 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml already exists — enhance it:
# 1. pnpm install
# 2. pnpm build (verify all 18 packages)
# 3. pnpm test (once tests are added)
# 4. pnpm audit (security scan)
# 5. Docker build
# 6. Deploy to staging (on merge to main)
# 7. Deploy to production (manual trigger with approval)
```

---

## SUMMARY TABLE

| Priority | Category | Item | Effort |
|----------|----------|------|--------|
| CRITICAL | Implementation | GPS/SSE real-time streaming | 2 days |
| CRITICAL | Implementation | USSD full menu state machine | 3 days |
| CRITICAL | Implementation | Telebirr payment integration | 5 days |
| CRITICAL | Implementation | MinIO file upload with pre-signed URLs | 1 day |
| CRITICAL | Infrastructure | Structured logging (Pino) | 1 day |
| CRITICAL | Security | API rate limiting | 0.5 day |
| HIGH | Ethiopian | Weighbridge integration | 3 days |
| HIGH | Ethiopian | ETA calculation with road conditions | 2 days |
| HIGH | Platform | Multi-language SMS templates (4 languages) | 2 days |
| HIGH | Infrastructure | Prometheus metrics | 2 days |
| HIGH | Platform | Webhook payload definitions + retry | 2 days |
| MEDIUM | Ethiopian | ERA/customs management | 1 week |
| MEDIUM | Ethiopian | Insurance integration | 2 weeks |
| MEDIUM | Ethiopian | Cooperative management | 1 week |
| MEDIUM | Ethiopian | Qegna (loading labor) management | 3 days |
| MEDIUM | Ethiopian | Market day calendar completion | 1 day |
| MEDIUM | Platform | Cold chain PDF certificate generation | 2 days |
| MEDIUM | Platform | Driver fuel advance | 2 days |
| LOW | Infrastructure | Database indexing | 1 day |
| LOW | Infrastructure | Redis persistence config | 0.5 day |
| LOW | Quality | Integration tests | 1 week |
| LOW | Quality | OpenAPI/Swagger docs | 2 days |

**Total estimated effort for CRITICAL items:** ~12–15 days (one developer)
**Total for CRITICAL + HIGH:** ~25–30 days
**Full production readiness (all items):** ~10–12 weeks
