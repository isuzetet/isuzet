-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "current_lat" DECIMAL(10,6),
ADD COLUMN     "current_lng" DECIMAL(10,6),
ADD COLUMN     "last_location_at" TIMESTAMP(3),
ADD COLUMN     "last_ping_source" TEXT;

-- CreateTable
CREATE TABLE "location_pings" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "load_id" TEXT,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "accuracy" DECIMAL(8,2),
    "speed_kmh" DECIMAL(6,2),
    "heading_deg" DECIMAL(5,1),
    "altitude_m" DECIMAL(8,2),
    "battery_level" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'PHONE',
    "is_offline_sync" BOOLEAN NOT NULL DEFAULT false,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_registrations" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "device_type" TEXT NOT NULL DEFAULT 'GPS_HARDWARE',
    "device_serial" TEXT,
    "api_key" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_pings_trip_id_created_at_idx" ON "location_pings"("trip_id", "created_at");

-- CreateIndex
CREATE INDEX "location_pings_driver_id_created_at_idx" ON "location_pings"("driver_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_api_key_key" ON "device_registrations"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_api_key_hash_key" ON "device_registrations"("api_key_hash");
