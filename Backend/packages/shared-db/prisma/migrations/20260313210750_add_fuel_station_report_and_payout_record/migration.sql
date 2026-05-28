-- CreateTable
CREATE TABLE "fuel_station_reports" (
    "id" VARCHAR(26) NOT NULL,
    "station_name" TEXT NOT NULL,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "corridor_id" VARCHAR(26),
    "zone_id" VARCHAR(26),
    "has_fuel" BOOLEAN NOT NULL,
    "is_limited" BOOLEAN NOT NULL DEFAULT false,
    "queue_over_one_hour" BOOLEAN NOT NULL DEFAULT false,
    "diesel_price_etb" DECIMAL(6,2),
    "reported_by_user_id" VARCHAR(26) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verification_count" INTEGER NOT NULL DEFAULT 0,
    "bonus_paid" BOOLEAN NOT NULL DEFAULT false,
    "bonus_paid_etb" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_station_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_records" (
    "id" VARCHAR(26) NOT NULL,
    "recipient_user_id" VARCHAR(26) NOT NULL,
    "trip_id" VARCHAR(26),
    "payout_type" TEXT NOT NULL,
    "amount_etb" DECIMAL(12,2) NOT NULL,
    "payment_rail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sla_target_minutes" INTEGER NOT NULL,
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "initiated_by_system_job" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_station_reports_corridor_id_expires_at_idx" ON "fuel_station_reports"("corridor_id", "expires_at");

-- CreateIndex
CREATE INDEX "fuel_station_reports_lat_lng_idx" ON "fuel_station_reports"("lat", "lng");

-- CreateIndex
CREATE INDEX "fuel_station_reports_has_fuel_expires_at_idx" ON "fuel_station_reports"("has_fuel", "expires_at");

-- CreateIndex
CREATE INDEX "payout_records_recipient_user_id_status_idx" ON "payout_records"("recipient_user_id", "status");

-- CreateIndex
CREATE INDEX "payout_records_payout_type_status_idx" ON "payout_records"("payout_type", "status");

-- CreateIndex
CREATE INDEX "payout_records_created_at_idx" ON "payout_records"("created_at");
