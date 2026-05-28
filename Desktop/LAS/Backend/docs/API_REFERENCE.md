# RUIT CBE LaaS Platform — API Reference

Complete API documentation for the RUIT CBE (Central Backend Engine) Platform.

## Table of Contents

- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Identity Engine (3001)](#identity-engine-3001)
- [Strategy Engine (3010)](#strategy-engine-3010)
- [Optimizer Engine (3002)](#optimizer-engine-3002)
- [Liquidity Engine (3004)](#liquidity-engine-3004)
- [Corridor Engine (3003)](#corridor-engine-3003)
- [Shock Engine (3005)](#shock-engine-3005)
- [Incident Engine (3006)](#incident-engine-3006)
- [Behavior Engine (3007)](#behavior-engine-3007)
- [Fraud Engine (3009)](#fraud-engine-3009)
- [Data Engine (3008)](#data-engine-3008)
- [Health Engine (3011)](#health-engine-3011)
- [Twin Engine (3012)](#twin-engine-3012)
- [Notification Engine (3013)](#notification-engine-3013)
- [Error Codes](#error-codes)

---

## Base URLs

| Engine | Port | Base URL | Health Endpoint |
|--------|------|----------|-----------------|
| Identity | 3001 | `http://localhost:3001/api/v1` | `/identity/health` |
| Optimizer | 3002 | `http://localhost:3002/api/v1` | `/optimizer/health` |
| Corridor | 3003 | `http://localhost:3003/api/v1` | `/corridor/health` |
| Liquidity | 3004 | `http://localhost:3004/api/v1` | `/liquidity/health` |
| Shock | 3005 | `http://localhost:3005/api/v1` | `/shock/health` |
| Incident | 3006 | `http://localhost:3006/api/v1` | `/incident/health` |
| Behavior | 3007 | `http://localhost:3007/api/v1` | `/behavior/health` |
| Data | 3008 | `http://localhost:3008/api/v1` | `/data/health` |
| Fraud | 3009 | `http://localhost:3009/api/v1` | `/fraud/health` |
| Strategy | 3010 | `http://localhost:3010/api/v1` | `/strategy/health` |
| Health | 3011 | `http://localhost:3011/api/v1` | `/health/health` |
| Twin | 3012 | `http://localhost:3012/api/v1` | `/twin/health` |
| Notifications | 3013 | `http://localhost:3013/api/v1` | `/notifications/health` |

---

## Authentication

All endpoints (except registration, OTP verification, and health checks) require JWT authentication via Bearer token in the Authorization header.

### 1. Register Account

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "+251911234567",
  "full_name": "John Doe",
  "role": "FLEET_OWNER"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "usr_01H...",
    "message": "OTP sent to phone"
  }
}
```

### 2. Verify OTP

```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+251911234567",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

### Available Roles

| Role | Description |
|------|-------------|
| `FLEET_OWNER` | Manages trucks, drivers, views payouts |
| `DRIVER` | Accepts assignments, GPS tracking, POD upload |
| `ORDERER` | Creates loads, tracks shipments, manages payments |
| `OPS_ADMIN` | Operations management, incident resolution |
| `OPS_VIEWER` | Read-only operations access |
| `FINANCE_OPS` | Financial reconciliation, COD verification |
| `SUPER_ADMIN` | Full access, Tier 5 approval, system config |
| `SYSTEM` | Internal system service account |

### Using Tokens

```http
GET /api/v1/identity/users/me
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Identity Engine (3001)

Base: `http://localhost:3001/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register new account |
| POST | `/auth/verify-otp` | None | Verify OTP and get tokens |
| POST | `/auth/refresh` | Refresh Token | Get new access token |
| POST | `/auth/logout` | Bearer | Invalidate tokens |
| GET | `/auth/phone/:phone` | None | Check if phone exists |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/users` | Bearer | List users (OPS+) |
| GET | `/identity/users/:id` | Bearer | Get user by ID |
| PUT | `/identity/users/:id` | Bearer | Update user profile |
| DELETE | `/identity/users/:id` | Bearer | Soft delete user |
| GET | `/identity/users/me` | Bearer | Get current user |

### Fleet Owners

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/fleet-owners` | Bearer | List fleet owners |
| GET | `/identity/fleet-owners/:id` | Bearer | Get fleet owner |
| PUT | `/identity/fleet-owners/:id` | Bearer | Update fleet owner |
| GET | `/identity/fleet-owners/:id/trust` | Bearer | Get trust score |

### Drivers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/drivers` | Bearer | List drivers |
| GET | `/identity/drivers/:id` | Bearer | Get driver |
| POST | `/identity/drivers` | Bearer | Create driver (FLEET_OWNER) |
| PUT | `/identity/drivers/:id` | Bearer | Update driver |
| GET | `/identity/drivers/:id/trust` | Bearer | Get driver trust |

### Orderers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/orderers` | Bearer | List orderers |
| GET | `/identity/orderers/:id` | Bearer | Get orderer |
| PUT | `/identity/orderers/:id` | Bearer | Update orderer |

### Trucks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/trucks` | Bearer | List trucks |
| GET | `/identity/trucks/:id` | Bearer | Get truck |
| POST | `/identity/trucks` | Bearer | Register truck (FLEET_OWNER) |
| PUT | `/identity/trucks/:id` | Bearer | Update truck |
| DELETE | `/identity/trucks/:id` | Bearer | Soft delete truck |

### KYC Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/kyc-documents` | Bearer | List KYC docs |
| POST | `/identity/kyc-documents` | Bearer | Upload KYC document |
| GET | `/identity/kyc-documents/:id` | Bearer | Get document |
| PUT | `/identity/kyc-documents/:id/review` | OPS_ADMIN | Review document |

### Trust Scoring

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/trust/score/:type/:id` | Bearer | Get trust score |
| GET | `/identity/trust/history/:type/:id` | Bearer | Get trust history |
| POST | `/identity/trust/recalculate/:type/:id` | OPS_ADMIN | Recalculate trust |

---

## Strategy Engine (3010)

Base: `http://localhost:3010/api/v1`

### Strategy Versions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/strategy/versions` | Bearer | List strategy versions |
| POST | `/strategy/versions` | SUPER_ADMIN | Create new version |
| GET | `/strategy/versions/active` | Bearer | Get active strategy |
| PUT | `/strategy/versions/:id/activate` | SUPER_ADMIN | Activate version |
| PUT | `/strategy/versions/:id/deprecate` | SUPER_ADMIN | Deprecate version |

### Commission Configs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/strategy/commissions` | Bearer | List commission configs |
| POST | `/strategy/commissions` | OPS_ADMIN | Create commission config |
| GET | `/strategy/commissions/:id` | Bearer | Get commission config |
| PUT | `/strategy/commissions/:id` | OPS_ADMIN | Update commission config |

### Rate Cards

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/strategy/rate-cards` | Bearer | List rate cards |
| POST | `/strategy/rate-cards` | OPS_ADMIN | Create rate card |
| GET | `/strategy/rate-cards/:corridorId/active` | Bearer | Get active rate for corridor |

---

## Optimizer Engine (3002)

Base: `http://localhost:3002/api/v1`

### Pricing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/optimizer/quote` | Bearer | Get price quote for load |
| POST | `/optimizer/pricing/calculate` | Bearer | Calculate pricing |
| GET | `/optimizer/pricing/factors/:corridorId` | Bearer | Get pricing factors |

### Loads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/optimizer/loads` | Bearer | List loads |
| POST | `/optimizer/loads` | Bearer | Create load (ORDERER) |
| GET | `/optimizer/loads/:id` | Bearer | Get load details |
| PUT | `/optimizer/loads/:id` | Bearer | Update load |
| PUT | `/optimizer/loads/:id/cancel` | Bearer | Cancel load |
| PUT | `/optimizer/loads/:id/negotiate` | Bearer(Driver/Fleet) | Negotiate rate |

### Assignments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/optimizer/assignments` | Bearer | List assignments |
| GET | `/optimizer/assignments/suggested` | Driver | Get suggested assignments (WDM) |
| POST | `/optimizer/assignments/:id/accept` | Driver | Accept assignment |
| POST | `/optimizer/assignments/:id/reject` | Driver | Reject assignment |
| GET | `/optimizer/assignments/:id` | Bearer | Get assignment details |
| PUT | `/optimizer/assignments/:id/status` | Bearer | Update assignment status |

### WDM (Winning Driver Model)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/optimizer/wdm/match` | Bearer | Manual WDM trigger |
| GET | `/optimizer/wdm/pool/:loadId` | Bearer | Get driver pool for load |
| POST | `/optimizer/wdm/reroute` | OPS_ADMIN | Force re-route |

---

## Liquidity Engine (3004)

Base: `http://localhost:3004/api/v1`

### Escrow

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/liquidity/escrow/hold` | Bearer | Hold funds in escrow |
| POST | `/liquidity/escrow/release` | Bearer | Release escrow to fleet |
| GET | `/liquidity/escrow/:loadId` | Bearer | Get escrow status |
| POST | `/liquidity/escrow/:loadId/return` | OPS_ADMIN | Return funds to orderer |

### Exposure Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/liquidity/exposure/:type/:id` | Bearer | Get exposure for entity |
| POST | `/liquidity/exposure/caps` | OPS_ADMIN | Set exposure cap |
| GET | `/liquidity/exposure/caps/:type/:id` | Bearer | Get exposure cap |

### COD (Cash on Delivery)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/finance/cod/pending` | Bearer | List pending CODs |
| GET | `/finance/cod/:loadId` | Bearer | Get COD status |
| POST | `/finance/cod/:loadId/collect` | Driver | Mark COD collected |
| POST | `/finance/cod/:loadId/verify` | Bearer | Verify COD amount |
| POST | `/finance/cod/:loadId/remit` | OPS_ADMIN | Mark COD remitted |

### Payouts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/liquidity/payouts/pending` | Bearer | List pending payouts |
| GET | `/liquidity/payouts/:fleetOwnerId` | Bearer | Get payout history |
| POST | `/liquidity/payouts/:id/process` | FINANCE_OPS | Process payout |

---

## Corridor Engine (3003)

Base: `http://localhost:3003/api/v1`

### Corridors

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/corridor/corridors` | Bearer | List corridors |
| GET | `/corridor/corridors/:id` | Bearer | Get corridor details |
| POST | `/corridor/corridors` | SUPER_ADMIN | Create corridor |
| PUT | `/corridor/corridors/:id` | OPS_ADMIN | Update corridor |
| PUT | `/corridor/corridors/:id/freeze` | OPS_ADMIN | Freeze corridor |
| PUT | `/corridor/corridors/:id/unfreeze` | OPS_ADMIN | Unfreeze corridor |

### Density & Health Scoring

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/corridor/corridors/:id/density` | Bearer | Get density index |
| POST | `/corridor/corridors/:id/health-score` | OPS_ADMIN | Override health score |
| GET | `/corridor/corridors/:id/health-score` | Bearer | Get health score |

### Snapshots (Time-Series Data)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/corridor/snapshots/manual` | OPS_ADMIN | Trigger manual snapshot |
| GET | `/corridor/snapshots/:corridorId` | Bearer | Get corridor snapshots |
| GET | `/corridor/snapshots/latest/:corridorId` | Bearer | Get latest snapshot |

### Strategic Corridors

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/corridor/strategic` | Bearer | List strategic corridors |
| POST | `/corridor/:id/mark-strategic` | OPS_ADMIN | Mark as strategic |

### Checkpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/corridor/checkpoints/:corridorId` | Bearer | List checkpoints |
| POST | `/corridor/checkpoints` | OPS_ADMIN | Add checkpoint |

---

## Shock Engine (3005)

Base: `http://localhost:3005/api/v1`

### Shock Mode

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shock/health` | None | Health check |
| GET | `/shock/status` | Bearer | Get active shock status |
| POST | `/shock/activate` | OPS_ADMIN | Manually activate shock mode |
| POST | `/shock/deactivate/:id` | OPS_ADMIN | Deactivate shock event |
| GET | `/shock/history` | Bearer | Get shock event history |

### Auto-Triggers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shock/auto-triggers` | SUPER_ADMIN | List auto-trigger configs |
| POST | `/shock/auto-triggers/config` | SUPER_ADMIN | Configure auto-trigger |
| PUT | `/shock/auto-triggers/:id` | SUPER_ADMIN | Update auto-trigger |

### Severity Levels

| Level | Name | Margin Floor | Band Max | Description |
|-------|------|--------------|----------|-------------|
| 0 | Normal | base | x1.15 | Standard operation |
| 1 | Advisory | +5% | x1.15 | Early warning |
| 2 | Moderate | +15% | x1.10 | Reduced flexibility |
| 3 | Severe | +30% | x1.05 | Limited negotiation |
| 4 | Critical | +50% | x1.00 | Fixed pricing |

---

## Incident Engine (3006)

Base: `http://localhost:3006/api/v1`

### Incidents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/incident/incidents` | Bearer | List incidents |
| POST | `/incident/incidents` | Bearer | Create incident |
| GET | `/incident/incidents/:id` | Bearer | Get incident details |
| PUT | `/incident/incidents/:id/transition` | Bearer | Change incident state |
| PUT | `/incident/incidents/:id/assign` | OPS_ADMIN | Assign to resolver |
| GET | `/incident/incidents/:id/timeline` | Bearer | Get incident timeline |

### Incident Types

- ACCIDENT
- CARGO_DAMAGE
- BREAKDOWN
- DISPUTE_PROVIDER
- DISPUTE_ORDERER
- THEFT
- POLICE_STOP
- CUSTOMS_DELAY
- WEATHER_DELAY
- FUEL_SHORTAGE
- DRIVER_ABSENT

### Evidence

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/incident/evidence` | Bearer | Submit evidence |
| GET | `/incident/evidence/:id` | Bearer | Get evidence |
| GET | `/incident/:id/evidence` | Bearer | List incident evidence |

### Disputes Dashboard (OPS)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ops/disputes` | OPS_ADMIN/OPS_VIEWER | Disputes dashboard |
| GET | `/ops/disputes/sla-breached` | OPS_ADMIN | SLA-breached disputes |

### State Machine

Valid transitions:
- OPEN → UNDER_INVESTIGATION → EVIDENCE_COLLECTION → AWAITING_RESOLUTION → RESOLVED → CLOSED
- OPEN → ESCALATED → AWAITING_RESOLUTION
- Any → CLOSED (SUPER_ADMIN only)

---

## Behavior Engine (3007)

Base: `http://localhost:3007/api/v1`

### Behavioral Signals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/behavior/signals/:entityType/:entityId` | Bearer | Get behavioral signals |
| POST | `/behavior/signals` | SYSTEM | Report behavioral signal |
| GET | `/behavior/anomalies/:entityType/:entityId` | Bearer | Get anomaly flags |

### Anomaly Detection

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/behavior/anomalies/detect` | SYSTEM | Trigger anomaly detection |
| GET | `/behavior/anomalies/recent` | OPS_ADMIN | Recent anomalies |
| PUT | `/behavior/anomalies/:id/review` | OPS_ADMIN | Review anomaly |

### Corridor Behavior

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/behavior/corridor/:corridorId/stats` | Bearer | Get corridor behavior stats |
| GET | `/behavior/driver/:driverId/patterns` | Bearer | Driver behavior patterns |

---

## Fraud Engine (3009)

Base: `http://localhost:3009/api/v1`

### Fraud Detection

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/fraud/check` | SYSTEM | Run fraud check |
| GET | `/fraud/flags` | OPS_ADMIN | List fraud flags |
| GET | `/fraud/flags/:id` | Bearer | Get flag details |
| PUT | `/fraud/flags/:id/review` | OPS_ADMIN | Review flag |

### Fraud Rules

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/fraud/rules` | SUPER_ADMIN | List fraud rules |
| POST | `/fraud/rules` | SUPER_ADMIN | Create fraud rule |
| PUT | `/fraud/rules/:id` | SUPER_ADMIN | Update rule |
| PUT | `/fraud/rules/:id/toggle` | SUPER_ADMIN | Enable/disable rule |

### Rule Categories

1. Identity (duplicate accounts, credential sharing)
2. Pricing (below-floor bidding, coordinated pricing)
3. Trip (route deviation, GPS spoofing)
4. Financial (COD fraud, payment evasion)
5. Assignment (route hoarding, rejection patterns)
6. Conflict (orderer-driver collusion)
7. Documents (fake cargo manifests, duplicate POD)
8. Trust (anomalous trust score jumps)

---

## Data Engine (3008)

Base: `http://localhost:3008/api/v1`

### Aggregations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/data/aggregations/summary` | Bearer | Platform summary |
| GET | `/data/aggregations/financial` | Bearer | Financial aggregations |
| POST | `/data/aggregations/generate` | SYSTEM | Trigger aggregation |

### Reporting

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/data/reports/platform-health` | OPS_ADMIN | Platform health report |
| GET | `/data/reports/corridor-performance` | OPS_ADMIN | Corridor performance |
| GET | `/data/reports/fleet-efficiency/:fleetId` | Bearer | Fleet efficiency report |
| GET | `/data/reports/cbe-compliance` | SUPER_ADMIN | CBE compliance report |

### OPS Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/data/ops/dashboard` | OPS_ADMIN/OPS_VIEWER | OPS dashboard |
| GET | `/data/ops/workqueue` | OPS_ADMIN | OPS work queue |
| GET | `/data/ops/active-incidents` | OPS_ADMIN | Active incidents |
| GET | `/data/ops/pending-payouts` | FINANCE_OPS | Pending payouts |

---

## Health Engine (3011)

Base: `http://localhost:3011/api/v1`

### System Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health/health` | None | Engine health |
| GET | `/health/status` | Bearer | System health status |
| GET | `/health/all-engines` | Bearer | Poll all engine health |

### Dead Letter Queue

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health/dlq/messages` | SUPER_ADMIN | List DLQ messages |
| POST | `/health/dlq/retry/:id` | SUPER_ADMIN | Retry DLQ message |
| DELETE | `/health/dlq/:id` | SUPER_ADMIN | Delete DLQ message |

### Monitoring

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health/metrics` | Bearer | System metrics |
| GET | `/health/metrics/:engine` | Bearer | Engine-specific metrics |

---

## Twin Engine (3012)

Base: `http://localhost:3012/api/v1`

**Note: This is a stub for Phase 2 implementation.**

### Digital Twin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/twin/health` | None | Health check |
| GET | `/twin/status` | Bearer | Twin engine status |

---

## Notification Engine (3013)

Base: `http://localhost:3013/api/v1`

### Internal Endpoints (Engines Only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/internal/sms` | Internal | Send SMS |
| POST | `/internal/push` | Internal | Send push notification |
| POST | `/internal/email` | Internal | Send email |

### Preferences

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications/preferences` | Bearer | Get preferences |
| PUT | `/notifications/preferences` | Bearer | Update preferences |

### Notification History

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications/history` | Bearer | Get notification history |
| GET | `/notifications/:id/status` | Bearer | Check delivery status |

### SMS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/notifications/sms` | Bearer | Send SMS (if permitted) |

### Push Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/notifications/push` | Bearer | Send push (if permitted) |

---

## Error Codes

### HTTP Status Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 401 | `OTP_EXPIRED` | OTP has expired |
| 401 | `OTP_INVALID` | Incorrect OTP |
| 403 | `INSUFFICIENT_TRUST_TIER` | Trust tier too low |
| 403 | `CORRIDOR_ACCESS_DENIED` | Not authorized for corridor |
| 403 | `KYC_REQUIRED` | Insufficient KYC tier |
| 403 | `OTP_LOCKOUT` | Too many failed OTP attempts |
| 403 | `EXPOSURE_CAP_EXCEEDED` | Exposure cap exceeded in shock mode |
| 404 | `ENTITY_NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE_FINANCIAL_TX` | Financial transaction already exists |
| 409 | `INVALID_STATE_TRANSITION` | Invalid incident state transition |
| 422 | `INSURANCE_EXPIRED` | Truck insurance expired |
| 422 | `LICENSE_EXPIRED` | Driver license expired |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error (no stack trace exposed) |
| 503 | `CORRIDOR_FROZEN` | Corridor is frozen |

---

## Ethiopian Calendar

**Note:** All timestamp responses include both Gregorian and Ethiopian calendar dates.

```json
{
  "created_at": "2026-03-05T09:30:00.000Z",
  "created_at_et": "2018-06-26 12:30:00"
}
```

The `created_at_et` field uses the Ethiopian calendar for display purposes and is automatically generated by the `toEthiopianDate()` utility function.

---

## Summary

| Component | Count |
|-----------|-------|
| Total Engines | 13 |
| Total Workers | 6 |
| Total Packages | 17 |
| Total API Endpoints | ~120+ |
| Authentication Methods | JWT Bearer + OTP |

---

*Last Updated: 2026-03-05*
*Version: 1.0.0 (Phase 1)*
