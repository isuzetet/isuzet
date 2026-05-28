-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FLEET_OWNER', 'FLEET_MANAGER', 'DRIVER', 'ORDERER', 'OPS_ADMIN', 'OPS_VIEWER', 'FINANCE_OPS', 'SUPER_ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(26) NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_backup" TEXT,
    "email" TEXT,
    "full_name" TEXT NOT NULL,
    "full_name_amharic" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_KYC',
    "kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "preferred_language" TEXT NOT NULL DEFAULT 'am',
    "notification_channel" TEXT NOT NULL DEFAULT 'SMS',
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "device_id_primary" TEXT,
    "device_id_secondary" TEXT,
    "linked_account_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "account_type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "referral_code" TEXT,
    "referred_by_code" TEXT,
    "is_owner_operator" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_owners" (
    "id" VARCHAR(26) NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "company_name_amharic" TEXT,
    "tin_number" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "mobile_money_number" TEXT,
    "preferred_payout_method" TEXT NOT NULL DEFAULT 'BANK',
    "trust_score" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "trust_tier" INTEGER NOT NULL DEFAULT 0,
    "payout_speed" TEXT NOT NULL DEFAULT 'T7',
    "credit_limit_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_credit_eligible" BOOLEAN NOT NULL DEFAULT false,
    "region_access" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "load_weight_tier" INTEGER NOT NULL DEFAULT 1,
    "total_trips_completed" INTEGER NOT NULL DEFAULT 0,
    "total_revenue_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_reliability_score" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "fleet_size" INTEGER,
    "business_type" TEXT,
    "years_in_business" INTEGER,
    "primary_corridors" TEXT[],
    "reinvestment_rate" DECIMAL(5,2),
    "business_registration_number" TEXT,
    "trade_license_expiry" TIMESTAMP(3),
    "cbe_bank_account" TEXT,
    "monthly_revenue_estimate" INTEGER,
    "fleet_kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderers" (
    "id" VARCHAR(26) NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "company_name_amharic" TEXT,
    "tin_number" TEXT,
    "business_sector" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "mobile_money_number" TEXT,
    "preferred_payment_method" TEXT NOT NULL DEFAULT 'ESCROW',
    "payment_terms_days" INTEGER NOT NULL DEFAULT 0,
    "credit_score" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "credit_limit_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_credit_eligible" BOOLEAN NOT NULL DEFAULT false,
    "payment_reliability_score" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "avg_lead_time_days" DECIMAL(4,1),
    "price_sensitivity_score" DECIMAL(5,2),
    "preferred_truck_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seasonal_pattern" TEXT,
    "total_loads_created" INTEGER NOT NULL DEFAULT 0,
    "total_spend_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "business_registration_number" TEXT,
    "industry_sector" TEXT,
    "monthly_freight_spend" INTEGER,
    "credit_line_approved" BOOLEAN NOT NULL DEFAULT false,
    "credit_line_limit_etb" INTEGER NOT NULL DEFAULT 0,
    "preferred_truck_body_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "api_access_enabled" BOOLEAN NOT NULL DEFAULT false,
    "webhook_url" TEXT,
    "orderer_kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orderers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" VARCHAR(26) NOT NULL,
    "user_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT,
    "license_number" TEXT NOT NULL,
    "license_class" TEXT,
    "license_expiry" TIMESTAMP(3),
    "trust_score" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "trust_tier" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "on_time_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "dispute_count_30d" INTEGER NOT NULL DEFAULT 0,
    "dispute_count_90d" INTEGER NOT NULL DEFAULT 0,
    "deviation_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cancellation_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "incident_count_90d" INTEGER NOT NULL DEFAULT 0,
    "anomaly_flag_count" INTEGER NOT NULL DEFAULT 0,
    "total_trips_completed" INTEGER NOT NULL DEFAULT 0,
    "consecutive_clean_trips" INTEGER NOT NULL DEFAULT 0,
    "cod_discrepancy_count" INTEGER NOT NULL DEFAULT 0,
    "cod_trips_total" INTEGER NOT NULL DEFAULT 0,
    "home_city" TEXT,
    "preferred_corridors" TEXT[],
    "route_familiarity_score" JSONB,
    "avg_response_time_min" DECIMAL(4,1),
    "typical_rest_duration_h" DECIMAL(3,1),
    "preferred_assignment_hour" INTEGER,
    "home_base_city_id" TEXT,
    "preferred_corridor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability_status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "license_category" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "telebirr_number" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" VARCHAR(26) NOT NULL,
    "plate_number" TEXT NOT NULL,
    "fleet_owner_id" TEXT,
    "current_driver_id" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "truck_type" TEXT NOT NULL,
    "capacity_kg" INTEGER NOT NULL,
    "capacity_cbm" DECIMAL(8,2),
    "axle_count" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "insurance_policy_number" TEXT,
    "insurance_expiry" TIMESTAMP(3),
    "annual_inspection_expiry" TIMESTAMP(3),
    "road_worthiness_expiry" TIMESTAMP(3),
    "fuel_consumption_lp100km" DECIMAL(4,1),
    "fuel_tank_capacity_l" INTEGER,
    "fuel_type" TEXT NOT NULL DEFAULT 'DIESEL',
    "odometer_km" INTEGER NOT NULL DEFAULT 0,
    "engine_hours" INTEGER NOT NULL DEFAULT 0,
    "last_maintenance_km" INTEGER,
    "last_maintenance_at" TIMESTAMP(3),
    "has_bank_loan" BOOLEAN NOT NULL DEFAULT false,
    "loan_bank_name" TEXT,
    "co_owner_user_id" TEXT,
    "co_owner_share_pct" DECIMAL(5,2),
    "libre_number" TEXT,
    "chassis_number" TEXT,
    "engine_number" TEXT,
    "manufacturing_year" INTEGER,
    "body_type" TEXT NOT NULL DEFAULT 'FLATBED',
    "payload_quintals" DECIMAL(10,2),
    "insurance_company" TEXT,
    "insurance_type" TEXT NOT NULL DEFAULT 'THIRD_PARTY',
    "inspection_number" TEXT,
    "inspection_expiry" TIMESTAMP(3),
    "odometer_reading" INTEGER NOT NULL DEFAULT 0,
    "last_service_date" TIMESTAMP(3),
    "next_service_date" TIMESTAMP(3),
    "truck_kyc_tier" INTEGER NOT NULL DEFAULT 0,
    "is_eligible_for_loads" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" VARCHAR(26) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiry_date" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corridors" (
    "id" VARCHAR(26) NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "origin_city" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "health_score" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "density_index" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "expansion_eligible" BOOLEAN NOT NULL DEFAULT false,
    "load_to_truck_ratio" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "backhaul_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "siu_invested" INTEGER NOT NULL DEFAULT 0,
    "siu_roi" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "road_type" TEXT,
    "has_mountain_pass" BOOLEAN NOT NULL DEFAULT false,
    "flood_risk_months" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corridors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loads" (
    "id" VARCHAR(26) NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "corridor_id" TEXT NOT NULL,
    "origin_city" TEXT NOT NULL,
    "origin_address" TEXT,
    "origin_geo_lat" DECIMAL(10,6),
    "origin_geo_lng" DECIMAL(10,6),
    "destination_city" TEXT NOT NULL,
    "destination_address" TEXT,
    "destination_geo_lat" DECIMAL(10,6),
    "destination_geo_lng" DECIMAL(10,6),
    "is_multi_stop" BOOLEAN NOT NULL DEFAULT false,
    "waypoints" JSONB,
    "cargo_type" TEXT NOT NULL,
    "cargo_description" TEXT,
    "weight_kg" INTEGER NOT NULL,
    "volume_cbm" DECIMAL(8,2),
    "requires_reefer" BOOLEAN NOT NULL DEFAULT false,
    "hazmat_class" TEXT,
    "special_instructions" TEXT,
    "pickup_date" TIMESTAMP(3) NOT NULL,
    "delivery_deadline" TIMESTAMP(3) NOT NULL,
    "urgency_level" INTEGER NOT NULL DEFAULT 2,
    "system_quote_etb" DECIMAL(12,2),
    "final_rate_etb" DECIMAL(12,2),
    "ruit_commission_etb" DECIMAL(12,2),
    "fleet_payout_etb" DECIMAL(12,2),
    "payment_model" TEXT NOT NULL DEFAULT 'ESCROW',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "strategy_version_id" TEXT NOT NULL,
    "ethiopian_calendar_event" TEXT,
    "weather_condition" TEXT,
    "booking_lead_time_hours" INTEGER,
    "orderer_request_source" TEXT NOT NULL DEFAULT 'APP',
    "load_type" TEXT NOT NULL DEFAULT 'SIMPLE',
    "preferred_truck_body_type" TEXT,
    "requires_refrigeration" BOOLEAN NOT NULL DEFAULT false,
    "is_hazardous" BOOLEAN NOT NULL DEFAULT false,
    "insurance_required" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" TEXT,
    "template_id" TEXT,
    "total_stops" INTEGER NOT NULL DEFAULT 2,
    "fuel_advance_amount" INTEGER NOT NULL DEFAULT 0,
    "fuel_advance_approved" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_negotiations" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL DEFAULT 1,
    "offered_by" TEXT NOT NULL,
    "offered_by_id" TEXT,
    "amount_etb" DECIMAL(12,2) NOT NULL,
    "action" TEXT NOT NULL,
    "rejection_reason_code" TEXT,
    "rejection_note" TEXT,
    "voice_note_s3_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "suggested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptance_deadline" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "rejection_reason_code" TEXT,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "optimization_score" DECIMAL(5,2),
    "decision_trace_id" TEXT,
    "strategy_version_id" TEXT NOT NULL,
    "time_to_accept_minutes" DECIMAL(4,1),
    "was_suggested_backhaul" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" VARCHAR(26) NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduled_pickup" TIMESTAMP(3) NOT NULL,
    "actual_pickup_at" TIMESTAMP(3),
    "estimated_delivery_at" TIMESTAMP(3),
    "actual_delivery_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "planned_distance_km" INTEGER,
    "actual_distance_km" DECIMAL(8,1),
    "total_idle_minutes" INTEGER NOT NULL DEFAULT 0,
    "deviation_detected" BOOLEAN NOT NULL DEFAULT false,
    "max_deviation_km" DECIMAL(6,1),
    "on_time" BOOLEAN,
    "delay_minutes" INTEGER,
    "road_quality_rating" INTEGER,
    "weather_during_trip" TEXT,
    "fuel_consumed_l" DECIMAL(6,1),
    "loading_duration_min" INTEGER,
    "unloading_duration_min" INTEGER,
    "checkpoint_delays" JSONB,
    "border_wait_minutes" INTEGER,
    "pod_s3_key" TEXT,
    "pod_uploaded_at" TIMESTAMP(3),
    "pod_geo_lat" DECIMAL(10,6),
    "pod_geo_lng" DECIMAL(10,6),
    "recipient_name" TEXT,
    "recipient_signature_s3" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_configs" (
    "id" VARCHAR(26) NOT NULL,
    "name" TEXT NOT NULL,
    "config_type" TEXT NOT NULL,
    "flat_rate_pct" DECIMAL(5,2),
    "fixed_amount_etb" DECIMAL(12,2),
    "tiers" JSONB,
    "corridor_id" TEXT,
    "orderer_id" TEXT,
    "cargo_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" VARCHAR(26) NOT NULL,
    "trip_id" TEXT,
    "load_id" TEXT,
    "orderer_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT,
    "tx_type" TEXT NOT NULL,
    "amount_etb" DECIMAL(12,2) NOT NULL,
    "direction" TEXT NOT NULL,
    "payment_model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "commission_config_id" TEXT,
    "cod_handler" TEXT,
    "cod_collected_by_user_id" TEXT,
    "cod_collected_at" TIMESTAMP(3),
    "cod_verified" BOOLEAN,
    "payment_method" TEXT,
    "external_ref" TEXT,
    "due_date" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "days_to_settle" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exposure_caps" (
    "id" VARCHAR(26) NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "cap_etb" DECIMAL(12,2) NOT NULL,
    "current_exposure_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "warning_threshold_pct" DECIMAL(5,2) NOT NULL DEFAULT 80,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "set_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exposure_caps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderer_payment_contracts" (
    "id" VARCHAR(26) NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "payment_model" TEXT NOT NULL,
    "cod_handler" TEXT,
    "advance_pct" DECIMAL(5,2),
    "credit_days" INTEGER,
    "escrow_bypass" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approved_by" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orderer_payment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_card_versions" (
    "id" VARCHAR(26) NOT NULL,
    "corridor_id" TEXT NOT NULL,
    "base_rate_per_km" DECIMAL(6,2) NOT NULL,
    "fuel_index_multiplier" DECIMAL(5,2) NOT NULL,
    "risk_premium_pct" DECIMAL(5,2) NOT NULL,
    "margin_floor_etb" DECIMAL(12,2) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "reason" TEXT,
    "set_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_card_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" VARCHAR(26) NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "strategy_version_id" TEXT NOT NULL,
    "corridor_id" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_versions" (
    "id" VARCHAR(26) NOT NULL,
    "version_name" TEXT NOT NULL,
    "optimization_mode" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "weight_set" JSONB NOT NULL,
    "threshold_set" JSONB NOT NULL,
    "pricing_params" JSONB NOT NULL,
    "acceptance_window_minutes" INTEGER NOT NULL DEFAULT 15,
    "max_assignment_attempts" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "ab_test_group" TEXT,
    "ab_traffic_pct" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "activated_at" TIMESTAMP(3),
    "deprecated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "high_demand_threshold" DECIMAL(65,30) NOT NULL DEFAULT 1.5,
    "low_demand_threshold" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "demand_surcharge_rate" DECIMAL(65,30) NOT NULL DEFAULT 0.15,
    "supply_discount_rate" DECIMAL(65,30) NOT NULL DEFAULT 0.10,
    "max_demand_multiplier" DECIMAL(65,30) NOT NULL DEFAULT 1.5,
    "min_demand_multiplier" DECIMAL(65,30) NOT NULL DEFAULT 0.8,
    "floor_price_per_km_per_quintal" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "ceiling_price_per_km_per_quintal" DECIMAL(65,30) NOT NULL DEFAULT 5.0,
    "cancellation_compensation_rate_per_km" DECIMAL(65,30) NOT NULL DEFAULT 2.0,
    "checkpoint_fee_reimbursement_enabled" BOOLEAN NOT NULL DEFAULT true,
    "seasonal_pricing_rules" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "strategy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_traces" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" TEXT NOT NULL,
    "candidate_truck_id" TEXT NOT NULL,
    "candidate_driver_id" TEXT NOT NULL,
    "strategy_version_id" TEXT NOT NULL,
    "optimization_mode" TEXT NOT NULL,
    "input_variables" JSONB NOT NULL,
    "weight_values" JSONB NOT NULL,
    "factor_scores" JSONB NOT NULL,
    "final_score" DECIMAL(5,2) NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" VARCHAR(26) NOT NULL,
    "trip_id" TEXT NOT NULL,
    "incident_type" TEXT NOT NULL,
    "reported_by" TEXT NOT NULL,
    "reporter_role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "geo_lat" DECIMAL(10,6),
    "geo_lng" DECIMAL(10,6),
    "assigned_to" TEXT,
    "liability_party" TEXT,
    "liability_breakdown" JSONB,
    "penalty_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "compensation_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "resolution_notes" TEXT,
    "escalation_reason" TEXT,
    "evidence_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_evidence" (
    "id" VARCHAR(26) NOT NULL,
    "incident_id" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "submitter_role" TEXT NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_flags" (
    "id" VARCHAR(26) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence_score" DECIMAL(5,2),
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shock_events" (
    "id" VARCHAR(26) NOT NULL,
    "shock_type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "affected_corridors" TEXT[],
    "description" TEXT,
    "triggered_by" TEXT NOT NULL,
    "triggered_by_user_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "actions_taken" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "shock_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" VARCHAR(26) NOT NULL,
    "orderer_id" TEXT,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" VARCHAR(26) NOT NULL,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "assignment_notify" TEXT NOT NULL DEFAULT 'SMS',
    "payout_notify" TEXT NOT NULL DEFAULT 'SMS',
    "incident_notify" TEXT NOT NULL DEFAULT 'BOTH',
    "marketing_notify" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" INTEGER,
    "quiet_hours_end" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "corridor_checkpoints" (
    "id" VARCHAR(26) NOT NULL,
    "corridor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checkpoint_type" TEXT NOT NULL,
    "geo_lat" DECIMAL(10,6),
    "geo_lng" DECIMAL(10,6),
    "distance_from_origin_km" INTEGER,
    "avg_delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corridor_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ethiopian_calendar_events" (
    "id" VARCHAR(26) NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_name_amh" TEXT,
    "gregorian_date" TIMESTAMP(3) NOT NULL,
    "ethiopian_date" TEXT,
    "affected_regions" TEXT[],
    "demand_impact" TEXT NOT NULL,
    "impact_notes" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "year" INTEGER NOT NULL,

    CONSTRAINT "ethiopian_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_stops" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" TEXT NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "stop_type" TEXT NOT NULL,
    "orderer_id" TEXT,
    "address" TEXT NOT NULL,
    "lat" DECIMAL(10,6),
    "lng" DECIMAL(10,6),
    "scheduled_arrival" TIMESTAMP(3),
    "actual_arrival" TIMESTAMP(3),
    "cargo_description" TEXT,
    "weight_kg" DECIMAL(10,2),
    "weight_quintals" DECIMAL(10,2),
    "unit_count" INTEGER,
    "unit_type" TEXT,
    "escrow_amount_etb" INTEGER NOT NULL DEFAULT 0,
    "escrow_funded" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "cargo_condition_at_pickup" TEXT,
    "cargo_condition_at_delivery" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" VARCHAR(26) NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "truck_id" TEXT,
    "trip_id" TEXT,
    "expense_type" TEXT NOT NULL,
    "amount_etb" INTEGER NOT NULL,
    "description" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_maintenance" (
    "id" VARCHAR(26) NOT NULL,
    "truck_id" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "cost_etb" INTEGER,
    "service_provider" TEXT,
    "notes" TEXT,
    "next_service_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_loans" (
    "id" VARCHAR(26) NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "loan_amount_etb" INTEGER NOT NULL,
    "outstanding_etb" INTEGER NOT NULL,
    "monthly_payment_etb" INTEGER NOT NULL,
    "next_payment_due" TIMESTAMP(3),
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "loan_start_date" TIMESTAMP(3) NOT NULL,
    "loan_end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_performance_snapshots" (
    "id" VARCHAR(26) NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "trips_completed" INTEGER NOT NULL DEFAULT 0,
    "on_time_deliveries" INTEGER NOT NULL DEFAULT 0,
    "late_deliveries" INTEGER NOT NULL DEFAULT 0,
    "incident_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2),
    "total_earnings_etb" INTEGER NOT NULL DEFAULT 0,
    "utilization_rate" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_fleet_affiliations" (
    "id" VARCHAR(26) NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_owner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "payment_type" TEXT NOT NULL DEFAULT 'SALARY',
    "payment_amount" INTEGER,
    "is_currently_active" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_fleet_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" VARCHAR(26) NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY['loads:create', 'loads:read']::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proof_of_delivery" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" TEXT NOT NULL,
    "driver_confirmed_at" TIMESTAMP(3),
    "orderer_confirmed_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3),
    "pdf_reference" TEXT,
    "trip_summary" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proof_of_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_templates" (
    "id" VARCHAR(26) NOT NULL,
    "orderer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corridor_id" TEXT,
    "load_type" TEXT NOT NULL DEFAULT 'SIMPLE',
    "preferred_truck_body_type" TEXT,
    "template_stops" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoint_logs" (
    "id" VARCHAR(26) NOT NULL,
    "trip_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "lat" DECIMAL(10,6) NOT NULL,
    "lng" DECIMAL(10,6) NOT NULL,
    "address" TEXT,
    "checkpoint_type" TEXT NOT NULL DEFAULT 'POLICE',
    "fee_amount_etb" INTEGER NOT NULL DEFAULT 0,
    "fee_reimbursed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoint_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_records" (
    "id" VARCHAR(26) NOT NULL,
    "load_id" TEXT NOT NULL,
    "cancelled_by" TEXT NOT NULL,
    "cancelled_by_role" TEXT NOT NULL,
    "reason" TEXT,
    "distance_travelled_km" DECIMAL(8,2),
    "compensation_owed_etb" INTEGER NOT NULL DEFAULT 0,
    "compensation_paid" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_owners_user_id_key" ON "fleet_owners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orderers_user_id_key" ON "orderers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_plate_number_key" ON "trucks"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "loads_idempotency_key_key" ON "loads"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "trips_assignment_id_key" ON "trips"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_financial_singleton" ON "financial_transactions"("load_id", "tx_type");

-- CreateIndex
CREATE INDEX "events_aggregate_id_aggregate_type_idx" ON "events"("aggregate_id", "aggregate_type");

-- CreateIndex
CREATE INDEX "events_event_type_created_at_idx" ON "events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "events_corridor_id_created_at_idx" ON "events"("corridor_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_performance_snapshots_driver_id_fleet_owner_id_perio_key" ON "driver_performance_snapshots"("driver_id", "fleet_owner_id", "period_month", "period_year");

-- CreateIndex
CREATE UNIQUE INDEX "driver_fleet_affiliations_driver_id_fleet_owner_id_key" ON "driver_fleet_affiliations"("driver_id", "fleet_owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "proof_of_delivery_load_id_key" ON "proof_of_delivery"("load_id");

-- AddForeignKey
ALTER TABLE "fleet_owners" ADD CONSTRAINT "fleet_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderers" ADD CONSTRAINT "orderers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_fleet_owner_id_fkey" FOREIGN KEY ("fleet_owner_id") REFERENCES "fleet_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "orderers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_evidence" ADD CONSTRAINT "incident_evidence_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "orderers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fleet_owner_id_fkey" FOREIGN KEY ("fleet_owner_id") REFERENCES "fleet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_maintenance" ADD CONSTRAINT "truck_maintenance_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_loans" ADD CONSTRAINT "fleet_loans_fleet_owner_id_fkey" FOREIGN KEY ("fleet_owner_id") REFERENCES "fleet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "orderers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_templates" ADD CONSTRAINT "load_templates_orderer_id_fkey" FOREIGN KEY ("orderer_id") REFERENCES "orderers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
