# ISUZET Platform — System Status
**Last updated:** 2026-03-21
**Audit baseline:** AUDIT_REPORT.md (Phase 0)

---

## Overall Status

| Phase | Codebase | Status |
|-------|----------|--------|
| Phase 0 | All — Audit | ✅ COMPLETE |
| Phase 1 | Backend — Engine verification | ✅ COMPLETE |
| Phase 2 | isuzet_field — API contract fixes | ✅ COMPLETE |
| Phase 3 | isuzet_business — Auth flow, SSE tracking, fleet metrics, APK build | ✅ COMPLETE |
| Phase 4 | ops-dashboard — Auth security + all 9 real pages | ✅ COMPLETE |
| Phase 5 | rate-calculator — API wiring + mock removal | ✅ COMPLETE |
| Phase 6 | E2E test — 29/29 assertions passing | ✅ COMPLETE |
| Phase 7 | Security audit + Firebase SA gitignore | ✅ COMPLETE |
| **Pre-Pilot Final Pass** | All codebases — 57/57 e2e, FCM, ops endpoints, workers | ✅ **COMPLETE** |

---

## Phase 1 — Backend Verification (All Engines)

### Fixes Applied

| File | Fix |
|------|-----|
| `engine-location/src/routes/location.routes.ts` | `requireAuth` (factory) → `requireAuth()` (instance) — 7 occurrences. Fastify never invoked the middleware, causing all GPS pings to hang. |
| `engine-location/src/routes/device.routes.ts` | Same fix — 2 occurrences |
| `engine-location/src/routes/tracking.routes.ts` | Same fix — 4 occurrences |
| Rate card seeding (via Node.js script) | Created 46 `RateCardVersion` records with `effectiveTo: null`. Query requires `effectiveTo IS NULL` for active cards; seeded cards had `effectiveTo: '2027-12-31'`. |
| Redis cache flush | Cleared `cache:corridor:corr_add_sha` after rate card re-seed to force cache invalidation. |

### Verification Results (all PASS — live-tested 2026-03-20)

| Test | Endpoint | Result | Notes |
|------|----------|--------|-------|
| 1A Auth register | `POST /auth/register` | ✅ PASS | userId=01KM6CX4HW641NR0PS9P92K1RX |
| 1B OTP verify | `POST /auth/verify-otp` | ✅ PASS | role=ORDERER, tokens returned |
| 1C Load create | `POST /dispatch/loads` | ✅ PASS | id=01KM6CX4Q7PB2V7ZRH44CTQ6JR |
| 1D Rate quote (no date) | `POST /pricing/quote` | ✅ PASS | ETB=625 (pickupDate defaults to now) |
| 1D Rate quote (date-only) | `POST /pricing/quote` | ✅ PASS | ETB=625 (`"2026-03-25"` accepted) |
| 1E GPS ping | `POST /location/ping` | ✅ PASS | |
| 1F OPS workqueue | `GET /data/ops/workqueue` | ✅ PASS | Returns openIncidents, openDisputeCount, pendingKycReviews, openFraudFlags, slaBreachedCount |
| 1G Driver earnings | `GET /liquidity/drivers/:id/earnings` | ✅ PASS | Requires DRIVER role token |
| 1H Public estimate | `GET /public-estimate` | ✅ PASS | Addis Ababa→Hawassa: 275km, ETB 27,500 |

**Important corrections discovered during live testing:**
- Workqueue path is `/api/v1/data/ops/workqueue` (not `/data/ops-workqueue`)
- Earnings requires DRIVER role (not ORDERER)
- `pickupDate` in `/pricing/quote` must be optional — made so via `z.union([z.string().datetime(), z.string().date()]).optional()`
- OPS_ADMIN users must be created directly in DB; OTP must be manually placed in Redis (`otp:{phone}`)
- Engines must run via `npx tsx apps/engine-X/src/index.ts` from `Backend/` root (not `node dist/index.js`)

---

## Phase 2 — isuzet_field Flutter App

### Fixes Applied

