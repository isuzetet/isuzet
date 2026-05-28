#!/usr/bin/env node
/**
 * ISUZET CBE Platform — Create OPS Admin User
 *
 * Seeds an OPS_ADMIN user directly in PostgreSQL.
 * The register endpoint blocks OPS_ADMIN creation, so this script
 * writes directly to the DB and pre-loads a Redis OTP for first login.
 *
 * Usage:
 *   node scripts/create-ops-admin.js
 *   node scripts/create-ops-admin.js --phone=+251900000099 --name="Ops Admin"
 *
 * Requires: pg (pnpm add -w pg)
 * Redis OTP is set via docker exec (Docker must be running)
 */

const { Client } = require('pg');
const { execSync } = require('child_process');

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? 'true'];
    })
);

const PHONE    = args.phone ?? '+251900000001';
const NAME     = args.name  ?? 'Ops Admin';
const OTP      = '123456';   // One-time first-login OTP
const USER_ID  = args.id    ?? '01KM61AHQNMMX821QHM5NHDCXH'; // stable ULID

const DB_URL   = process.env.DATABASE_URL ?? 'postgresql://ruit:ruit_dev_password@localhost:5432/ruit_cbe';

async function run() {
  console.log('=== ISUZET CBE — Create OPS Admin ===');
  console.log(`Phone : ${PHONE}`);
  console.log(`Name  : ${NAME}`);
  console.log(`OTP   : ${OTP}  (valid 5 minutes)`);
  console.log('');

  // ── 1. PostgreSQL upsert ──────────────────────────────────────────────────
  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  try {
    await pg.query(`
      INSERT INTO users (
        id, phone, full_name, role, status,
        kyc_tier, referral_code, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, 'OPS_ADMIN', 'ACTIVE',
        1, 'OPSADM001', NOW(), NOW()
      )
      ON CONFLICT (phone) DO UPDATE SET
        role        = 'OPS_ADMIN',
        status      = 'ACTIVE',
        full_name   = EXCLUDED.full_name,
        updated_at  = NOW()
    `, [USER_ID, PHONE, NAME]);

    console.log(`✓ User upserted in DB  (id: ${USER_ID})`);
  } finally {
    await pg.end();
  }

  // ── 2. Redis OTP write via docker exec ───────────────────────────────────
  try {
    const container = execSync("docker ps --filter name=redis -q", { encoding: 'utf8' }).trim().split('\n')[0];
    if (!container) throw new Error('Redis container not found');
    execSync(`docker exec ${container} redis-cli SET "otp:${PHONE}" "${OTP}" EX 300`, { stdio: 'pipe' });
    execSync(`docker exec ${container} redis-cli DEL "otp:attempts:${PHONE}" "otp:lockout:${PHONE}"`, { stdio: 'pipe' });
    console.log(`✓ OTP set in Redis     (expires in 5 minutes)`);
  } catch (err) {
    console.warn(`⚠ Could not set OTP in Redis: ${err.message}`);
    console.warn('  Manually run: docker exec <redis-container> redis-cli SET "otp:' + PHONE + '" "' + OTP + '" EX 300');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  OPS Admin ready. Login via OPS dashboard:');
  console.log(`  Phone : ${PHONE}`);
  console.log(`  OTP   : ${OTP}`);
  console.log('  URL   : http://localhost:5173/login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

run().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
