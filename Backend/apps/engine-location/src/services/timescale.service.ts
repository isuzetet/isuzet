import { Pool } from 'pg';

// Validate TIMESCALE_URL environment variable at startup
if (!process.env.TIMESCALE_URL) {
  throw new Error('TIMESCALE_URL environment variable is required for TimescaleDB connection');
}

// TimescaleDB connection — separate from main PostgreSQL
const timescalePool = new Pool({
  connectionString: process.env.TIMESCALE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize TimescaleDB tables on startup
// These are RAW SQL tables — not Prisma models
// TimescaleDB requires hypertables for time-series optimization
export async function initTimescaleTables(): Promise<void> {
  const client = await timescalePool.connect();
  try {
    // Create location_pings table if not exists
    // This is separate from the Prisma location_pings table in main DB
    // TimescaleDB stores the full ping history for analytics and replay
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_pings_ts (
        time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        trip_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        load_id TEXT,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        speed_kmh DOUBLE PRECISION,
        heading_deg DOUBLE PRECISION,
        altitude_m DOUBLE PRECISION,
        battery_level INTEGER,
        source TEXT DEFAULT 'PHONE',
        device_id TEXT,
        is_offline_sync BOOLEAN DEFAULT FALSE
      );
    `);

    // Convert to TimescaleDB hypertable if not already
    // This is what makes time-range queries extremely fast
    await client.query(`
      SELECT create_hypertable(
        'location_pings_ts',
        'time',
        if_not_exists => TRUE
      );
    `).catch(() => {
      // Hypertable may already exist — ignore error
      console.log('TimescaleDB hypertable already exists or TimescaleDB extension not available');
    });

    // Create index for fast trip-based queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_location_pings_ts_trip_id ON location_pings_ts (trip_id, time DESC);
    `);

    console.log('TimescaleDB tables initialized');
  } catch (error) {
    console.error('TimescaleDB init error:', error);
    // Do NOT crash on TimescaleDB failure — degrade gracefully
    // Location pings will still be stored in main PostgreSQL via Prisma
    console.log('Continuing without TimescaleDB optimization');
  } finally {
    client.release();
  }
}

// Write a location ping to TimescaleDB
export async function writeLocationPingToTimescale(ping: {
  tripId: string;
  driverId: string;
  loadId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speedKmh?: number;
  headingDeg?: number;
  altitudeM?: number;
  batteryLevel?: number;
  source: string;
  deviceId?: string;
  isOfflineSync?: boolean;
}): Promise<void> {
  try {
    await timescalePool.query(`
      INSERT INTO location_pings_ts (
        time, trip_id, driver_id, load_id, lat, lng, accuracy, speed_kmh, heading_deg, altitude_m, battery_level, source, device_id, is_offline_sync
      ) VALUES (
        NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
    `, [
      ping.tripId,
      ping.driverId,
      ping.loadId || null,
      ping.lat,
      ping.lng,
      ping.accuracy || null,
      ping.speedKmh || null,
      ping.headingDeg || null,
      ping.altitudeM || null,
      ping.batteryLevel || null,
      ping.source,
      ping.deviceId || null,
      ping.isOfflineSync || false
    ]);
  } catch (error) {
    // Log but do not throw — TimescaleDB write failure should not block response
    console.error('TimescaleDB write error (non-fatal):', error);
  }
}

// Get location history for a trip from TimescaleDB
export async function getTripLocationHistory(
  tripId: string,
  fromTime?: Date,
  toTime?: Date,
  limit: number = 1000
): Promise<Array<{
  time: Date;
  lat: number;
  lng: number;
  speedKmh: number | null;
  headingDeg: number | null;
  batteryLevel: number | null;
  source: string;
}>> {
  let query = `
    SELECT time, lat, lng, speed_kmh as "speedKmh", heading_deg as "headingDeg",
           battery_level as "batteryLevel", source
    FROM location_pings_ts
    WHERE trip_id = $1
  `;
  const params: any[] = [tripId];

  if (fromTime) {
    params.push(fromTime);
    query += ` AND time >= $${params.length}`;
  }
  if (toTime) {
    params.push(toTime);
    query += ` AND time <= $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY time ASC LIMIT $${params.length}`;

  const result = await timescalePool.query(query, params);
  return result.rows;
}

// Get last known location for a trip from TimescaleDB
export async function getLastLocationFromTimescale(tripId: string) {
  const result = await timescalePool.query(`
    SELECT time, lat, lng, speed_kmh as "speedKmh", heading_deg as "headingDeg",
           battery_level as "batteryLevel", source, driver_id as "driverId"
    FROM location_pings_ts
    WHERE trip_id = $1
    ORDER BY time DESC
    LIMIT 1
  `, [tripId]);

  return result.rows[0] || null;
}