| File | Fix |
|------|-----|
| `lib/features/auth/data/models/auth_models.dart` | `AuthTokens.fromJson`: `accessToken` → `access_token`, `refreshToken` → `refresh_token`. `VerifyOtpResponse.fromJson`: parse from `data` envelope, use correct key names. |
| `lib/core/network/api_client.dart` | `_refreshToken`: body key `refreshToken` → `refresh_token`; parse `response.data['data']`; use `access_token`/`refresh_token` keys. Interceptor retry fixed to use `access_token`. |
| `lib/core/network/api_endpoints.dart` | `gpsTrack = '/location/gps'` → `'/location/ping'` (backend route name). |
| `lib/features/trips/data/models/trip_models.dart` | `GpsLocation.toJson()`: field names aligned to backend (`lat`, `lng`, `accuracy`, `altitudeM`, `speedKmh`, `headingDeg`). |
| `lib/features/auth/presentation/kyc_upload_screen.dart` | Replaced `Future.delayed(2s)` mock with real multipart Dio upload to `/identity/kyc/upload`. |
| `lib/shared/providers/offline_sync_provider.dart` | **CREATED FROM SCRATCH (KD-02).** Watches `ConnectivityMonitor.isOnline` stream. On reconnect: flushes GPS queue to `/location/ping` as `offlinePings` batch, and flushes pending deliveries. Provides `syncInProgressProvider`, `lastSyncResultProvider`, `offlineSyncWatcherProvider`, `offlineSyncServiceProvider`. |
| `lib/core/storage/secure_storage.dart` | Added `saveActiveTripId`, `getActiveTripId`, `clearActiveTripId`. |
| `lib/core/storage/local_cache.dart` | Added `clearPendingDeliveries()`. |

---

## Phase 3 — isuzet_business Flutter App

### Fixes Applied

| File | Fix |
|------|-----|
| `lib/features/orderer/data/repositories/orderer_repository.dart` | **WRONG-1 (CRITICAL):** `getCorridors()` was calling `AppConfig.dispatchBase/corridors` (`localhost:3015/dispatch/corridors`) → fixed to `AppConfig.corridorBase/corridors` (`localhost:3003/corridor/corridors`). Response parsing: raw `List` → `data['data'] ?? data`. |
| `lib/features/auth/data/auth_service.dart` | Replaced 3-step mock auth with real 2-step backend flow: `POST /auth/register` (sends OTP, returns userId) + `POST /auth/verify-otp` (returns tokens + role). Saves `access_token`, `refresh_token`, userId, role to SecureStorage. |
| `lib/shared/providers/auth_provider.dart` | Removed `sendOtp()`. `completeRegistration()` validates all fields upfront, calls `register()`, returns bool. |
| `lib/features/auth/presentation/register_screen.dart` | Post-registration navigates to `/auth/otp` (not directly to `/fleet`/`/orderer`). Fixed `!mounted` → `!context.mounted`. |
| `lib/features/auth/presentation/otp_screen.dart` | **REWRITTEN** as `ConsumerStatefulWidget`. Gets phone from `registrationStateProvider`. Calls `authServiceProvider.verifyOtp()`. Routes based on returned role (`FLEET_OWNER` → `/fleet`, `ORDERER` → `/orderer`, else → `/auth/kyc`). Uses `mounted` (State property) for async guard. |
| `lib/features/shared_screens/profile/profile_screen.dart` | Wired logout button: calls `authServiceProvider.logout()` → clears SecureStorage → navigates to `/splash`. Fixed `_buildActionButtons` to accept `WidgetRef ref`. Fixed `context.mounted` async guard. |

---

## Phase 4 — ops-dashboard (React/Vite)

### Fixes Applied — SEC-1, SEC-2 + 9 real pages

