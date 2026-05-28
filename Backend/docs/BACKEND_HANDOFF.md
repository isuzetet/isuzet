# RUIT CBE Backend — Interface Team Handoff

**Generated:** March 7, 2025  
**Build Status:** ✅ PASS — Zero TypeScript Errors

---

## Quick Start for Frontend Developer

### Base URLs (Development)

| Engine | Base URL | Purpose |
|--------|----------|---------|
| Identity | http://localhost:3001/api/v1 | Auth, users, KYC |
| Optimizer | http://localhost:3002/api/v1 | Loads, pricing, matching |
| Corridor | http://localhost:3003/api/v1 | Corridors, ETA |
| Liquidity | http://localhost:3004/api/v1 | Escrow, payments |
| Shock | http://localhost:3005/api/v1 | Market conditions |
| Incident | http://localhost:3006/api/v1 | Disputes, safety |
| Behavior | http://localhost:3007/api/v1 | Ratings, analytics |
| Data | http://localhost:3008/api/v1 | Reports, fleet mgmt |
| Fraud | http://localhost:3009/api/v1 | Fraud detection |
| Strategy | http://localhost:3010/api/v1 | Business rules |
| Health | http://localhost:3011/api/v1 | System status |
| Twin | http://localhost:3012/api/v1 | Digital twin (stub) |
| Notifications | http://localhost:3013/api/v1 | Notifications |
| Location | http://localhost:3014/api/v1 | Location tracking |

---

## Authentication Flow

Every request (except register and verify-otp) requires:
```
Authorization: Bearer <access_token>
```

### Step 1: Register
```http
POST http://localhost:3001/api/v1/auth/register
Content-Type: application/json

{
  "phone": "0922111001",
  "fullName": "Abebe Kebede",
  "role": "FLEET_OWNER"
}

Response:
{
  "success": true,
  "data": {
    "userId": "...",
    "referralCode": "RUITXXXXXX",
    "otp_sent": true
  }
}
```

### Step 2: Verify OTP
```http
POST http://localhost:3001/api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+251922111001",
  "otp": "123456"
}

Response:
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "...",
      "entityId": "...",
      "entityType": "FLEET_OWNER",
      "role": "FLEET_OWNER",
      "trustTier": 0,
      "kycTier": 1,
      "referralCode": "RUITXXXXXX"
    }
  }
}
```

### Step 3: Use access_token in all subsequent requests
```
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Token expiry:** 24 hours  
**Refresh:** POST /auth/refresh with refresh_token

---

## User Roles and Permissions

| Role | Can Do |
|------|--------|
| FLEET_OWNER | Everything fleet-related, company settings, financial data |
| FLEET_MANAGER | Assign drivers, track trips, view (not edit) financials |
| DRIVER | View own trips, report status, log checkpoints |
| ORDERER | Create loads, track shipments, manage escrow |
| OPS_ADMIN | Everything — platform management |
| OPS_VIEWER | Read-only platform view |
| FINANCE_OPS | Financial operations, fuel advance approval |

---

## Standard Response Format

### Success:
```json
{
  "success": true,
  "data": { ... }
}
```

### Error:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description"
  }
}
```

---

## Amounts

All monetary amounts are in **ETB cents** (integer).  
1 ETB = 100 units in the API.  
To display: divide by 100.

Example: `500000` = 5,000 ETB

---

## Complete API Reference by Interface

### Interface 1: Driver Mobile App

Endpoints the driver app will call:

#### Authentication
- POST /auth/register (identity:3001)
- POST /auth/verify-otp (identity:3001)
- POST /auth/refresh (identity:3001)

#### Profile
- GET /identity/me (identity:3001) — get own profile
- PUT /identity/driver/profile (identity:3001) — update KYC, availability, emergency contact

#### Loads
- GET /optimizer/loads?status=OPEN (optimizer:3002) — browse available loads
- GET /optimizer/loads/:id (optimizer:3002) — load detail with stops
- POST /optimizer/load/:id/assign (optimizer:3002) — accept a load (owner-operator)
- POST /optimizer/load/:id/depart (optimizer:3002) — mark departure

#### Trip Operations
- POST /incident/checkpoint/log (incident:3006) — log checkpoint passage
- POST /incident/cargo-condition (incident:3006) — report cargo condition
- POST /incident/breakdown/report (incident:3006) — report breakdown
- POST /incident/sos (incident:3006) — SOS emergency button
- POST /liquidity/delivery/confirm-stop (liquidity:3004) — confirm delivery

#### Earnings
- GET /data/driver/earnings-certificate (data:3008) — earnings history

