/*
  Warnings:

  - The `fuel_type` column on the `trucks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CorridorType" AS ENUM ('INTERCITY', 'INTRACITY', 'REGIONAL');

-- CreateEnum
CREATE TYPE "TruckBrand" AS ENUM ('ISUZU', 'TATA', 'SINO', 'FAW', 'FOTON', 'HINO', 'MERCEDES', 'ASHOK_LEYLAND', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'PETROL');

-- CreateEnum
CREATE TYPE "BackhaulStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsolidatedLoadStatus" AS ENUM ('BUILDING', 'COLLECTING', 'READY', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubLoadStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "AggregatorType" AS ENUM ('FIELD_AGENT', 'CONSOLIDATION_AGENT', 'ERP_SYSTEM', 'SELF_ORGANIZED');

-- CreateEnum
CREATE TYPE "ConsolidationShortfallPolicy" AS ENUM ('PLATFORM_ABSORB', 'DISTRIBUTE', 'AGENT_BEARS');

-- CreateEnum
CREATE TYPE "BrokerSuggestionStatus" AS ENUM ('PENDING', 'FLEET_ACCEPTED', 'ORDERER_ACCEPTED', 'BOTH_ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverEarningType" AS ENUM ('ON_TIME_BONUS', 'CHECKPOINT_BONUS', 'FUEL_REPORT_BONUS', 'BACKHAUL_BONUS', 'PERFECT_WEEK');

-- CreateEnum
CREATE TYPE "DriverEarningStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "LiquidityIncentiveType" AS ENUM ('GUARANTEED_MINIMUM', 'FUEL_SUBSIDY', 'BROKER_BONUS', 'DRIVER_BONUS');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecoveryResourceType" AS ENUM ('MECHANIC', 'TOW_TRUCK', 'REPLACEMENT_TRUCK', 'FUEL_DELIVERY');

-- CreateEnum
CREATE TYPE "TripEventType" AS ENUM ('PICKUP_CONFIRMED', 'CHECKPOINT_LOGGED', 'DELIVERY_CONFIRMED', 'CARGO_CONDITION_RECORDED', 'SOS_TRIGGERED', 'INCIDENT_REPORTED');

-- CreateEnum
CREATE TYPE "TripEventReconciliationStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED');

-- CreateEnum
CREATE TYPE "ShiftDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "FuelPriceSource" AS ENUM ('MANUAL', 'DRIVER_REPORT', 'API');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('FIELD_AGENT', 'CONSOLIDATION_AGENT');

-- CreateEnum
CREATE TYPE "TripStopStatus" AS ENUM ('PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RoadAlertType" AS ENUM ('POLICE_ACTIVE', 'WEIGHBRIDGE_STRICT', 'ROAD_DAMAGE', 'FLOODING', 'FUEL_EMPTY', 'ACCIDENT', 'ROAD_CLOSED', 'CHECKPOINT_CLOSED');

-- CreateEnum
CREATE TYPE "DirectBookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SecurityZoneStatus" AS ENUM ('NORMAL', 'ELEVATED', 'RESTRICTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RelayStatus" AS ENUM ('PENDING', 'ACTIVE', 'HANDED_OFF', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'TYRE_ROTATION', 'BRAKE_SERVICE', 'BRAKE_CHECK', 'FULL_SERVICE', 'ENGINE_SERVICE', 'ENGINE_REPAIR', 'BODY_REPAIR', 'REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "CargoOfferStatus" AS ENUM ('OPEN', 'CONSOLIDATED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'REPAID', 'OVERDUE', 'DEFAULTED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('DRIVER_TO_DRIVER', 'FLEET_TO_FLEET', 'AGENT_TO_FLEET');

-- CreateEnum
CREATE TYPE "BlockPreferenceType" AS ENUM ('PREFERRED', 'BLOCKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'FIELD_AGENT';
ALTER TYPE "Role" ADD VALUE 'BROKER';

-- AlterTable
ALTER TABLE "corridors" ADD COLUMN     "average_transit_minutes" INTEGER,
ADD COLUMN     "checkpoint_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "corridor_type" "CorridorType" NOT NULL DEFAULT 'INTERCITY',
ADD COLUMN     "destination_zone_id" TEXT,
ADD COLUMN     "expected_checkpoint_fee_etb" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_night_time_restricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "night_restriction_reason" TEXT,
ADD COLUMN     "origin_zone_id" TEXT,
ADD COLUMN     "peak_hour_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
ADD COLUMN     "road_condition_score" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "seasonal_closure_months" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
ADD COLUMN     "current_lat" DECIMAL(10,6),
ADD COLUMN     "current_lng" DECIMAL(10,6),
ADD COLUMN     "current_zone_id" TEXT,
ADD COLUMN     "driving_hours_today" DECIMAL(4,1) NOT NULL DEFAULT 0,
ADD COLUMN     "has_smartphone" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "home_zone_id" TEXT,
ADD COLUMN     "languages_spoken" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "last_driving_hours_reset" TIMESTAMP(3),
ADD COLUMN     "on_time_delivery_rate" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
ADD COLUMN     "preferred_zone_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shift_ends_at" TIMESTAMP(3),
ADD COLUMN     "shift_starts_at" TIMESTAMP(3),
ADD COLUMN     "total_km_driven" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_trips_completed_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "load_stops" ADD COLUMN     "actual_departed_at" TIMESTAMP(3),
ADD COLUMN     "actual_weight_kg" INTEGER,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "requires_signature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signature_obtained" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "special_instructions" TEXT,
ADD COLUMN     "waiting_minutes" INTEGER,
ADD COLUMN     "zone_id" TEXT;

-- AlterTable
ALTER TABLE "load_templates" ADD COLUMN     "auto_post_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_post_schedule" TEXT,
ADD COLUMN     "cargo_type_ml" TEXT,
ADD COLUMN     "insurance_required_ml" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_hazardous_ml" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "preferred_body_type" TEXT,
ADD COLUMN     "requires_refrigeration_ml" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stops_json" JSONB,
ADD COLUMN     "typical_escrow_etb" INTEGER,
ADD COLUMN     "typical_weight_kg" INTEGER,
ADD COLUMN     "use_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "actual_delivery_at" TIMESTAMP(3),
ADD COLUMN     "actual_pickup_at" TIMESTAMP(3),
ADD COLUMN     "delivery_zone_id" TEXT,
ADD COLUMN     "expected_loading_minutes" INTEGER,
ADD COLUMN     "expected_unloading_minutes" INTEGER,
ADD COLUMN     "fast_track" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overload_warning_issued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickup_zone_id" TEXT,
ADD COLUMN     "template_reference_id" TEXT,
ADD COLUMN     "total_checkpoint_fees_etb" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "urgency_level_enum" TEXT;

-- AlterTable
ALTER TABLE "trucks" ADD COLUMN     "available_at_lat" DECIMAL(10,6),
ADD COLUMN     "available_at_lng" DECIMAL(10,6),
ADD COLUMN     "available_from_at" TIMESTAMP(3),
ADD COLUMN     "average_fuel_consumption_lper100km" DECIMAL(5,2),
ADD COLUMN     "current_lat" DECIMAL(10,6),
ADD COLUMN     "current_lng" DECIMAL(10,6),
ADD COLUMN     "current_zone_id" TEXT,
ADD COLUMN     "gross_vehicle_weight_kg" INTEGER,
ADD COLUMN     "home_zone_id" TEXT,
ADD COLUMN     "last_known_odometer_km" INTEGER,
ADD COLUMN     "legal_payload_kg" INTEGER,
ADD COLUMN     "manufacture_year" INTEGER,
ADD COLUMN     "next_service_due_km" INTEGER,
ADD COLUMN     "preferred_corridor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "truck_brand" "TruckBrand" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "truck_model_detail" TEXT,
DROP COLUMN "fuel_type",
ADD COLUMN     "fuel_type" "FuelType" NOT NULL DEFAULT 'DIESEL';

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Addis Ababa',
    "bounding_box_north_lat" DECIMAL(10,6) NOT NULL,
    "bounding_box_south_lat" DECIMAL(10,6) NOT NULL,
    "bounding_box_east_lng" DECIMAL(10,6) NOT NULL,
    "bounding_box_west_lng" DECIMAL(10,6) NOT NULL,
    "center_lat" DECIMAL(10,6) NOT NULL,
    "center_lng" DECIMAL(10,6) NOT NULL,
    "is_commercial" BOOLEAN NOT NULL DEFAULT true,
    "adjacent_zone_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "truck_demand_index" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "average_transit_minutes_off_peak" INTEGER NOT NULL DEFAULT 30,
    "average_transit_minutes_peak" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "current_queue_count" INTEGER NOT NULL DEFAULT 0,
    "average_wait_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "operating_hours_start" TEXT NOT NULL DEFAULT '06:00',
    "operating_hours_end" TEXT NOT NULL DEFAULT '20:00',
    "is_major_interchange" BOOLEAN NOT NULL DEFAULT false,
    "has_overnight_parking" BOOLEAN NOT NULL DEFAULT false,
    "has_fuel_nearby" BOOLEAN NOT NULL DEFAULT false,
    "has_mechanic" BOOLEAN NOT NULL DEFAULT false,
    "queue_radius_meters" INTEGER NOT NULL DEFAULT 400,
    "presence_ping_interval_minutes" INTEGER NOT NULL DEFAULT 15,
    "absence_grace_period_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminal_queue_entries" (
    "id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_presence_ping_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queue_position" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "dropped_at" TIMESTAMP(3),
    "drop_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminal_queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backhaul_suggestions" (
    "id" TEXT NOT NULL,
    "source_trip_id" TEXT NOT NULL,
    "suggested_load_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "projected_free_at" TIMESTAMP(3) NOT NULL,
    "projected_free_lat" DECIMAL(10,6) NOT NULL,
    "projected_free_lng" DECIMAL(10,6) NOT NULL,
    "distance_to_pickup_km" DECIMAL(8,2) NOT NULL,
    "match_score" DECIMAL(5,2) NOT NULL,
    "bonus_offered_etb" INTEGER NOT NULL DEFAULT 0,
    "is_night_restricted" BOOLEAN NOT NULL DEFAULT false,
    "status" "BackhaulStatus" NOT NULL DEFAULT 'PENDING',
    "notified_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backhaul_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_suggestions" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "status" "BrokerSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "fleet_accepted_at" TIMESTAMP(3),
    "orderer_accepted_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "commission_etb" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidated_loads" (
    "id" TEXT NOT NULL,
    "master_load_id" TEXT,
    "consolidation_type" TEXT NOT NULL,
    "agent_id" VARCHAR(26),
    "aggregator_id" TEXT NOT NULL,
    "aggregatorType" "AggregatorType" NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "corridor_id" TEXT NOT NULL,
    "total_weight_kg" INTEGER NOT NULL DEFAULT 0,
    "truck_capacity_kg" INTEGER,
    "total_escrow_etb" INTEGER NOT NULL DEFAULT 0,
    "status" "ConsolidatedLoadStatus" NOT NULL DEFAULT 'COLLECTING',
    "load_id" VARCHAR(26),
    "collection_deadline" TIMESTAMP(3) NOT NULL,
    "minimum_fill_pct" INTEGER NOT NULL DEFAULT 70,
    "current_fill_pct" INTEGER NOT NULL DEFAULT 0,
    "shortfallPolicy" "ConsolidationShortfallPolicy" NOT NULL DEFAULT 'DISTRIBUTE',
    "distribution_point_address" TEXT,
    "distribution_point_lat" DECIMAL(10,6),
    "distribution_point_lng" DECIMAL(10,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidated_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_loads" (
    "id" TEXT NOT NULL,
    "consolidated_load_id" TEXT NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "weight_kg" INTEGER NOT NULL,
    "weight_quintals" DECIMAL(10,2) NOT NULL,
    "cargo_description" TEXT NOT NULL,
    "cargo_type" TEXT NOT NULL DEFAULT 'GENERAL',
    "escrow_amount_etb" INTEGER NOT NULL,
    "pickup_address" TEXT,
    "delivery_address" TEXT,
    "status" "SubLoadStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "operating_zone_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operating_corridor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "distribution_point_lat" DECIMAL(10,6),
    "distribution_point_lng" DECIMAL(10,6),
    "distribution_point_address" TEXT,
    "warehouse_capacity_kg" INTEGER,
    "commission_rate_pct" DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "total_consolidations" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidation_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brokers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "operating_zone_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operating_corridor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commission_per_match_etb" INTEGER NOT NULL DEFAULT 20000,
    "total_matches_completed" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "total_earnings_etb" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoint_intelligence" (
    "id" TEXT NOT NULL,
    "corridor_id" TEXT,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "checkpoint_type" TEXT NOT NULL,
    "location_name" TEXT,
    "average_fee_etb" INTEGER NOT NULL DEFAULT 0,
    "max_fee_etb" INTEGER NOT NULL DEFAULT 0,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "is_official_toll" BOOLEAN NOT NULL DEFAULT false,
    "last_reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoint_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weighbridge_logs" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "corridor_id" TEXT,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "location_name" TEXT,
    "recorded_weight_kg" INTEGER NOT NULL,
    "legal_limit_kg" INTEGER NOT NULL,
    "tolerance_kg" INTEGER NOT NULL,
    "was_overweight" BOOLEAN NOT NULL,
    "within_tolerance" BOOLEAN NOT NULL DEFAULT true,
    "fine_amount_etb" INTEGER NOT NULL DEFAULT 0,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weighbridge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_price_snapshots" (
    "id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diesel_price_etb_per_liter" DECIMAL(6,2) NOT NULL,
    "petrol_price_etb_per_liter" DECIMAL(6,2),
    "region" TEXT NOT NULL,
    "source" "FuelPriceSource" NOT NULL DEFAULT 'MANUAL',
    "reported_by_driver_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_deviations" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "deviation_start_lat" DECIMAL(10,6) NOT NULL,
    "deviation_start_lng" DECIMAL(10,6) NOT NULL,
    "deviated_at" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "deviation_km" DECIMAL(8,2) NOT NULL,
    "reason" TEXT,
    "was_authorized" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_ops" BOOLEAN NOT NULL DEFAULT false,
    "penalty_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_deviations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_availability_slots" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "fleet_owner_id" TEXT,
    "available_from" TIMESTAMP(3) NOT NULL,
    "available_until" TIMESTAMP(3),
    "location_lat" DECIMAL(10,6) NOT NULL,
    "location_lng" DECIMAL(10,6) NOT NULL,
    "zone_id" TEXT,
    "corridor_preference_id" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_days" "ShiftDay"[] DEFAULT ARRAY[]::"ShiftDay"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "voucher_type" TEXT NOT NULL,
    "amount_etb" INTEGER NOT NULL,
    "issued_by_user_id" TEXT NOT NULL,
    "redeemed_by_user_id" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "redeemed_at" TIMESTAMP(3),
    "corridor_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_incentives" (
    "id" TEXT NOT NULL,
    "corridor_id" TEXT,
    "zone_id" TEXT,
    "target_type" TEXT,
    "target_id" TEXT,
    "incentiveType" "LiquidityIncentiveType" NOT NULL,
    "value_etb" INTEGER NOT NULL,
    "trigger_condition" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "description" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_usage_count" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidity_incentives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "resourceType" "RecoveryResourceType" NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_phone" TEXT NOT NULL,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "zone_id" TEXT,
    "corridor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "average_response_minutes" INTEGER NOT NULL DEFAULT 60,
    "average_rate_etb" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3),
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_earnings" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "load_id" TEXT,
    "earning_type" "DriverEarningType" NOT NULL,
    "amount_etb" INTEGER NOT NULL,
    "status" "DriverEarningStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "paid_by_fleet_owner" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_event_logs" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "event_type" "TripEventType" NOT NULL,
    "event_data" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "was_offline" BOOLEAN NOT NULL DEFAULT false,
    "reconciliation_status" "TripEventReconciliationStatus" NOT NULL DEFAULT 'ACCEPTED',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_records" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "referral_type" "ReferralType",
    "trigger_condition" TEXT,
    "bonus_cents" INTEGER,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reward_amount_etb" INTEGER NOT NULL DEFAULT 0,
    "qualified_at" TIMESTAMP(3),
    "reward_paid_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_demand_snapshots" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "available_trucks" INTEGER NOT NULL DEFAULT 0,
    "open_loads" INTEGER NOT NULL DEFAULT 0,
    "demand_index" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "terminal_queue_count" INTEGER NOT NULL DEFAULT 0,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_demand_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_configs" (
    "id" VARCHAR(26) NOT NULL,
    "version_name" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "created_by_user_id" VARCHAR(26),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_stops" (
    "id" VARCHAR(26) NOT NULL,
    "trip_id" VARCHAR(26) NOT NULL,
    "stop_number" INTEGER NOT NULL,
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "location_name" TEXT NOT NULL,
    "cargo_quantity_kg" INTEGER NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "time_window_start" TIMESTAMP(3),
    "time_window_end" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "pod_photo_url" TEXT,
    "pod_signature_url" TEXT,
    "recipient_otp" TEXT,
    "status" "TripStopStatus" NOT NULL DEFAULT 'PENDING',
    "escrow_release_pct" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_offers" (
    "id" VARCHAR(26) NOT NULL,
    "agent_id" VARCHAR(26) NOT NULL,
    "trader_id" VARCHAR(26) NOT NULL,
    "corridor_id" VARCHAR(26) NOT NULL,
    "origin_zone_id" VARCHAR(26) NOT NULL,
    "dest_zone_id" VARCHAR(26) NOT NULL,
    "cargo_type" TEXT NOT NULL,
    "weight_kg" INTEGER NOT NULL,
    "pickup_date" TIMESTAMP(3) NOT NULL,
    "status" "CargoOfferStatus" NOT NULL DEFAULT 'OPEN',
    "consolidated_load_id" VARCHAR(26),
    "escrow_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "payment_rail_id" TEXT,
    "agent_settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargo_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_contracts" (
    "id" VARCHAR(26) NOT NULL,
    "orderer_id" VARCHAR(26) NOT NULL,
    "preferred_fleet_id" VARCHAR(26),
    "corridor_id" VARCHAR(26) NOT NULL,
    "cargo_type" TEXT NOT NULL,
    "weight_kg" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "agreed_rate_cents" INTEGER NOT NULL,
    "auto_post" BOOLEAN NOT NULL DEFAULT true,
    "next_post_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trip_count" INTEGER NOT NULL DEFAULT 0,
    "renewal_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_relays" (
    "id" VARCHAR(26) NOT NULL,
    "trip_id" VARCHAR(26) NOT NULL,
    "primary_driver_id" VARCHAR(26) NOT NULL,
    "secondary_driver_id" VARCHAR(26) NOT NULL,
    "handoff_lat" DOUBLE PRECISION,
    "handoff_lng" DOUBLE PRECISION,
    "handoff_at" TIMESTAMP(3),
    "earnings_split_pct" INTEGER NOT NULL,
    "primary_status" "RelayStatus" NOT NULL DEFAULT 'PENDING',
    "secondary_status" "RelayStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_relays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_cooperatives" (
    "id" VARCHAR(26) NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "registration_number" TEXT NOT NULL,
    "dispatcher_user_id" VARCHAR(26) NOT NULL,
    "zone_id" VARCHAR(26) NOT NULL,
    "trust_tier" INTEGER NOT NULL DEFAULT 2,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_cooperatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperative_members" (
    "id" VARCHAR(26) NOT NULL,
    "cooperative_id" VARCHAR(26) NOT NULL,
    "fleet_owner_id" VARCHAR(26) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooperative_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_alerts" (
    "id" VARCHAR(26) NOT NULL,
    "driver_id" VARCHAR(26) NOT NULL,
    "corridor_id" VARCHAR(26),
    "alert_type" "RoadAlertType" NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "confirmed_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bonus_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "off_platform_trips" (
    "id" VARCHAR(26) NOT NULL,
    "driver_id" VARCHAR(26) NOT NULL,
    "fleet_owner_id" VARCHAR(26),
    "origin_zone_id" VARCHAR(26),
    "dest_zone_id" VARCHAR(26),
    "corridor_id" VARCHAR(26),
    "cargo_type" TEXT,
    "weight_kg" INTEGER,
    "earnings_cents" INTEGER,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "verified_by_fleet_owner" BOOLEAN NOT NULL DEFAULT false,
    "trust_weight_pct" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "off_platform_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" VARCHAR(26) NOT NULL,
    "truck_id" VARCHAR(26) NOT NULL,
    "service_type" "MaintenanceType" NOT NULL,
    "description" TEXT,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "serviced_at" TIMESTAMP(3) NOT NULL,
    "next_service_due" TIMESTAMP(3),
    "next_service_km" INTEGER,
    "mechanic" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_queues" (
    "id" VARCHAR(26) NOT NULL,
    "location_name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "zone_id" VARCHAR(26) NOT NULL,
    "current_wait_min" INTEGER NOT NULL DEFAULT 0,
    "last_reported_at" TIMESTAMP(3),
    "reported_by_driver_id" VARCHAR(26),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_bookings" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" VARCHAR(26) NOT NULL,
    "orderer_id" VARCHAR(26) NOT NULL,
    "requested_driver_id" VARCHAR(26) NOT NULL,
    "requested_truck_id" VARCHAR(26),
    "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "DirectBookingStatus" NOT NULL DEFAULT 'PENDING',
    "blocked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_wallets" (
    "id" VARCHAR(26) NOT NULL,
    "agent_user_id" VARCHAR(26) NOT NULL,
    "balance_cents" INTEGER NOT NULL DEFAULT 0,
    "pending_settlement_cents" INTEGER NOT NULL DEFAULT 0,
    "last_settled_at" TIMESTAMP(3),
    "total_collected_cents" INTEGER NOT NULL DEFAULT 0,
    "total_settled_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_ledger_entries" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" VARCHAR(26),
    "trip_id" VARCHAR(26),
    "from_user_id" VARCHAR(26),
    "to_user_id" VARCHAR(26),
    "amount_cents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payment_rail_id" TEXT,
    "provider_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrow_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_credit_loans" (
    "id" VARCHAR(26) NOT NULL,
    "borrower_user_id" VARCHAR(26) NOT NULL,
    "guarantor_agent_id" VARCHAR(26),
    "load_id" VARCHAR(26),
    "amount_cents" INTEGER NOT NULL,
    "due_date_at" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "repaid_at" TIMESTAMP(3),
    "repaid_cents" INTEGER NOT NULL DEFAULT 0,
    "late_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "agent_hold_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_credit_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_zones" (
    "id" VARCHAR(26) NOT NULL,
    "corridor_id" VARCHAR(26) NOT NULL,
    "status" "SecurityZoneStatus" NOT NULL DEFAULT 'NORMAL',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" VARCHAR(26),
    "description" TEXT,
    "data_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_days" (
    "id" VARCHAR(26) NOT NULL,
    "zone_id" VARCHAR(26) NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "market_name" TEXT NOT NULL,
    "demand_boost_pct" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_block_preferences" (
    "id" VARCHAR(26) NOT NULL,
    "from_user_id" VARCHAR(26) NOT NULL,
    "to_user_id" VARCHAR(26) NOT NULL,
    "type" "BlockPreferenceType" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_block_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terminal_queue_entries_terminal_id_truck_id_is_active_key" ON "terminal_queue_entries"("terminal_id", "truck_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_agents_user_id_key" ON "consolidation_agents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_user_id_key" ON "brokers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "digital_vouchers_code_key" ON "digital_vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_records_referrer_id_referred_id_key" ON "referral_records"("referrer_id", "referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_cooperatives_registration_number_key" ON "transport_cooperatives"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "agent_wallets_agent_user_id_key" ON "agent_wallets"("agent_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "load_block_preferences_from_user_id_to_user_id_key" ON "load_block_preferences"("from_user_id", "to_user_id");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_current_zone_id_fkey" FOREIGN KEY ("current_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_home_zone_id_fkey" FOREIGN KEY ("home_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_home_zone_id_fkey" FOREIGN KEY ("home_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_current_zone_id_fkey" FOREIGN KEY ("current_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridors" ADD CONSTRAINT "corridors_origin_zone_id_fkey" FOREIGN KEY ("origin_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridors" ADD CONSTRAINT "corridors_destination_zone_id_fkey" FOREIGN KEY ("destination_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "load_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_pickup_zone_id_fkey" FOREIGN KEY ("pickup_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminal_queue_entries" ADD CONSTRAINT "terminal_queue_entries_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_loads" ADD CONSTRAINT "sub_loads_consolidated_load_id_fkey" FOREIGN KEY ("consolidated_load_id") REFERENCES "consolidated_loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_offers" ADD CONSTRAINT "cargo_offers_consolidated_load_id_fkey" FOREIGN KEY ("consolidated_load_id") REFERENCES "consolidated_loads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_members" ADD CONSTRAINT "cooperative_members_cooperative_id_fkey" FOREIGN KEY ("cooperative_id") REFERENCES "transport_cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
