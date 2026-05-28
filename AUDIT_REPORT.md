# ISUZET Platform — Integration Audit Report
**Generated:** 2026-03-20
**Auditor:** Claude Code (Phase 0 Audit)
**Scope:** All 5 codebases — Backend, isuzet_field, isuzet_business, ops-dashboard, rate-calculator

---

## SUMMARY

| Category | Count |
|----------|-------|
| Files with mock data | 8 |
| Hardcoded values requiring API replacement | 14 |
| TODO/FIXME items representing missing functionality | 7 |
| Security issues | 5 |
| Missing features (KNOWN_DEBT) | 7 |
| Wrong API endpoint calls | 2 |

---

## 1. FILES WITH MOCK DATA

### 1.1 isuzet_field

| File | Line(s) | Issue |
|------|---------|-------|
| `lib/features/auth/presentation/kyc_upload_screen.dart` | 90 | `TODO: Call MultipartUpload API to /identity/kyc/upload` — KYC upload is a `Future.delayed(2s)` stub |
| `lib/main.dart` | 16 | `TODO: Initialize Firebase when backend is ready` — Firebase and FCM are commented out |

**Notes:**
- `trip_service.dart:55` and `delivery_confirm_screen.dart:14,21,547` contain CRITICAL comments about stopId but the code itself is correct — these are safety documentation, not mock data.
- `List.generate()` calls in `otp_screen.dart`, `onboarding_screen.dart`, `trust_score_widget.dart`, and `otp_input.dart` are legitimate UI widget generation (for OTP digit boxes and progress indicators), NOT mock data.

### 1.2 isuzet_business

| File | Line(s) | Issue |
|------|---------|-------|
| `lib/features/shared_screens/profile/profile_screen.dart` | 71 | Hardcoded company name: `'Tech Solutions Ethiopia'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 83 | Hardcoded TIN: `'500123456789'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 84 | Hardcoded email: `'contact@techsolutions.et'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 85 | Hardcoded phone: `'+251 911 234 567'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 96 | Hardcoded business registration: `'12345/2020'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 97 | Hardcoded payment reliability score: `'9.2/10'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 98 | Hardcoded registered trucks count: `'24'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 99 | Hardcoded active drivers count: `'28'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 100 | Hardcoded total deliveries: `'1,247'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 125 | Hardcoded average order value: `'ETB 45,230'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 126 | Hardcoded total spent: `'ETB 20,645,000'` |
| `lib/features/shared_screens/profile/profile_screen.dart` | 182 | `TODO: Implement edit profile` — button is a no-op |
| `lib/features/shared_screens/profile/profile_screen.dart` | 195 | `TODO: Implement logout` — logout button is a no-op |

### 1.3 ops-dashboard

| File | Line(s) | Issue |
|------|---------|-------|
| `src/pages/Overview.tsx` | 15–19 | `mockChartData` — hardcoded hourly load volume chart data, never fetched from API |
| `src/pages/Overview.tsx` | 27–35 | `engines` array — hardcoded list with static statuses (Corridor hardcoded as `'degraded'`); never fetched from `GET /health/engines` |
| `src/pages/Overview.tsx` | 36–49 | `queryFn` returns hardcoded KPI object (activeLoads: 124, activeDrivers: 842, etc.) — no actual API call made |
| `src/pages/Workqueue.tsx` | 25–56 | `mockWorkItems` — 4 hardcoded work items (SLA breach, unmatched load, KYC, fraud flag) |
| `src/pages/Workqueue.tsx` | 83–89 | `queryFn` returns `mockWorkItems` with a comment showing what the real URL should be; never actually calls the API |
| `src/store/useStore.ts` | 8–13 | User hardcoded as `{ id: '1', name: 'Abebe Kebede', role: 'SUPER_ADMIN' }` with `isAuthenticated: true` — dashboard always accessible without login |
| `src/components/shared/EthiopiaMap.tsx` | 25–34 | `nodes` array — 9 city nodes with hardcoded `volume` values |
| `src/components/shared/EthiopiaMap.tsx` | 36–45 | `corridors` array — 8 corridors with hardcoded `health` and `volume` values; never fetched from `GET /corridor/health` |

### 1.4 rate-calculator

| File | Line(s) | Issue |
|------|---------|-------|
| `src/pages/Index.tsx` | 83–110 | Fallback calculation block: if API returns non-200, code calculates a fake estimate locally using `getDistance()` and hardcoded multipliers. This violates Rule 1 (never replace mock with mock). |

---

## 2. HARDCODED VALUES THAT SHOULD COME FROM API