#### Ratings
- POST /behavior/rating/submit (behavior:3007) — rate orderer after trip

#### Location Tracking
- POST /location/ping (location:3014) — send GPS ping every 30 seconds (DRIVER JWT)
- GET /location/trip/:tripId/current (location:3014) — get current location
- GET /location/trip/:tripId/history (location:3014) — get route history

**Flutter Integration:**
- Call POST /ping every 30 seconds while trip is IN_PROGRESS
- Include tripId from the active load assignment
- Include offlinePings array when syncing queued offline pings
- Handle 400 INVALID_COORDINATES if GPS has poor fix
- **Coordinates:** Ethiopia bounds: lat 3.4-14.9, lng 32.9-47.9

---

### Interface 2: Fleet Owner Web App

Endpoints the fleet owner app will call:

#### Authentication & Team
- POST /auth/register (identity:3001) — with role: FLEET_OWNER
- POST /identity/manager/invite (identity:3001) — invite a manager
- GET /identity/managers (identity:3001) — list managers
- DELETE /identity/manager/:id (identity:3001) — remove manager
- PUT /identity/fleet/profile (identity:3001) — update KYC, bank account, TIN

#### Truck Management
- POST /identity/truck/kyc (identity:3001) — add/update truck documents
- POST /identity/fleet/affiliate (identity:3001) — link driver to fleet

#### Load Operations
- GET /optimizer/loads?status=OPEN (optimizer:3002) — available loads
- POST /optimizer/load/:id/assign (optimizer:3002) — assign truck to load
- GET /optimizer/loads/:id (optimizer:3002) — load detail

#### Tracking & Location
- GET /location/load/:loadId/current (location:3014) — get truck location by load
- GET /location/trip/:tripId/history (location:3014) — full route history for dispute
- POST /location/device/register (location:3014) — register hardware GPS device
- GET /location/device/truck/:truckId (location:3014) — check device registration

**Hardware GPS Device:**
- Fleet owners can register hardware GPS devices attached to trucks
- Devices authenticate with X-Device-Key header (not JWT)
- One active device per truck at a time

#### Financial
- POST /liquidity/fuel-advance/request (liquidity:3004) — request fuel advance
- GET /data/fleet/monthly-statement (data:3008) — monthly P&L
- POST /data/fleet/expense (data:3008) — log expense
- GET /data/fleet/expenses (data:3008) — expense history
- POST /data/fleet/loan (data:3008) — record CBE loan
- GET /data/fleet/loans (data:3008) — loan status

#### Analytics
- GET /data/fleet/utilization (data:3008) — truck utilization rates
- GET /data/fleet/driver-performance (data:3008) — driver rankings

#### Maintenance
- POST /data/truck/maintenance (data:3008) — log service
- GET /data/truck/maintenance/:truckId (data:3008) — service history

---

### Interface 3: Orderer Web App

Endpoints the orderer app will call:

#### Authentication
- POST /auth/register (identity:3001) — with role: ORDERER
- PUT /identity/orderer/profile (identity:3001) — update KYC, TIN, industry

#### Load Management
- POST /optimizer/loads (optimizer:3002) — create load with stops
- GET /optimizer/loads (optimizer:3002) — my loads
- GET /optimizer/loads/:id (optimizer:3002) — load detail with stops and driver info
- POST /optimizer/quote/multi-stop (optimizer:3002) — get price quote
- POST /optimizer/loads/from-template (optimizer:3002) — create from saved template
- POST /data/load/template (data:3008) — save load template
- GET /data/load/templates (data:3008) — list saved templates

#### Escrow
- POST /liquidity/escrow/fund-stop (liquidity:3004) — fund individual stop
- POST /liquidity/delivery/confirm-stop (liquidity:3004) — confirm receipt

#### Tracking
- GET /corridor/eta/:corridorId (corridor:3003) — ETA for active load
- GET /incident/checkpoint/trip/:tripId (incident:3006) — checkpoint history
- GET /location/load/:loadId/current (location:3014) — view truck location
- GET /location/track/:tripId (location:3014) — **SSE live stream** for real-time updates

**Live Map Integration (Browser SSE):**
```javascript
const sse = new EventSource('/api/v1/location/track/TRIP123?token=JWT');
sse.onmessage = (e) => {
  const loc = JSON.parse(e.data);
  updateMap(loc);
};
```
- Heartbeat every 25 seconds keeps connection alive
- Reconnect automatically on disconnect

#### Disputes
- POST /incident/cancellation (incident:3006) — cancel a load

