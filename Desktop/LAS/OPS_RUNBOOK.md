# ISUZET CBE LaaS Platform — OPS Runbook

**Version:** 1.0 (Pre-Pilot)
**Platform:** Windows 11, Docker Desktop, Node.js 20+, pnpm

---

## Quick Start

### 1. Prerequisites

- Docker Desktop running
- Node.js 20+ installed
- pnpm installed (`npm i -g pnpm`)
- Repository cloned to `C:\Users\<user>\Desktop\LAS`

### 2. Start the Full Platform

```powershell
cd C:\Users\<user>\Desktop\LAS\Backend
.\scripts\start-all.ps1
```

This script:
1. Verifies Docker is running
2. Starts PostgreSQL, Redis, TimescaleDB, MinIO via docker-compose
3. Kills any existing Node processes
4. Starts all 14 engines + workers in separate PowerShell windows
5. Waits 25 seconds for initialization
6. Runs health checks on all engines

### 3. Create First OPS Admin

```powershell
cd C:\Users\<user>\Desktop\LAS\Backend
node scripts/create-ops-admin.js
```

Default credentials:
- **Phone:** `+251900000001`
- **OTP:** `123456` (valid 5 minutes)
- **Dashboard URL:** http://localhost:5173/login

Custom admin:
```powershell
node scripts/create-ops-admin.js --phone=+251900000099 --name="Jane Ops"
```

---

## Engine Ports Reference

| Engine            | Port | Role                          |
|-------------------|------|-------------------------------|
| identity          | 3001 | Auth, KYC, user profiles      |
| optimizer         | 3002 | Rate calculation              |
| corridor          | 3003 | Route management              |
| liquidity         | 3004 | Escrow & payouts              |
| shock             | 3005 | Market shock events           |
| incident          | 3006 | Incident management           |
| behavior          | 3007 | Trust & behavior scoring      |
| data              | 3008 | Analytics & aggregation       |
| fraud             | 3009 | Fraud detection               |
| strategy          | 3010 | Pricing strategy              |
| health            | 3011 | System health monitoring      |
| twin              | 3012 | Digital twin                  |
| notifications     | 3013 | FCM + Telegram notifications  |
| dispatch          | 3015 | Load dispatch & matching      |
| workers           | —    | Background job processing     |

---

## OPS Dashboard

**URL:** http://localhost:5173

### Pages

| Route       | Purpose                          | Data Source                        |
|-------------|----------------------------------|------------------------------------|
| /           | Ops Workqueue (SLA items)        | data:3008/ops/workqueue            |
| /overview   | Platform KPIs + engine health    | data:3008/platform/summary         |
| /loads      | Load management                  | dispatch:3015/loads                |
| /drivers    | Driver list + trust metrics      | identity:3001/drivers              |
| /kyc        | KYC document review queue        | identity:3001/kyc/pending          |
| /finance    | Financial overview               | data:3008/financial/summary        |
| /fraud      | Fraud flags + review             | fraud:3009/flags                   |
| /incidents  | Incident management              | incident:3006                      |
| /corridors  | Corridor performance             | corridor:3003                      |

---

## Common Ops Actions

### Manual OTP for Testing

```powershell
docker exec $(docker ps --filter name=redis -q) redis-cli SET "otp:+251900000001" "123456" EX 300
```

### Restart a Specific Engine

```powershell
# Find and kill the process
$pid = (Get-NetTCPConnection -LocalPort 3001).OwningProcess
Stop-Process -Id $pid -Force

# Restart from Backend directory
cd C:\Users\<user>\Desktop\LAS\Backend
pnpm --filter @ruit/engine-identity dev
```

### Check Engine Health

```powershell
# All engines
@(3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,3011,3012,3013,3015) | ForEach-Object {
  try { $r = Invoke-RestMethod "http://localhost:$_/api/v1/*/health"; Write-Host "$_ UP" -ForegroundColor Green }
  catch { Write-Host "$_ DOWN" -ForegroundColor Red }
}
```

### View Worker Logs

Workers run in a background PowerShell window titled "RUIT: Workers".
All BullMQ queue names: `ruit_trust-score-update`, `ruit_escrow-release`, `ruit_document-expiry-check`, etc.

---

## Database Access

```powershell
# Connect to PostgreSQL
docker exec -it $(docker ps --filter name=postgres -q) psql -U ruit -d ruit_cbe

# Common queries
\dt                          -- list tables
SELECT role, count(*) FROM users GROUP BY role;  -- user breakdown
SELECT status, count(*) FROM loads GROUP BY status;  -- load pipeline
SELECT status, count(*) FROM kyc_documents GROUP BY status;  -- KYC queue
```

---

## Troubleshooting

### Engine won't start — "EADDRINUSE"
Another process is using the port. Kill it:
```powershell
$pid = (Get-NetTCPConnection -LocalPort <PORT>).OwningProcess
Stop-Process -Id $pid -Force
```

### "Invalid token" from engine
The engine needs RSA public key. Ensure `keys/public.pem` exists in the engine directory.
Copy from identity engine: `cp Backend\apps\engine-identity\keys\public.pem Backend\apps\<engine>\keys\`

### Workers crash — "Queue name cannot contain :"
Queue names use `ruit_xxx` format (underscores, not colons). Rebuild shared-queue:
```powershell
pnpm --filter @ruit/shared-queue build
```

### Financial summary returns 500
Check that the `financial_transactions` table exists and uses snake_case column names (`amount_etb`, `tx_type`, etc.).

### OTP login fails
Check Redis is running:
```powershell
docker exec $(docker ps --filter name=redis -q) redis-cli PING
```
Then re-run `node scripts/create-ops-admin.js`.

---

## Pilot Checklist

Before pilot launch:

- [ ] All 14 engines passing health checks
- [ ] Workers running (check PowerShell window for errors)
- [ ] OPS Admin account created and login tested
- [ ] OPS dashboard: Overview, Loads, Drivers, KYC, Finance pages load data
- [ ] Fraud engine returning flags list (even if empty)
- [ ] At least one corridor exists in DB
- [ ] At least one strategy version is active (`isActive=true`)
- [ ] Firebase service account file present (for FCM push notifications)
- [ ] SSL/HTTPS configured if running on production host
- [ ] `.env` has strong `INTERNAL_SECRET` and `WEBHOOK_SECRET` values

---

## Emergency Stop

```powershell
# Stop all engines
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop infrastructure
cd C:\Users\<user>\Desktop\LAS\Backend
docker compose -f infra\docker-compose.yml down
```