| File | Fix |
|------|-----|
| `src/store/useStore.ts` | **SEC-1:** `isAuthenticated: true` → `false`. `user: {hardcoded}` → `null`. Added `initAuth()` action: reads `accessToken` + `opsUser` from `localStorage`, rehydrates store on app start; clears corrupt data. `logout()` now also clears `opsUser` key. |
| `src/pages/LoginPage.tsx` | **SEC-2:** New file. Two-step login flow: (1) phone input → `POST /auth/register` (swallows 409 for existing users, OTP is sent); (2) OTP → `POST /auth/verify-otp`. On success: saves tokens + user to `localStorage`, calls `setUser()`, navigates to `/`. Role gate: rejects non-OPS roles. |
| `src/lib/apiClient.ts` | New shared fetch wrapper with `Authorization: Bearer` injection from `localStorage`. Exports `IDENTITY_BASE`, `CORRIDOR_BASE`, `LIQUIDITY_BASE`, `INCIDENT_BASE`, `DATA_BASE`, `FRAUD_BASE`, `DISPATCH_BASE` constants (env-configurable). `apiGet<T>()` and `apiPut<T>()` helpers. |
| `src/pages/Loads.tsx` | New. `GET /dispatch/loads` → sortable table with status badges. |
| `src/pages/Drivers.tsx` | New. `GET /data/fleet/driver-performance` → on-time %, incident count. |
| `src/pages/Incidents.tsx` | New. `GET /incident/incidents?status=&limit=50` → severity cards, status filter. |
| `src/pages/KycReview.tsx` | New. Summary from `GET /data/ops/workqueue`. Pending docs from `GET /identity/kyc/pending`. `PUT /identity/kyc/:docId/review` via inline mutation. |
| `src/pages/Finance.tsx` | New. `GET /data/financial/summary?from=...&to=...` with date range picker. 9 KPI cards. |
| `src/pages/Corridors.tsx` | New. `GET /corridor/corridors` → table with demand index progress bar. |
| `src/pages/Fraud.tsx` | New. `GET /fraud/flags?status=OPEN&limit=50` → risk score table. |
| `src/pages/Intelligence.tsx` | New. Platform summary KPI grid + live event feed (15s refresh). |
| `src/pages/Strategy.tsx` | New. `GET /corridor/zones` → zone cards with surge multiplier. |
| `src/App.tsx` | All 9 `<div>Coming Soon</div>` placeholders replaced with real component imports + routes. |

---

## Phase 5 — rate-calculator (React/Vite)

### Fixes Applied

| File | Fix |
|------|-----|
| `Backend/.../public-calculator.routes.ts` | Added `GET /api/v1/public-estimate` endpoint (no auth). Accepts `originZoneName`, `destZoneName`, `cargoType`, `weightKg`, `pickupDate`. Finds corridor by bidirectional, case-insensitive zone name match. Returns `{distanceKm, transitHours, baseRate, cargoAdjustment, seasonalAdjustment, total, minRange, maxRange, savingsVsBroker, savingsPct}` in ETB. |
| `src/pages/Index.tsx` | Fixed URL: `public-calculator/estimate` → `public-estimate` (via `VITE_CORRIDOR_API_BASE`). Fixed params: sends `originZoneName`/`destZoneName` (zone `en` labels) instead of zone IDs. **Removed fallback mock** — non-200 response now shows error toast. Parses `body.data` from `{success, data}` envelope. |
| `src/constants/data.ts` | Fresh Produce: added `maxTransitHours: 24` and `warning` — fixes "undefinedh" in ResultCard time-critical block. |
| `src/types/calculator.ts` | Added optional `savingsVsBroker` and `savingsPct` fields to `EstimateResponse`. |
| `src/components/ResultCard.tsx` | Added broker savings callout: shows `~X% savings vs traditional broker` with estimated broker cost when `savingsPct > 0`. |

---

## Phase 7 — Security Audit

### Issues Resolved