#### Documents
- GET /data/load/proof-of-delivery/:loadId (data:3008) — download POD

#### ERP Integration
- POST /identity/api-key/generate (identity:3001) — generate API key
- GET /identity/api-keys (identity:3001) — list API keys

#### Ratings
- POST /behavior/rating/submit (behavior:3007) — rate driver after trip

---

### Interface 4: OPS Dashboard

Endpoints the OPS dashboard will call (OPS_ADMIN role required):

#### Platform Overview
- GET /health/status (health:3011) — all engine status
- GET /shock/status (shock:3005) — market shock status
- GET /strategy/versions (strategy:3010) — strategy versions

#### User Management
- GET /identity/users (identity:3001) — user list with filters
- (KYC approval endpoints available in identity engine)

#### Incident Management
- GET /incident/incidents (incident:3006) — open incidents workqueue
- PUT /incident/incidents/:id/status (incident:3006) — update incident status

#### Fraud
- GET /fraud/flags (fraud:3009) — fraud flags queue

#### Financial
- POST /liquidity/fuel-advance/approve/:id (liquidity:3004) — approve fuel advance
- POST /liquidity/fuel-advance/reject/:id (liquidity:3004) — reject fuel advance

#### Strategy Management
- POST /strategy/versions (strategy:3010) — create new strategy version
- PUT /strategy/versions/:id/activate (strategy:3010) — activate strategy

#### Corridor Management
- GET /corridor/corridors (corridor:3003) — list corridors
- GET /data/corridor/supply-demand/:id (data:3008) — live market conditions

#### Location Monitoring
- GET /location/active-trips (location:3014) — all active trips with locations
- GET /location/track/:tripId (location:3014) — SSE stream for live monitoring
- GET /location/trip/:tripId/history (location:3014) — route history

---

## Key Business Rules for Frontend

### Load Lifecycle
```
OPEN → MATCHED → IN_PROGRESS → COMPLETED
  ↓          ↓                ↓
CANCELLED  DISPUTED (from IN_PROGRESS)
```

### Multi-Stop Load Rules
- **SIMPLE:** exactly 2 stops (1 PICKUP + 1 DELIVERY)
- **MULTI_PICKUP:** 2+ PICKUPs + 1 DELIVERY (last stop)
- **MULTI_DISPATCH:** 1 PICKUP (first stop) + 2+ DELIVERYs
- **MULTI_BOTH:** 2+ PICKUPs + 2+ DELIVERYs

**Important:** Escrow releases per stop as each DELIVERY is confirmed. All orderers on a multi-orderer load must fund their stop before truck departs.

### Trust Tiers
- **Tier 0:** New user — limited access
- **Tier 1:** Basic KYC complete — standard access
- **Tier 2:** Verified business — higher escrow limits
- **Tier 3:** Established track record — priority matching
- **Tier 4:** Platform champion — premium features
- **Tier 5:** Manual approval only — highest tier

### Truck Eligibility
A truck can only accept loads when `isEligibleForLoads: true`. This is set to true when:
- Insurance verified AND
- Inspection (Yetebeqe) verified

If either document expires: truck is automatically blocked at next daily check.

### Driver Availability
- **AVAILABLE:** ready for assignment
- **ON_TRIP:** currently on an active load
- **RESTING:** driver manually set (rest period)
- **UNAVAILABLE:** driver manually set (not working)

System automatically sets ON_TRIP on assignment and AVAILABLE on completion.

### Pricing Formula
```
Price = WDM base × market multiplier × shock multiplier × seasonal multiplier
```

- **WDM:** weight (quintals) × distance (km) × base rate
- **Market multiplier:** 0.8–1.5 based on supply/demand on corridor
- **Shock multiplier:** 1.0–2.0 based on active shock mode

All multipliers configurable in active strategy version.

### Ethiopian Calendar
Reports use Ethiopian calendar months (1-13). Month 13 (Pagume) has 5 or 6 days. New Year is around September 11 (Enkutatash). When querying monthly statements: pass Ethiopian month number.

---

## Environment Setup for Interfaces

### Development
All interfaces connect to engines on localhost with ports defined above.

### CORS
Add your frontend origin to each engine's CORS configuration. Check each engine's index.ts for current allowed origins.

### WebSocket / Real-time
Engine 14 (Location) is **BUILT** and provides:
- SSE (Server-Sent Events) for live location via `/api/v1/location/track/:tripId`
- Real-time GPS ingested from Flutter driver app every 30 seconds
- Hardware GPS device support via X-Device-Key authentication
- Redis caching for instant location reads, TimescaleDB for history