| Location | Value | Should Come From |
|----------|-------|-----------------|
| `ops-dashboard/src/pages/Overview.tsx:36–49` | KPI numbers (124 loads, 842 drivers, 86 in-transit, 14 incidents) | `GET http://localhost:3008/api/v1/data/platform-summary` |
| `ops-dashboard/src/pages/Overview.tsx:15–19` | Chart data (posted/matched/delivered per hour) | `GET http://localhost:3008/api/v1/data/platform-summary` (hourly breakdown) |
| `ops-dashboard/src/pages/Overview.tsx:27–35` | Engine health statuses | `GET http://localhost:3011/api/v1/health/engines` |
| `ops-dashboard/src/components/shared/EthiopiaMap.tsx:36–45` | Corridor health scores and volumes | `GET http://localhost:3003/api/v1/corridor/health` |
| `ops-dashboard/src/store/useStore.ts:8–13` | Authenticated user, role, name | `GET http://localhost:3001/api/v1/identity/me` (after real login) |
| `isuzet_business/.../profile_screen.dart:71–100` | Company name, TIN, email, phone, scores, counts | `GET http://localhost:3001/api/v1/identity/me` |
| `isuzet_business/.../profile_screen.dart:125–126` | Average order value, total spent | `GET http://localhost:3001/api/v1/identity/me` or orderer stats endpoint |
| `rate-calculator/src/pages/Index.tsx:83–110` | ETB estimate (fallback) | `GET http://localhost:3003/api/v1/public-calculator/estimate` (no fallback allowed) |

---

## 3. TODO/FIXME REPRESENTING MISSING FUNCTIONALITY

| Location | Line | Description | Severity |
|----------|------|-------------|----------|
| `isuzet_field/lib/main.dart` | 16 | Firebase not initialized — push notifications completely disabled | HIGH |
| `isuzet_field/lib/features/auth/presentation/kyc_upload_screen.dart` | 90 | KYC upload is a fake 2-second delay; real multipart POST to `/identity/kyc/upload` not implemented | HIGH |
| `isuzet_field` (missing file) | — | `lib/shared/providers/offline_sync_provider.dart` does not exist — offline GPS/delivery queue never flushed on reconnect | HIGH |
| `isuzet_business` (missing file) | — | `lib/features/tracking/presentation/track_shipment_screen.dart` does not exist — SSE tracking screen for orderers unimplemented | MEDIUM |
| `isuzet_business/.../profile_screen.dart` | 182 | Edit profile button is a no-op | LOW |
| `isuzet_business/.../profile_screen.dart` | 195 | Logout button is a no-op — does not clear SecureStorage or redirect to login | HIGH |
| `ops-dashboard/src/App.tsx` | 27–41 | 9 pages are placeholder `"Coming Soon"` divs: Loads, Drivers, Incidents, KYC, Finance, Corridors, Fraud, Intelligence, Strategy | HIGH |

---

## 4. WRONG ENDPOINT CALLS

| Location | Current Call | Correct Call | Impact |
|----------|-------------|-------------|--------|
| `isuzet_business/.../orderer_repository.dart:14` | `GET ${AppConfig.dispatchBase}/corridors` → `http://localhost:3015/api/v1/dispatch/corridors` | `GET http://localhost:3003/api/v1/corridor/corridors` | CRITICAL — corridor dropdown will always fail |
| `ops-dashboard/src/pages/Workqueue.tsx:86` | Not called (returns mockWorkItems) | `GET http://localhost:3008/api/v1/data/ops-workqueue` | HIGH — workqueue never shows real data |

---

## 5. SECURITY ISSUES

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| SEC-1 | `ops-dashboard/src/store/useStore.ts:11` | `isAuthenticated: true` as default — the entire ops dashboard is accessible without any login. A user who navigates to the URL is immediately logged in as SUPER_ADMIN. | CRITICAL |
| SEC-2 | `ops-dashboard/src/App.tsx:17` | No login route guard — `DashboardLayout` renders for all routes without checking `isAuthenticated`. The `/login` route is a non-functional placeholder. | CRITICAL |
| SEC-3 | `isuzet_field/lib/core/config/app_config.dart:2` | `baseUrl` is a hardcoded `'http://localhost'` string constant — cannot be overridden for production deployment without a code change. | MEDIUM |
| SEC-4 | `isuzet_business/lib/core/config/app_config.dart:2` | Same issue — `baseUrl` hardcoded `'http://localhost'`. | MEDIUM |
| SEC-5 | `rate-calculator/src/pages/Index.tsx:76` | API URL `http://localhost:3003` hardcoded as a string literal — not read from `import.meta.env.VITE_API_BASE_URL`. | MEDIUM |

**Positive findings (not issues):**
- Both Flutter apps correctly use `flutter_secure_storage` for token storage (not SharedPreferences). ✓
- Both Flutter apps have token refresh logic in `ApiClient` interceptor. ✓
- No hardcoded API secrets (sk_, pk_, AIza) found in any frontend. ✓
- ops-dashboard `logout()` correctly clears localStorage tokens. ✓

