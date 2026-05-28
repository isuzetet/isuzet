-- AlterTable
ALTER TABLE "fleet_owners" ALTER COLUMN "payout_speed" SET DEFAULT 'T0';

-- AlterTable
ALTER TABLE "load_stops" ADD COLUMN     "pickup_photo_at" TIMESTAMP(3),
ADD COLUMN     "pickup_photo_lat" DECIMAL(10,6),
ADD COLUMN     "pickup_photo_lng" DECIMAL(10,6),
ADD COLUMN     "pickup_photo_url" TEXT,
ADD COLUMN     "weight_ticket_photo_url" TEXT;

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "current_offer_driver_id" VARCHAR(26),
ADD COLUMN     "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offer_expires_at" TIMESTAMP(3),
ADD COLUMN     "offer_round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offer_sent_at" TIMESTAMP(3),
ADD COLUMN     "total_declines" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "strategy_versions" ADD COLUMN     "commission_max_etb" INTEGER NOT NULL DEFAULT 30000,
ADD COLUMN     "commission_min_etb" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "commission_tier_1_max_etb" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "commission_tier_1_pct" DECIMAL(4,3) NOT NULL DEFAULT 0.12,
ADD COLUMN     "commission_tier_2_max_etb" INTEGER NOT NULL DEFAULT 30000,
ADD COLUMN     "commission_tier_2_pct" DECIMAL(4,3) NOT NULL DEFAULT 0.10,
ADD COLUMN     "commission_tier_3_max_etb" INTEGER NOT NULL DEFAULT 100000,
ADD COLUMN     "commission_tier_3_pct" DECIMAL(4,3) NOT NULL DEFAULT 0.08,
ADD COLUMN     "commission_tier_4_pct" DECIMAL(4,3) NOT NULL DEFAULT 0.06;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payment_phone" TEXT,
ADD COLUMN     "sim_name_mismatch" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payment_rail_configs" (
    "rail" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sla_target_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_rail_configs_pkey" PRIMARY KEY ("rail")
);

-- CreateTable
CREATE TABLE "trust_score_events" (
    "id" VARCHAR(26) NOT NULL,
    "driver_id" TEXT NOT NULL,
    "previous_score" DECIMAL(5,2) NOT NULL,
    "new_score" DECIMAL(5,2) NOT NULL,
    "previous_tier" INTEGER NOT NULL,
    "new_tier" INTEGER NOT NULL,
    "reason" TEXT,
    "trip_id" TEXT,
    "incident_id" TEXT,
    "score_delta" DECIMAL(5,2),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_tier_milestones" (
    "id" VARCHAR(26) NOT NULL,
    "driver_id" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bonus_amount_etb" INTEGER,
    "physical_kit_sent" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_tier_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_threshold_snapshots" (
    "id" VARCHAR(26) NOT NULL,
    "strategy_version_id" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "floor_price_per_km_per_quintal" DECIMAL(8,2) NOT NULL,
    "urban_deviation_threshold_km" DECIMAL(6,2) NOT NULL,
    "intercity_deviation_threshold_km" DECIMAL(6,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_threshold_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safe_parking_locations" (
    "id" VARCHAR(26) NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "corridor_id" TEXT,
    "zone_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PUBLIC',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "bookingPrice" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safe_parking_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_payment_preferences" (
    "id" VARCHAR(26) NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryRail" TEXT NOT NULL,
    "secondaryRail" TEXT,
    "tertiaryRail" TEXT,
    "auto_convert_to" TEXT,
    "auto_payout_enabled" BOOLEAN NOT NULL DEFAULT true,
    "payout_threshold_etb" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_payment_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_resolution_logs" (
    "id" VARCHAR(26) NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "dispute_type" TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "responder_id" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "resolution_reason" TEXT,
    "compensation_etb" DECIMAL(10,2),
    "resolution_agent_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_resolution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_waybills" (
    "id" VARCHAR(26) NOT NULL,
    "waybillNumber" TEXT NOT NULL,
    "tripId" VARCHAR(26) NOT NULL,
    "loadId" VARCHAR(26) NOT NULL,
    "shipperName" TEXT NOT NULL,
    "shipperPhone" TEXT,
    "shipperAddress" TEXT,
    "consigneeName" TEXT NOT NULL,
    "consigneePhone" TEXT,
    "consigneeAddress" TEXT,
    "originName" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "cargoDescription" TEXT NOT NULL,
    "declaredWeightKg" DECIMAL(10,2) NOT NULL,
    "declaredValueEtb" DECIMAL(12,2),
    "specialInstructions" TEXT,
    "plateNumber" TEXT NOT NULL,
    "driverFullName" TEXT NOT NULL,
    "driverLicenseNumber" TEXT,
    "driverPhone" TEXT NOT NULL,
    "qrCodeData" TEXT NOT NULL,
    "verifyUrl" TEXT NOT NULL,
    "cargoDescriptionAmharic" TEXT,
    "specialInstructionsAmharic" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_waybills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_offer_records" (
    "id" VARCHAR(26) NOT NULL,
    "loadId" VARCHAR(26) NOT NULL,
    "driverId" VARCHAR(26) NOT NULL,
    "truckId" VARCHAR(26) NOT NULL,
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "notificationSentApp" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentTelegram" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentSms" BOOLEAN NOT NULL DEFAULT false,
    "offerAmountEtb" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_offer_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_rail_configs_rail_key" ON "payment_rail_configs"("rail");

-- CreateIndex
CREATE UNIQUE INDEX "user_payment_preferences_userId_key" ON "user_payment_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "digital_waybills_waybillNumber_key" ON "digital_waybills"("waybillNumber");

-- CreateIndex
CREATE UNIQUE INDEX "digital_waybills_tripId_key" ON "digital_waybills"("tripId");

-- CreateIndex
CREATE INDEX "digital_waybills_tripId_idx" ON "digital_waybills"("tripId");

-- CreateIndex
CREATE INDEX "digital_waybills_waybillNumber_idx" ON "digital_waybills"("waybillNumber");

-- CreateIndex
CREATE INDEX "digital_waybills_loadId_idx" ON "digital_waybills"("loadId");

-- CreateIndex
CREATE INDEX "load_offer_records_loadId_status_idx" ON "load_offer_records"("loadId", "status");

-- CreateIndex
CREATE INDEX "load_offer_records_driverId_offeredAt_idx" ON "load_offer_records"("driverId", "offeredAt");

-- CreateIndex
CREATE INDEX "load_offer_records_status_expiresAt_idx" ON "load_offer_records"("status", "expiresAt");