| ID | Issue | Status |
|----|-------|--------|
| SEC-1 | `isAuthenticated: true` default in useStore | ✅ FIXED (Phase 4) |
| SEC-2 | No login page / route guard always bypassed | ✅ FIXED (Phase 4) |
| SEC-5 | rate-calculator `http://localhost:3003` hardcoded | ✅ FIXED — reads `VITE_CORRIDOR_API_BASE` env var |
| ops-dashboard login URL hardcoded | `http://localhost:3001` hardcoded in LoginPage | ✅ FIXED — reads `VITE_IDENTITY_API_BASE` env var |
| SEC-6 | Firebase Admin SDK service account JSON (`isuzet-field-firebase-adminsdk-fbsvc-*.json`) not gitignored | ✅ FIXED — `Backend/.gitignore` now excludes `*firebase*adminsdk*.json` and `*service-account*.json` |
| RBAC audit | OPS endpoints in engine-data all have `preHandler: requireRole(['OPS_ADMIN', ...])` | ✅ VERIFIED — no unguarded OPS routes found |

### Issues Remaining (Known Debt)

| ID | Issue | Severity | Location |
|----|-------|----------|----------|
| SEC-3 | `baseUrl: 'http://localhost'` hardcoded in Flutter `AppConfig` | MEDIUM | `isuzet_field/lib/core/config/app_config.dart` |
| SEC-4 | Same as SEC-3 | MEDIUM | `isuzet_business/lib/core/config/app_config.dart` |
| KD-03 | Firebase/FCM push notifications not initialized | HIGH | `isuzet_field/lib/main.dart:16` |

---

## E2E Workflow Coverage (Phase 6)

**Live test results (2026-03-21): 29/29 assertions pass** (`node e2e-test.js` from LAS root)

### Test Workflows

| # | Workflow | Assertions | Result |
|---|----------|-----------|--------|
| W1 | Engine health (6 services) | 6 | ✅ |
| W2 | Driver auth (register → Redis OTP → verify → token) | 4 | ✅ |
| W3 | Orderer auth (same flow) | 4 | ✅ |
| W4 | OPS Admin (DB-seed + Redis OTP → verify → profile role) | 5 | ✅ |
| W5 | Corridor listing (auth + non-empty list) | 2 | ✅ |
| W6 | Rate estimate (public endpoint, rate value present) | 2 | ✅ |
| W7 | Load posting (orderer creates load, returns id) | 2 | ✅ |
| W8 | Ops workqueue (numeric KPI counts) | 2 | ✅ |
| W9 | Profile trust score (kycTier / trustTier present) | 2 | ✅ |

### Driver Workflow (isuzet_field)
```
Register (POST /auth/register) ✅ API contract fixed (Phase 2)
  → OTP verify (POST /auth/verify-otp) ✅ Token key names fixed (Phase 2)
  → KYC upload (POST /identity/kyc/upload) ✅ Real multipart upload wired (Phase 2)
  → View loads (GET /dispatch/loads) ✅ Auth interceptor fixed (Phase 2)
  → Accept offer (POST /dispatch/offer/:id/accept) ✅ Auth works
  → GPS ping (POST /location/ping) ✅ Backend requireAuth() fix (Phase 1) + endpoint name fix (Phase 2)
  → Offline GPS queue → flush on reconnect ✅ offline_sync_provider created (Phase 2)
  → Deliver stop (POST /trips/:id/deliver-stop) ✅ Auth works
  → View earnings (GET /liquidity/drivers/:id/earnings) ✅ Verified (Phase 1)
```

### Orderer Workflow (isuzet_business)
```
Register (POST /auth/register) ✅ Auth flow rebuilt (Phase 3)
  → OTP verify (POST /auth/verify-otp) ✅ Response parsing fixed (Phase 3)
  → View corridors (GET /corridor/corridors) ✅ WRONG-1 endpoint fixed (Phase 3)
  → Post load (POST /dispatch/loads) ✅ Auth + schema fixed (Phase 6)
  → Track shipment (SSE) ✅ TrackingService + TrackShipmentScreen implemented (Phase 3)
  → Logout ✅ Wired to /auth/logout + SecureStorage clear (Phase 3)
```

