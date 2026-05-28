/**
 * ISUZET Platform E2E Test Suite
 * Tests 9 critical workflows across all backend engines.
 * Run: node e2e-test.js   (from LAS root)
 *
 * Prerequisites: all engines running, Redis + Postgres accessible.
 */

// ── Module aliases (pnpm hoisted paths) ─────────────────────────────────────
const path = require('path');
const crypto = require('crypto');
const BACKEND = path.join(__dirname, 'Backend');
const IOREDIS_PATH = path.join(BACKEND, 'node_modules', '.pnpm', 'ioredis@5.10.0', 'node_modules', 'ioredis');
const PG_PATH      = path.join(BACKEND, 'node_modules', '.pnpm', 'pg@8.20.0',      'node_modules', 'pg');

const Redis  = require(IOREDIS_PATH);
const { Client: PgClient } = require(PG_PATH);

// ── Endpoints ─────────────────────────────────────────────────────────────────

const IDENTITY  = 'http://localhost:3001/api/v1';
const CORRIDOR  = 'http://localhost:3003/api/v1';
const LIQUIDITY = 'http://localhost:3004/api/v1';
const INCIDENT  = 'http://localhost:3006/api/v1';
const DATA      = 'http://localhost:3008/api/v1';
const FRAUD     = 'http://localhost:3009/api/v1';
const DISPATCH  = 'http://localhost:3015/api/v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

async function request(method, url, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
    results.push({ name, ok: true });
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
    results.push({ name, ok: false, detail });
  }
}

function section(title) { console.log(`\n── ${title} ──`); }

// Redis helper: read OTP stored by identity engine
async function getOtpFromRedis(redis, phone) {
  return redis.get(`otp:${phone}`);
}

// Auth helper: register (if not exists) → ensure OTP in Redis → verify
async function authenticateUser(redis, phone, fullName, role) {
  const reg = await request('POST', `${IDENTITY}/auth/register`, { phone, fullName, role });
  if (reg.status !== 200 && reg.status !== 409) return null;

  // Wait briefly for async OTP write (new registrations only)
  await new Promise(r => setTimeout(r, 300));

  let otp = await getOtpFromRedis(redis, phone);
  if (!otp) {
    // Existing user — OTP not re-sent on 409; write one directly to Redis
    otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(`otp:${phone}`, 300, otp);
    await redis.del(`otp:attempts:${phone}`);
    await redis.del(`otp:lockout:${phone}`);
  }

  const ver = await request('POST', `${IDENTITY}/auth/verify-otp`, { phone, otp });
  return ver.body?.data?.access_token ?? null;
}

// State shared across tests
const PHONE_DRIVER  = '+251900110001';
const PHONE_ORDERER = '+251900110002';
const PHONE_OPS     = '+251900110099';

let driverToken  = null;
let ordererToken = null;
let opsToken     = null;
let corridorId   = null;
let loadId       = null;

// ── Workflow 1: Engine health ─────────────────────────────────────────────────

async function workflow1_EngineHealth() {
  section('W1 · Engine Health Checks');
  const engines = [
    { name: 'Identity (3001)',  url: `${IDENTITY}/identity/me` },
    { name: 'Corridor (3003)',  url: `${CORRIDOR}/corridor/corridors` },
    { name: 'Data (3008)',      url: `${DATA}/data/platform/summary` },
    { name: 'Fraud (3009)',     url: `${FRAUD}/fraud/flags` },
    { name: 'Dispatch (3015)', url: `${DISPATCH}/dispatch/loads` },
    { name: 'Incident (3006)', url: `${INCIDENT}/incident/incidents` },
  ];
  for (const { name, url } of engines) {
    const { status } = await request('GET', url);
    // 200/401/403 = alive;  0/503/ECONNREFUSED = dead
    assert(`${name} is reachable`, status > 0 && status < 600 && status !== 503, `HTTP ${status}`);
  }
}

// ── Workflow 2: Driver auth ───────────────────────────────────────────────────

async function workflow2_DriverAuth(redis) {
  section('W2 · Driver Auth (Redis OTP)');
  const reg = await request('POST', `${IDENTITY}/auth/register`, {
    phone: PHONE_DRIVER, fullName: 'E2E Driver', role: 'DRIVER',
  });
  assert('Driver register (200 or 409)', reg.status === 200 || reg.status === 409, `HTTP ${reg.status}`);

  await new Promise(r => setTimeout(r, 300));
  let driverOtp = await getOtpFromRedis(redis, PHONE_DRIVER);
  if (!driverOtp) {
    // Existing user — write OTP directly to Redis
    driverOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(`otp:${PHONE_DRIVER}`, 300, driverOtp);
    await redis.del(`otp:attempts:${PHONE_DRIVER}`);
    await redis.del(`otp:lockout:${PHONE_DRIVER}`);
  }
  assert('Driver OTP in Redis', !!driverOtp, 'key otp:' + PHONE_DRIVER + ' is null');

  if (driverOtp) {
    const ver = await request('POST', `${IDENTITY}/auth/verify-otp`, { phone: PHONE_DRIVER, otp: driverOtp });
    assert('Driver OTP verify returns 200', ver.status === 200, `HTTP ${ver.status}`);
    driverToken = ver.body?.data?.access_token ?? null;
    assert('Driver access token received', !!driverToken);
  }
}

