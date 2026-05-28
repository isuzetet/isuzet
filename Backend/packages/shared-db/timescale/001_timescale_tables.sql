-- ===================================================================
-- RUIT CBE — TimescaleDB Hypertable Creation Script
-- Must be run AFTER enabling TimescaleDB extension
-- ===================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ===================================================================
-- TABLE 1: GPS Traces
-- Stores location data from trucks with 1-day chunk intervals
-- ===================================================================
CREATE TABLE IF NOT EXISTS gps_traces (
    trip_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    truck_id TEXT NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    speed_kmh INT,
    heading_deg INT,
    accuracy_m INT,
    altitude_m INT,
    is_offline_batch BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL
);

SELECT create_hypertable('gps_traces', 'recorded_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_gps_trip ON gps_traces(trip_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_driver ON gps_traces(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_truck ON gps_traces(truck_id, recorded_at DESC);

SELECT add_retention_policy('gps_traces', INTERVAL '2 years', if_not_exists => TRUE);

-- ===================================================================
-- TABLE 2: Driver Activity Logs
-- Stores driver activity (rest, fuel, checkpoint delays)
-- ===================================================================
CREATE TABLE IF NOT EXISTS driver_activity_logs (
    driver_id TEXT NOT NULL,
    trip_id TEXT,
    activity_type TEXT NOT NULL,
    duration_minutes INT,
    geo_lat DECIMAL(9,6),
    geo_lng DECIMAL(9,6),
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL
);

SELECT create_hypertable('driver_activity_logs', 'recorded_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_activity_driver ON driver_activity_logs(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_trip ON driver_activity_logs(trip_id, recorded_at DESC);

SELECT add_retention_policy('driver_activity_logs', INTERVAL '1 year', if_not_exists => TRUE);

-- ===================================================================
-- TABLE 3: Corridor Snapshots
-- Time-series aggregate data for corridor health monitoring
-- ===================================================================
CREATE TABLE IF NOT EXISTS corridor_snapshots (
    corridor_id TEXT NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL,
    active_trucks INT DEFAULT 0,
    active_loads INT DEFAULT 0,
    load_to_truck_ratio DECIMAL(5,2),
    backhaul_pct DECIMAL(5,2),
    avg_margin_etb DECIMAL(10,2),
    avg_margin_etb_30d DECIMAL(10,2),
    stddev_margin_etb_30d DECIMAL(10,2),
    margin_snapshot_count INT DEFAULT 0,
    incident_count INT DEFAULT 0,
    payment_delay_rate DECIMAL(5,2),
    avg_idle_hours DECIMAL(6,2),
    avg_trip_duration_hours DECIMAL(6,2),
    fuel_index DECIMAL(6,3),
    demand_fill_rate DECIMAL(5,2),
    avg_acceptance_time_min DECIMAL(6,2),
    weather_condition TEXT,
    road_quality_avg DECIMAL(3,1),
    PRIMARY KEY (corridor_id, snapshot_at)
);

SELECT create_hypertable('corridor_snapshots', 'snapshot_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_snapshots_corridor ON corridor_snapshots(corridor_id, snapshot_at DESC);

SELECT add_retention_policy('corridor_snapshots', INTERVAL '3 years', if_not_exists => TRUE);

-- ===================================================================
-- TABLE 4: Orderer Behavior Snapshots
-- Time-series behavioral analytics for orderer scoring
-- ===================================================================
CREATE TABLE IF NOT EXISTS orderer_behavior_snapshots (
    orderer_id TEXT NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL,
    loads_created_30d INT DEFAULT 0,
    avg_load_value_etb DECIMAL(10,2),
    avg_counter_offer_delta DECIMAL(5,2),
    counter_offer_rate DECIMAL(5,2),
    acceptance_rate DECIMAL(5,2),
    avg_booking_lead_days DECIMAL(4,1),
    preferred_pickup_hour INT,
    most_used_corridor_id TEXT,
    payment_delay_rate DECIMAL(5,2),
    PRIMARY KEY (orderer_id, snapshot_at)
);

SELECT create_hypertable('orderer_behavior_snapshots', 'snapshot_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_behavior_orderer ON orderer_behavior_snapshots(orderer_id, snapshot_at DESC);

SELECT add_retention_policy('orderer_behavior_snapshots', INTERVAL '2 years', if_not_exists => TRUE);