---

## 6. ENDPOINTS CALLED BY FRONTENDS — VERIFICATION STATUS

| Endpoint | Called By | Status |
|----------|-----------|--------|
| `POST /api/v1/auth/register` | isuzet_field, isuzet_business | UNVERIFIED — backend not started |
| `POST /api/v1/auth/verify-otp` | isuzet_field, isuzet_business | UNVERIFIED |
| `POST /api/v1/auth/refresh` | isuzet_field (api_client.dart) | UNVERIFIED |
| `GET /api/v1/identity/me` | isuzet_field, isuzet_business | UNVERIFIED |
| `GET /api/v1/identity/trust-breakdown` | isuzet_field (dashboard) | UNVERIFIED |
| `GET /api/v1/corridor/corridors` | isuzet_business (orderer) | UNVERIFIED — **wrong URL currently used** |
| `GET /api/v1/public-calculator/estimate` | isuzet_business, rate-calculator | UNVERIFIED |
| `POST /api/v1/dispatch/loads` | isuzet_business (orderer) | UNVERIFIED |
| `GET /api/v1/dispatch/loads` | isuzet_field, isuzet_business | UNVERIFIED |
| `GET /api/v1/dispatch/loads/:id` | isuzet_field | UNVERIFIED |
| `POST /api/v1/dispatch/offer/:loadId/accept` | isuzet_field | UNVERIFIED |
| `GET /api/v1/trips/:tripId` | isuzet_field | UNVERIFIED |
| `POST /api/v1/trips/:tripId/deliver-stop` | isuzet_field | UNVERIFIED |
| `POST /api/v1/location/gps` | isuzet_field | UNVERIFIED |
| `GET /api/v1/location/track/:tripId` (SSE) | isuzet_business (not yet implemented) | DEFERRED — SSE screen missing |
| `GET /api/v1/liquidity/drivers/:id/earnings` | isuzet_field | UNVERIFIED |
| `GET /api/v1/health/engines` | ops-dashboard (not yet wired) | DEFERRED — page is placeholder |
| `GET /api/v1/data/ops-workqueue` | ops-dashboard (stubbed) | DEFERRED — returns mock |
| `GET /api/v1/data/platform-summary` | ops-dashboard (stubbed) | DEFERRED — returns mock |
| `GET /api/v1/incidents` | ops-dashboard | DEFERRED — page is placeholder |
| `GET /api/v1/identity/kyc/documents` | ops-dashboard | DEFERRED — page is placeholder |
| `GET /api/v1/liquidity/exposure` | ops-dashboard | DEFERRED — page is placeholder |
| `GET /api/v1/fraud/flags` | ops-dashboard | DEFERRED — page is placeholder |
| `GET /api/v1/strategy/versions` | ops-dashboard | DEFERRED — page is placeholder |

---

## 7. KNOWN DEBT SUMMARY (from Backend/KNOWN_DEBT.md + new findings)

| ID | Description | Severity | Source |
|----|-------------|----------|--------|
| KD-01 | Agent load posting: `agentId` missing from Load model, AgentClient model undefined, no `/agent/post-load` endpoint | CRITICAL | Backend/KNOWN_DEBT.md |
| KD-02 | `isuzet_field` offline sync provider does not exist — GPS/delivery queue never flushed on reconnect | HIGH | Phase 0 Audit |
| KD-03 | Firebase push notifications not initialized in `isuzet_field/main.dart` | HIGH | Phase 0 Audit |
| KD-04 | KYC upload API call not implemented in `isuzet_field/kyc_upload_screen.dart` | HIGH | Phase 0 Audit |
| KD-05 | SSE tracking screen (`track_shipment_screen.dart`) missing in `isuzet_business` | MEDIUM | Phase 0 Audit |
| KD-06 | Profile screen in `isuzet_business` shows hardcoded data; real `/identity/me` call not wired | HIGH | Phase 0 Audit |
| KD-07 | 9 ops-dashboard pages are "Coming Soon" placeholders | HIGH | Phase 0 Audit |
| KD-08 | ops-dashboard has no real authentication — always `isAuthenticated: true` | CRITICAL | Phase 0 Audit |

---

## 8. FIXES REQUIRED BEFORE PHASE 1

None — Phase 0 is audit only. Phase 1 starts with backend verification.

---

## PHASE READINESS

| Phase | Codebase | Status |
|-------|----------|--------|
| Phase 0 | All | ✅ COMPLETE |
| Phase 1 | Backend | PENDING — requires docker-compose and engine startup |
| Phase 2 | isuzet_field | PENDING |
| Phase 3 | isuzet_business | PENDING |
| Phase 4 | ops-dashboard | PENDING |
| Phase 5 | rate-calculator | PENDING |