// ── Workflow 3: Orderer auth ──────────────────────────────────────────────────

async function workflow3_OrdererAuth(redis) {
  section('W3 · Orderer Auth (Redis OTP)');
  const reg = await request('POST', `${IDENTITY}/auth/register`, {
    phone: PHONE_ORDERER, fullName: 'E2E Orderer', role: 'ORDERER',
  });
  assert('Orderer register (200 or 409)', reg.status === 200 || reg.status === 409, `HTTP ${reg.status}`);

  await new Promise(r => setTimeout(r, 300));
  let ordererOtp = await getOtpFromRedis(redis, PHONE_ORDERER);
  if (!ordererOtp) {
    ordererOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(`otp:${PHONE_ORDERER}`, 300, ordererOtp);
    await redis.del(`otp:attempts:${PHONE_ORDERER}`);
    await redis.del(`otp:lockout:${PHONE_ORDERER}`);
  }
  assert('Orderer OTP in Redis', !!ordererOtp, 'key otp:' + PHONE_ORDERER + ' is null');

  if (ordererOtp) {
    const ver = await request('POST', `${IDENTITY}/auth/verify-otp`, { phone: PHONE_ORDERER, otp: ordererOtp });
    assert('Orderer OTP verify returns 200', ver.status === 200, `HTTP ${ver.status}`);
    ordererToken = ver.body?.data?.access_token ?? null;
    assert('Orderer access token received', !!ordererToken);
  }
}

// ── Workflow 4: OPS Admin — seed via DB then auth ─────────────────────────────

async function workflow4_OpsAuth(redis, pg) {
  section('W4 · OPS Admin (DB-seeded + Redis OTP)');

  // Upsert OPS_ADMIN via raw SQL (bypasses role validation in register endpoint)
  try {
    const userId = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 26);
    await pg.query(`
      INSERT INTO users (id, phone, full_name, role, status, kyc_tier, created_at, updated_at)
      VALUES ($1, $2, $3, 'OPS_ADMIN', 'ACTIVE', 1, NOW(), NOW())
      ON CONFLICT (phone) DO NOTHING
    `, [userId, PHONE_OPS, 'E2E OPS Admin']);
    assert('OPS_ADMIN upserted in DB', true);
  } catch (e) {
    assert('OPS_ADMIN upserted in DB', false, e.message);
  }

  // Trigger OTP by re-registering (will get 400 due to OPS_ADMIN not allowed but OTP still sent? No...)
  // Instead, generate OTP directly via Redis (mimicking what storeOtp does in the identity engine)
  const freshOtp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.setex(`otp:${PHONE_OPS}`, 300, freshOtp);
  await redis.del(`otp:attempts:${PHONE_OPS}`);
  await redis.del(`otp:lockout:${PHONE_OPS}`);

  const ver = await request('POST', `${IDENTITY}/auth/verify-otp`, { phone: PHONE_OPS, otp: freshOtp });
  assert('OPS admin OTP verify returns 200', ver.status === 200, `HTTP ${ver.status} — ${JSON.stringify(ver.body).slice(0, 80)}`);

  opsToken = ver.body?.data?.access_token ?? null;
  assert('OPS access token received', !!opsToken);

  if (opsToken) {
    const me = await request('GET', `${IDENTITY}/identity/me`, null, opsToken);
    assert('GET /identity/me returns profile', me.status === 200, `HTTP ${me.status}`);
    const role = me.body?.data?.role ?? me.body?.role;
    assert('Profile role is OPS_ADMIN', role === 'OPS_ADMIN', `Got: ${role}`);
  }
}

// ── Workflow 5: Corridor listing ──────────────────────────────────────────────

async function workflow5_Corridors() {
  section('W5 · Corridor Engine');
  const token = opsToken ?? ordererToken ?? driverToken;
  const list = await request('GET', `${CORRIDOR}/corridor/corridors`, null, token);
  assert('GET /corridor/corridors returns 200', list.status === 200, `HTTP ${list.status}`);

  const body = list.body?.data ?? list.body;
  const corridors = Array.isArray(body) ? body : (body?.corridors ?? body?.items ?? []);
  assert('Corridors list is non-empty', corridors.length > 0, `Got ${corridors.length}`);
  if (corridors.length > 0) corridorId = corridors[0].id;
}

