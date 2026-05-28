/*
  Warnings:

  - A unique constraint covering the columns `[telegram_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "face_verification_hash" TEXT,
ADD COLUMN     "face_verified_at" TIMESTAMP(3),
ADD COLUMN     "home_zone_registered" TEXT,
ADD COLUMN     "multi_sim_payment_phone" TEXT,
ADD COLUMN     "multi_sim_primary_phone" TEXT;

-- AlterTable
ALTER TABLE "off_platform_trips" ADD COLUMN     "destinationCity" TEXT,
ADD COLUMN     "distanceKm" DECIMAL(8,2),
ADD COLUMN     "earningsEtb" DECIMAL(12,2),
ADD COLUMN     "earningsGapEtb" DECIMAL(12,2),
ADD COLUMN     "fuelCostEtb" DECIMAL(10,2),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originCity" TEXT,
ADD COLUMN     "otherCostsEtb" DECIMAL(10,2),
ADD COLUMN     "platformEquivalentEtb" DECIMAL(12,2),
ADD COLUMN     "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'REPORTED',
ADD COLUMN     "tripDate" TIMESTAMP(3),
ADD COLUMN     "truckId" VARCHAR(26),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedByAgentId" VARCHAR(26),
ADD COLUMN     "weightQuintals" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "shock_events" ADD COLUMN     "actual_end_date" TIMESTAMP(3),
ADD COLUMN     "affected_corridor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "driver_advisory_text" TEXT,
ADD COLUMN     "estimated_duration_days" INTEGER,
ADD COLUMN     "pricing_adjustment_note" TEXT,
ADD COLUMN     "pricing_adjustment_pct" DECIMAL(5,2),
ADD COLUMN     "resolved_by_user_id" VARCHAR(26);

-- AlterTable
ALTER TABLE "trucks" ADD COLUMN     "is_private_fleet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketplace_available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "private_fleet_owner_id" VARCHAR(26);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferredPaymentRail" TEXT,
ADD COLUMN     "telegram_handle" TEXT,
ADD COLUMN     "telegram_id" TEXT,
ADD COLUMN     "telegram_linked_at" TIMESTAMP(3),
ADD COLUMN     "telegram_notifications_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "telegram_accounts" (
    "id" VARCHAR(26) NOT NULL,
    "user_id" VARCHAR(26) NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "telegram_handle" TEXT,
    "telegram_first_name" TEXT,
    "telegram_last_name" TEXT,
    "telegram_photo_url" TEXT,
    "link_code" TEXT,
    "link_code_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_location_syncs" (
    "id" VARCHAR(26) NOT NULL,
    "telegram_account_id" VARCHAR(26) NOT NULL,
    "driver_id" VARCHAR(26),
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "accuracy" DECIMAL(8,2),
    "live_period_seconds" INTEGER,
    "is_live_location" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_location_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_corridor_channels" (
    "id" VARCHAR(26) NOT NULL,
    "corridor_id" VARCHAR(26),
    "channel_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_username" TEXT,
    "channel_type" TEXT NOT NULL DEFAULT 'GROUP',
    "is_monitored" BOOLEAN NOT NULL DEFAULT true,
    "member_count" INTEGER,
    "last_message_at" TIMESTAMP(3),
    "last_harvest_at" TIMESTAMP(3),
    "load_post_count" INTEGER NOT NULL DEFAULT 0,
    "conversion_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_corridor_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_load_posts" (
    "id" VARCHAR(26) NOT NULL,
    "channel_id" VARCHAR(26) NOT NULL,
    "telegram_message_id" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsed_origin" TEXT,
    "parsed_destination" TEXT,
    "parsed_cargo_type" TEXT,
    "parsed_weight_quintals" DECIMAL(8,2),
    "parsed_rate_etb" DECIMAL(10,2),
    "parsed_rate_type" TEXT,
    "parsed_truck_size" TEXT,
    "parsed_phone" TEXT,
    "parse_confidence" DECIMAL(4,3) NOT NULL DEFAULT 0.0,
    "parse_status" TEXT NOT NULL DEFAULT 'PENDING',
    "is_converted" BOOLEAN NOT NULL DEFAULT false,
    "converted_to_load_id" VARCHAR(26),
    "converted_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3) NOT NULL,
    "harvested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_load_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" VARCHAR(26) NOT NULL,
    "truckId" VARCHAR(26) NOT NULL,
    "driverId" VARCHAR(26),
    "tripId" VARCHAR(26),
    "stationName" TEXT,
    "stationLat" DECIMAL(10,6),
    "stationLng" DECIMAL(10,6),
    "litersAdded" DECIMAL(8,2) NOT NULL,
    "pricePerLiterEtb" DECIMAL(6,2),
    "totalCostEtb" DECIMAL(10,2),
    "odometerKm" DECIMAL(10,2),
    "receiptPhotoUrl" TEXT,
    "isAnomalous" BOOLEAN NOT NULL DEFAULT false,
    "anomalyFlaggedAt" TIMESTAMP(3),
    "anomalyNotes" TEXT,
    "loggedByDriverApp" BOOLEAN NOT NULL DEFAULT true,
    "filledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_efficiency_profiles" (
    "id" VARCHAR(26) NOT NULL,
    "truckId" VARCHAR(26) NOT NULL,
    "expectedKmPerLiter" DECIMAL(5,2) NOT NULL,
    "actualKmPerLiter" DECIMAL(5,2),
    "lastCalculatedAt" TIMESTAMP(3),
    "totalFuelLogsCount" INTEGER NOT NULL DEFAULT 0,
    "totalLitersFilled" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalKmTracked" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "anomalyCount" INTEGER NOT NULL DEFAULT 0,
    "lastAnomalyAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_efficiency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings_comparisons" (
    "id" VARCHAR(26) NOT NULL,
    "driverId" VARCHAR(26) NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "offPlatformTripCount" INTEGER NOT NULL DEFAULT 0,
    "offPlatformEarningsEtb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "onPlatformTripCount" INTEGER NOT NULL DEFAULT 0,
    "onPlatformEarningsEtb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platformEquivalentEtb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalGapEtb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversionMessage" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_expiry_alerts" (
    "id" VARCHAR(26) NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" VARCHAR(26) NOT NULL,
    "ownerId" VARCHAR(26) NOT NULL,
    "documentType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "alertStatus" TEXT NOT NULL DEFAULT 'UPCOMING',
    "lastAlertSentAt" TIMESTAMP(3),
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "resolvedDocumentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_expiry_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderer_reliability_scores" (
    "id" VARCHAR(26) NOT NULL,
    "userId" VARCHAR(26) NOT NULL,
    "totalLoadsPosted" INTEGER NOT NULL DEFAULT 0,
    "totalLoadsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalLoadsCancelled" INTEGER NOT NULL DEFAULT 0,
    "totalLoadsAbandoned" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DECIMAL(4,3) NOT NULL DEFAULT 1.0,
    "cancellationRate" DECIMAL(4,3) NOT NULL DEFAULT 0.0,
    "noShowRate" DECIMAL(4,3) NOT NULL DEFAULT 0.0,
    "averageLoadReadinessMinutes" INTEGER NOT NULL DEFAULT 0,
    "averagePaymentDaysAfterDelivery" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    "reliabilityTier" TEXT NOT NULL DEFAULT 'NEW',
    "lastCalculatedAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orderer_reliability_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_orderer_ratings" (
    "id" VARCHAR(26) NOT NULL,
    "tripId" VARCHAR(26) NOT NULL,
    "raterId" VARCHAR(26) NOT NULL,
    "raterRole" TEXT NOT NULL,
    "rateeId" VARCHAR(26) NOT NULL,
    "rateeRole" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "punctualityScore" INTEGER,
    "communicationScore" INTEGER,
    "conditionScore" INTEGER,
    "paymentScore" INTEGER,
    "comment" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_orderer_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corridor_balancing_events" (
    "id" VARCHAR(26) NOT NULL,
    "corridorId" VARCHAR(26) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imbalanceDirection" TEXT NOT NULL,
    "outboundAvailableTrucks" INTEGER NOT NULL DEFAULT 0,
    "inboundAvailableTrucks" INTEGER NOT NULL DEFAULT 0,
    "outboundPendingLoads" INTEGER NOT NULL DEFAULT 0,
    "inboundPendingLoads" INTEGER NOT NULL DEFAULT 0,
    "imbalanceScore" DECIMAL(5,2) NOT NULL,
    "interventionType" TEXT,
    "interventionAppliedAt" TIMESTAMP(3),
    "priceIncentivePct" DECIMAL(5,2),
    "driversNotifiedCount" INTEGER NOT NULL DEFAULT 0,
    "loadsConsolidated" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "interventionEffective" BOOLEAN,

    CONSTRAINT "corridor_balancing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_accounts_user_id_key" ON "telegram_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_accounts_telegram_user_id_key" ON "telegram_accounts"("telegram_user_id");

-- CreateIndex
CREATE INDEX "telegram_accounts_telegram_user_id_idx" ON "telegram_accounts"("telegram_user_id");

-- CreateIndex
CREATE INDEX "telegram_location_syncs_telegram_account_id_received_at_idx" ON "telegram_location_syncs"("telegram_account_id", "received_at");

-- CreateIndex
CREATE INDEX "telegram_location_syncs_driver_id_received_at_idx" ON "telegram_location_syncs"("driver_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_corridor_channels_channel_id_key" ON "telegram_corridor_channels"("channel_id");

-- CreateIndex
CREATE INDEX "telegram_corridor_channels_corridor_id_idx" ON "telegram_corridor_channels"("corridor_id");

-- CreateIndex
CREATE INDEX "telegram_corridor_channels_is_monitored_idx" ON "telegram_corridor_channels"("is_monitored");

-- CreateIndex
CREATE INDEX "telegram_load_posts_channel_id_posted_at_idx" ON "telegram_load_posts"("channel_id", "posted_at");

-- CreateIndex
CREATE INDEX "telegram_load_posts_parse_status_harvested_at_idx" ON "telegram_load_posts"("parse_status", "harvested_at");

-- CreateIndex
CREATE INDEX "telegram_load_posts_is_converted_idx" ON "telegram_load_posts"("is_converted");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_load_posts_channel_id_telegram_message_id_key" ON "telegram_load_posts"("channel_id", "telegram_message_id");

-- CreateIndex
CREATE INDEX "fuel_logs_truckId_filledAt_idx" ON "fuel_logs"("truckId", "filledAt");

-- CreateIndex
CREATE INDEX "fuel_logs_driverId_filledAt_idx" ON "fuel_logs"("driverId", "filledAt");

-- CreateIndex
CREATE INDEX "fuel_logs_isAnomalous_idx" ON "fuel_logs"("isAnomalous");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_efficiency_profiles_truckId_key" ON "fuel_efficiency_profiles"("truckId");

-- CreateIndex
CREATE INDEX "fuel_efficiency_profiles_truckId_idx" ON "fuel_efficiency_profiles"("truckId");

-- CreateIndex
CREATE INDEX "earnings_comparisons_driverId_periodStartDate_idx" ON "earnings_comparisons"("driverId", "periodStartDate");

-- CreateIndex
CREATE INDEX "document_expiry_alerts_alertStatus_expiryDate_idx" ON "document_expiry_alerts"("alertStatus", "expiryDate");

-- CreateIndex
CREATE INDEX "document_expiry_alerts_ownerId_alertStatus_idx" ON "document_expiry_alerts"("ownerId", "alertStatus");

-- CreateIndex
CREATE UNIQUE INDEX "document_expiry_alerts_entityType_entityId_documentType_key" ON "document_expiry_alerts"("entityType", "entityId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "orderer_reliability_scores_userId_key" ON "orderer_reliability_scores"("userId");

-- CreateIndex
CREATE INDEX "orderer_reliability_scores_reliabilityTier_idx" ON "orderer_reliability_scores"("reliabilityTier");

-- CreateIndex
CREATE INDEX "orderer_reliability_scores_reliabilityScore_idx" ON "orderer_reliability_scores"("reliabilityScore");

-- CreateIndex
CREATE INDEX "driver_orderer_ratings_rateeId_createdAt_idx" ON "driver_orderer_ratings"("rateeId", "createdAt");

-- CreateIndex
CREATE INDEX "driver_orderer_ratings_tripId_idx" ON "driver_orderer_ratings"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_orderer_ratings_tripId_raterId_rateeId_key" ON "driver_orderer_ratings"("tripId", "raterId", "rateeId");

-- CreateIndex
CREATE INDEX "corridor_balancing_events_corridorId_detectedAt_idx" ON "corridor_balancing_events"("corridorId", "detectedAt");

-- CreateIndex
CREATE INDEX "corridor_balancing_events_imbalanceDirection_detectedAt_idx" ON "corridor_balancing_events"("imbalanceDirection", "detectedAt");

-- CreateIndex
CREATE INDEX "corridor_balancing_events_interventionType_idx" ON "corridor_balancing_events"("interventionType");

-- CreateIndex
CREATE INDEX "off_platform_trips_driver_id_tripDate_idx" ON "off_platform_trips"("driver_id", "tripDate");

-- CreateIndex
CREATE INDEX "off_platform_trips_status_idx" ON "off_platform_trips"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- AddForeignKey
ALTER TABLE "telegram_location_syncs" ADD CONSTRAINT "telegram_location_syncs_telegram_account_id_fkey" FOREIGN KEY ("telegram_account_id") REFERENCES "telegram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_load_posts" ADD CONSTRAINT "telegram_load_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "telegram_corridor_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