For Sprint 1 interfaces: use polling every 30 seconds for location updates.

### File Uploads
KYC document uploads: not yet implemented in backend. Phase 2 feature — use text fields for document numbers for now.

---

## What Is NOT Yet Built (Phase 2)

| Feature | Status | Impact on Interfaces |
|---------|--------|---------------------|
| TeleBirr payment integration | Schema ready, not integrated | Show payment method UI but no actual payment processing |
| Real SMS provider | Mock only | OTP works in dev, production needs Africa's Talking config |
| Push notifications (FCM) | Not integrated | Notifications are backend events only |
| PDF generation for POD | Structure ready | POD endpoint returns JSON, not PDF file |
| Photo uploads for KYC | Not built | Document numbers stored as text |
| Digital Twin (Engine 12) | Stub only | Do not build UI for this yet |
| Credit line automation | Schema ready | Manual OPS approval flow only |

---

## Running the Backend

### Prerequisites
- Docker running with 4 containers: ruit_postgres, ruit_redis, ruit_timescaledb, ruit_minio
- Node.js 18+
- pnpm installed globally

### Start All Engines (PowerShell)

```powershell
$apps = @(
  "engine-identity","engine-strategy","engine-optimizer",
  "engine-liquidity","engine-corridor","engine-shock",
  "engine-incident","engine-behavior","engine-fraud",
  "engine-data","engine-health","engine-twin","notification-engine",
  "engine-location","workers"
)

foreach ($app in $apps) {
  Start-Process powershell -ArgumentList "-NoExit","-Command",
    "`$env:DATABASE_URL='postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe';" +
    "`$env:TIMESCALE_URL='postgresql://ruit:ruit_dev_password@localhost:5433/ruit_ts';" +
    "`$env:REDIS_URL='redis://localhost:6379';" +
    "`$env:JWT_SECRET='ruit-cbe-jwt-secret-development-key-change-in-prod';" +
    "`$env:JWT_EXPIRY='24h';" +
    "`$env:REFRESH_SECRET='ruit-cbe-refresh-secret-development-key';" +
    "`$env:REFRESH_EXPIRY='7d';" +
    "`$env:NODE_ENV='development';" +
    "`$env:MULTI_STOP_LOADS_ENABLED='true';" +
    "cd C:\Users\ygebr\Desktop\LAS\Backend\apps\$app;" +
    "npx tsx src/index.ts"
}
```

### Verify All Running

```powershell
$engines = @{
  "identity" = 3001
  "optimizer" = 3002
  "corridor" = 3003
  "liquidity" = 3004
  "shock" = 3005
  "incident" = 3006
  "behavior" = 3007
  "data" = 3008
  "fraud" = 3009
  "strategy" = 3010
  "health" = 3011
  "twin" = 3012
  "notification" = 3013
  "location" = 3014
}

foreach ($engine in $engines.GetEnumerator()) {
  try {
    $url = "http://localhost:$($engine.Value)/api/v1/$($engine.Key)/health"
    try { $r = Invoke-RestMethod -Uri $url -TimeoutSec 5 }
    catch { $url2 = "http://localhost:$($engine.Value)/api/v1/health"; $r = Invoke-RestMethod -Uri $url2 -TimeoutSec 5 }
    Write-Host "✅ $($engine.Key) (port $($engine.Value)): $($r.data.status)"
  }
  catch { Write-Host "❌ $($engine.Key) (port $($engine.Value)): FAILED" }
}
```

### Run E2E Tests

```powershell
# Clean test data first
docker exec ruit_postgres psql -U ruit -d ruit_cbe -c "DELETE FROM users WHERE phone LIKE '+25192211100%' OR phone LIKE '+25192288800%';"

# Run tests
.\tests\e2e\full-flow.ps1
```

---

## Build Verification

```bash
# Build all packages
pnpm -r build

# Should show zero errors
```

---

## Backend Sprint Status

**Completed:**
- ✅ 14 Engines built and verified (including Engine 14: Location)
- ✅ All TypeScript compilation passing
- ✅ Authentication flow implemented
- ✅ User registration with referral codes
- ✅ Multi-stop load creation
- ✅ Real-time GPS location tracking (TimescaleDB + Redis + SSE)
- ✅ Hardware GPS device support
- ✅ E2E test infrastructure

**Known Issues:**
- ❌ Engine startup automation needs PowerShell fixes
- ⚠️ Some engines require Docker containers running

**Next Phase (Frontend):**
- Build Driver Mobile App interface
- Build Fleet Owner Web App interface
- Build Orderer Web App interface
- Build OPS Dashboard interface