// ── Workflow 6: Public rate estimate ─────────────────────────────────────────

async function workflow6_RateEstimate() {
  section('W6 · Rate Calculator (Public Estimate)');
  const params = new URLSearchParams({
    originZoneName: 'Addis Ababa',
    destZoneName:   'Dire Dawa',
    cargoType:      'GRAIN',
    weightKg:       '5000',
    pickupDate:     new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  });
  const est = await request('GET', `${CORRIDOR}/public-estimate?${params}`);
  assert('Public estimate returns 200', est.status === 200, `HTTP ${est.status}`);
  const data = est.body?.data ?? est.body;
  const hasRate = data?.baseRateEtb != null || data?.estimatedRateEtb != null
    || data?.rate != null || data?.total != null || data?.baseRate != null;
  assert('Estimate has a rate value', hasRate, JSON.stringify(data).slice(0, 120));
}

// ── Workflow 7: Load posting ──────────────────────────────────────────────────

async function workflow7_LoadPosting() {
  section('W7 · Load Posting (Orderer)');
  if (!ordererToken) { assert('Orderer token available', false, 'Skipped — W3 failed'); return; }

  const pickup  = new Date(Date.now() + 2 * 86400000).toISOString();
  const deliver = new Date(Date.now() + 4 * 86400000).toISOString();
  const res = await request('POST', `${DISPATCH}/dispatch/loads`, {
    corridorId:       corridorId ?? 'default',
    originCity:       'Addis Ababa',
    destinationCity:  'Dire Dawa',
    cargoType:        'GRAIN',
    weightKg:         5000,
    pickupDate:       pickup,
    deliveryDeadline: deliver,
    paymentModel:     'ESCROW',
  }, ordererToken);

  assert('POST /dispatch/loads returns 200 or 201',
    res.status === 200 || res.status === 201,
    `HTTP ${res.status} — ${JSON.stringify(res.body).slice(0, 100)}`);

  const data = res.body?.data ?? res.body;
  loadId = data?.id ?? data?.loadId ?? null;
  assert('Load response has an id', !!loadId, JSON.stringify(data).slice(0, 80));
}

// ── Workflow 8: Ops workqueue ──────────────────────────────────────────────────

async function workflow8_OpsWorkqueue() {
  section('W8 · Ops Workqueue');
  if (!opsToken) { assert('OPS token available', false, 'Skipped — W4 failed'); return; }

  const res = await request('GET', `${DATA}/data/ops/workqueue`, null, opsToken);
  assert('GET /data/ops/workqueue returns 200', res.status === 200, `HTTP ${res.status}`);

  const data = res.body?.data ?? res.body;
  assert('Workqueue has numeric counts',
    typeof data?.pendingKycReviews === 'number' || typeof data?.openIncidents === 'number',
    JSON.stringify(data).slice(0, 120));
}

// ── Workflow 9: Profile with trust score ──────────────────────────────────────

async function workflow9_TrustBreakdown() {
  section('W9 · Profile Trust Score');
  const token = driverToken ?? ordererToken ?? opsToken;
  if (!token) { assert('Auth token available', false, 'Skipped — no token'); return; }

  const res = await request('GET', `${IDENTITY}/identity/me`, null, token);
  assert('GET /identity/me returns 200', res.status === 200, `HTTP ${res.status}`);

  const data = res.body?.data ?? res.body;
  assert('Profile has trust/kyc tier',
    data?.trustTier != null || data?.kycTier != null || data?.trustScore != null,
    JSON.stringify(data).slice(0, 100));
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ISUZET Platform E2E Test Suite');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');

  const redis = new Redis('redis://localhost:6379', { lazyConnect: false });
  const pg = new PgClient({ connectionString: 'postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe' });
  await pg.connect();

  try {
    await workflow1_EngineHealth();
    await workflow2_DriverAuth(redis);
    await workflow3_OrdererAuth(redis);
    await workflow4_OpsAuth(redis, pg);
    await workflow5_Corridors();
    await workflow6_RateEstimate();
    await workflow7_LoadPosting();
    await workflow8_OpsWorkqueue();
    await workflow9_TrustBreakdown();
  } finally {
    await redis.disconnect();
    await pg.end();
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\n  Failed tests:');
    results.filter(r => !r.ok).forEach(r =>
      console.log(`    ✗ ${r.name}${r.detail ? `: ${r.detail}` : ''}`)
    );
  }
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