### OPS Admin Workflow (ops-dashboard)
```
Navigate to dashboard → redirected to /login ✅ SEC-1/SEC-2 fixed (Phase 4)
  → Enter phone → POST /auth/register (409 swallowed for existing users) ✅
  → Enter OTP → POST /auth/verify-otp ✅
  → Role check (OPS_ADMIN / SUPER_ADMIN / OPS_VIEWER) ✅
  → View workqueue (GET /data/ops/workqueue) ✅ Returns live data
  → View Loads, Drivers, Incidents, KYC, Finance, Corridors, Fraud, Intelligence, Strategy ✅ All 9 real pages (Phase 4)
  → Logout → clears localStorage → redirected to /login ✅
```

### Public Rate Calculator
```
Select zones → sends originZoneName/destZoneName ✅ Fixed (Phase 5)
  → GET /api/v1/public-estimate (new endpoint) ✅ Added (Phase 5)
  → Corridor lookup by zone name ✅ Bidirectional, case-insensitive
  → Returns ETB estimate with seasonal adjustment ✅
  → Broker savings comparison shown ✅ New feature
  → Fresh Produce time-critical: shows "24h max transit" ✅ Fixed (Phase 5)
```

---

## Pre-Pilot Final Pass — Changes Applied

### Backend Fixes

| File | Fix |
|------|-----|
| `engine-identity/src/routes/identity.routes.ts` | Added `GET /api/v1/identity/kyc/pending` (OPS role, KycDocument list without user include — model has no user relation). Added `GET /api/v1/identity/drivers` (OPS role, includes user select with valid fields only). |
| `engine-dispatch/src/routes/load.routes.ts` | Added `GET /api/v1/dispatch/loads` for OPS dashboard. Fixed `offeredRateEtb` → `systemQuoteEtb`/`finalRateEtb`. |
| `engine-data/src/routes/data.routes.ts` | Fixed `POST /fleet/expense`: `generateId('exp')` generated 30-char string exceeding `VarChar(26)` on Expense.id → changed to `ulid()`. Made `from`/`to` optional in `GET /fleet/utilization` (defaults: 30-day window). |
| `engine-identity/src/routes/auth.routes.ts` | Removed `businessLicense` field from FleetOwner create (field not in schema). |
| `engine-data/package.json`, `engine-fraud/package.json`, `engine-behavior/package.json` | Created missing package.json files — pnpm filter couldn't find these engines. |
| `scripts/start-all.ps1` | Added missing `engine-dispatch` (port 3015) to the `$apps` array. |
| `scripts/create-ops-admin.js` | **CREATED** — seeds OPS_ADMIN user directly to PostgreSQL + sets Redis OTP via docker exec. |

### OPS Dashboard Fixes

| File | Fix |
|------|-----|
| `ops-dashboard/src/pages/Overview.tsx` | Replaced hardcoded mock data with real `GET /data/platform/summary` call. |
| `ops-dashboard/src/pages/Drivers.tsx` | Changed endpoint from `/data/fleet/driver-performance` to `/identity/drivers` (OPS-level). Updated Driver interface to match identity response. |
| `ops-dashboard/src/pages/Finance.tsx` | Fixed `FinancialSummary` interface: `totalVolumeEtb`, `totalCommissionEtb`, `totalEscrowHeldEtb`, `avgTransactionEtb`, `transactionCount`. |
| `ops-dashboard/src/pages/Loads.tsx` | Fixed field names: `offeredRateEtb` → `systemQuoteEtb`/`finalRateEtb`. |

### FCM Push Notifications

| File | Fix |
|------|-----|
| `isuzet_business/lib/core/services/notification_service.dart` | **CREATED** — full FCM service: `initialize()`, `registerTokenAfterLogin()`, `unregisterToken()`, foreground handler. |
| `isuzet_business/lib/main.dart` | Added `Firebase.initializeApp()` and `NotificationService.initialize()`. |
| `isuzet_business/lib/features/auth/data/auth_service.dart` | Calls `NotificationService.registerTokenAfterLogin()` after OTP verification. |
| `isuzet_field/lib/features/auth/data/auth_service.dart` | Same — `registerTokenAfterLogin()` after OTP verification. |

