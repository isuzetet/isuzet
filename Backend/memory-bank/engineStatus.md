# Engine Status

## Implemented Engines

| Engine | Name | Status | Port | Description |
|--------|------|--------|------|-------------|
| Engine 1 | Identity | COMPLETE | 3001 | User identity, KYC, and trust engine |
| Engine 2 | Optimizer | COMPLETE | 3002 | Load-pricer and offer finder |
| Engine 3 | Corridor Intelligence | COMPLETE | 3003 | Corridor health, density scoring, strategic corridor detection |
| Engine 4 | Liquidity | COMPLETE | 3004 | Escrow management, COD, and exposure calculations |
| Engine 5 | Shock Absorption | COMPLETE | 3005 | Shock mode management with severity levels 1-4 |
| Engine 6 | Incident & Dispute | COMPLETE | 3006 | State machine for incident management and dispute resolution |
| Engine 7 | Behavior | COMPLETE | 3007 | Behavioral anomaly detection, scoring, and corridor stats |
| Engine 8 | Data | COMPLETE | 3008 | Platform aggregation, financial reporting, OPS workqueue, CBE compliance |
| Engine 9 | Fraud | COMPLETE | 3009 | Rule-based fraud detection, flag management, reviews |
| Engine 10 | Strategy | COMPLETE | 3010 | Risk tiers, strategy versions, and rule configuration |
| Engine 11 | Health Monitor | COMPLETE | 3011 | System-wide health monitoring, polls all engines |
| Engine 12 | Notification | COMPLETE | 3013 | Notification gateway (SMS, Push, Email) with Africa's Talking, Twilio, Firebase FCM |
| Engine 13 | Digital Twin | COMPLETE (STUB) | 3012 | Digital Twin simulation engine - Phase 2 |

## Workers (Background Job Processing)

| Worker | Queue | Purpose |
|--------|-------|---------|
| TrustWorker | TRUST_SCORE_UPDATE | Computes decay-weighted trust scores and tier advancement |
| EscrowWorker | ESCROW_RELEASE | Processes escrow releases with financial transaction logging |
| NotificationWorker | NOTIFICATION | Routes notifications to correct channels (SMS/Push/Email) |
| IncidentEscalationWorker | INCIDENT_ESCALATION | SLA enforcement - auto-escalates incidents |
| CorridorSnapshotWorker | CORRIDOR_SNAPSHOT | Records corridor health snapshots every 15 minutes |
| ShockMonitorWorker | SHOCK_MONITOR | Scans for shock conditions every 5 minutes |

## Health Check Endpoints

All engines have health endpoints at:
- GET `/api/v1/{engine}/health`

Expected response:
```json
{
  "status": "UP",
  "engine": "{engine_name}",
  "timestamp": "2026-03-04T...",
  "ethiopian_date": "2018-06-26"
}
```

## Environment Variables

Required environment variables for engines:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - For token verification
- `PORT` - Port to run the engine (overrides defaults)

## Key Specification Compliance

### Amendment 2 (B1, B4, B7, C4, C5, C6)
- [x] B1: Corridor density scoring implementation
- [x] B4: Incident state machine with all transitions defined
- [x] B7: Evidence submission and collection flow
- [x] C4: SLA thresholds for incident resolution
- [x] C5: Trust tier advancement rules (0-5)
- [x] C6: Escrow release with transaction logging

### PRD Section 7.3 (Corridor Intelligence)
- [x] Density index calculation with LTR, fill rate, payment delay, backhaul
- [x] Strategic corridor detection
- [x] Manual corridor freeze capability
- [x] Health score override capability

### PRD Section 7.4 (Shock Absorption)
- [x] Shock severity matrix (levels 1-4)
- [x] Margin floor increases per severity
- [x] Negotiation band caps per severity
- [x] Manual and auto-trigger implementation

### PRD Section 7.6 (Incident Management)
- [x] Complete state machine with valid transitions
- [x] Role-based transition permissions
- [x] Evidence collection workflow
- [x] SLA breach detection
- [x] Disputes dashboard for OPS

## Build Status

- [x] Shared packages (shared-db, shared-auth, shared-utils, shared-types, shared-queue)
- [x] Engine 1 (Identity) - Port 3001
- [x] Engine 2 (Optimizer) - Port 3002
- [x] Engine 3 (Corridor) - Port 3003
- [x] Engine 4 (Liquidity) - Port 3004
- [x] Engine 5 (Shock) - Port 3005
- [x] Engine 6 (Incident) - Port 3006
- [x] Engine 7 (Behavior) - Port 3007
- [x] Engine 8 (Data) - Port 3008
- [x] Engine 9 (Fraud) - Port 3009
- [x] Engine 10 (Strategy) - Port 3010
- [x] Engine 11 (Health) - Port 3011
- [x] Engine 12 (Notification) - Port 3013
- [x] Engine 13 (Twin/STUB) - Port 3012
- [x] Workers (Trust, Escrow, Notification, Incident, Corridor, Shock)

## Database Tables Used

### Engine-Corridor
- `corridors` - Main corridor data
- `corridor_snapshots` - TimescaleDB for time-series data
- `loads` - For LTR calculations
- `assignments` - For LTR calculations

### Engine-Shock
- `shock_events` - Active and historical shock events
- `strategy_versions` - For threshold configuration
- `events` - For auto-trigger evaluation

### Engine-Incident
- `incidents` - Incident records
- `incident_evidence` - Evidence metadata
- `trips` - Trip relationship
- `loads` - For freezing on cargo damage/dispute

### Workers
- `drivers` - Trust score updates
- `fleet_owners` - Trust score updates
- `loads` - Escrow release, corridor snapshot
- `assignments` - Escrow release
- `financial_transactions` - Escrow payouts
- `events` - All workers emit events
- `shock_events` - Shock monitoring
- `notification_preference` - Notification routing

## Security Features

All engines implement:
- JWT token verification
- Role-based access control (RBAC)
- Audit logging via `events` table
- Prisma transactions for financial mutations
- Redis caching for performance

## Response Format

All endpoints return standard response format:
```json
{
  "success": true|false,
  "data": { ... }, // On success
  "error": {       // On failure
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```