### Pilot Tooling & Documentation

| File | Description |
|------|-------------|
| `OPS_RUNBOOK.md` | Engine port reference, quick start, common ops actions, troubleshooting, pilot checklist. |
| `.gitignore` (LAS root) | Covers .env, keys/*.pem, firebase-service-account.json, node_modules, dist, build artifacts. |

### E2E Test Results (Pre-Pilot Final)

**`Backend/tests/e2e/full-flow.ps1` — 57/57 assertions pass** (2026-03-21)

Key test groups:
- 1.x Engine health: ✅ 14/14 engines
- 2.x User registration (fleet owner, driver, orderer, owner-operator): ✅
- 3.x–16.x All workflow tests: ✅
- 17.x Fleet management (expense, utilization): ✅ (fixed VarChar/optional param bugs)

---

## Remaining Known Debt Summary

| ID | Description | Severity | Owner |
|----|-------------|----------|-------|
| KD-01 | Agent load posting: `agentId` missing from Load model, no `/agent/post-load` endpoint | CRITICAL | Backend |
| SEC-3/4 | Flutter `AppConfig.baseUrl` hardcoded `'http://localhost'` — not overridable without `--dart-define` at build time | MEDIUM | isuzet_field, isuzet_business |

**Resolved in Pre-Pilot Final Pass:**
- ~~KD-03~~ FCM push notifications: fully initialized in both Flutter apps (isuzet_field, isuzet_business)
- ~~KD-05~~ SSE tracking: `TrackingService` + `TrackShipmentScreen` implemented (Phase 3)
- ~~KD-06~~ Profile screen: wired to real API data (Phase 3)
- ~~KD-07~~ 9 ops-dashboard placeholder pages: all replaced with real API calls (Phase 4)
- ~~SEC-6~~ Firebase Admin SDK JSON: added to `.gitignore`
- ~~Missing package.json~~ engine-data, engine-fraud, engine-behavior now have package.json
- ~~Fleet expense P2000~~ Expense.id VarChar(26) overflow fixed (ulid() vs generateId prefix)

---

## Architecture Notes

### Auth Flow (all apps)
- **No `/auth/login` endpoint exists.** The only flow is: `POST /auth/register` (triggers OTP send; returns 409 if user already exists) → `POST /auth/verify-otp` (returns `access_token`, `refresh_token`, user object).
- OPS_ADMIN accounts must be created directly in the database; their OTP must be manually inserted into Redis (`otp:{phone}`) before login.

### Response Envelope
All backend responses use `{success: bool, data: {...}}` or `{success: bool, error: {code, message}}`. Frontends must parse from `response.data['data']` (Flutter/Dio) or `body.data` (React/fetch).

### JWT Key Names
Backend returns `access_token` / `refresh_token` (snake_case). All frontends have been updated to use these exact names.

### Rate Cards
Active rate cards require `effectiveTo: null` (open-ended). The query in `public-calculator.service.ts` uses `effectiveTo IS NULL`. Seeded cards must not have a future `effectiveTo` date.

### GPS Endpoint
`POST /location/ping` (not `/location/gps`). The engine-location routes now correctly call `requireAuth()` (middleware instance, not the factory function).

### OPS Workqueue Endpoint
`GET /api/v1/data/ops/workqueue` (not `/data/ops-workqueue`). Requires OPS_ADMIN, SUPER_ADMIN, or OPS_VIEWER role.

### Earnings Endpoint
`GET /api/v1/liquidity/drivers/:id/earnings` requires **DRIVER** role token (not ORDERER).

### Running Engines in Development
Engines must be started from the `Backend/` root via:
```
npx tsx apps/engine-<name>/src/index.ts
```
Running `node dist/index.js` fails with `MODULE_NOT_FOUND` for `@ruit/shared-types` because monorepo workspace symlinks are not present in the compiled output directory.

### JWT Expiry
Access tokens expire in 900 seconds (15 minutes). Test scripts must obtain a fresh token immediately before use.
