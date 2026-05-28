-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "harvest_declared_at" TIMESTAMP(3),
ADD COLUMN     "is_time_critical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "livestock_age_class" TEXT,
ADD COLUMN     "livestock_delivered_alive" INTEGER,
ADD COLUMN     "livestock_head_count" INTEGER,
ADD COLUMN     "livestock_species" TEXT,
ADD COLUMN     "payment_basis" TEXT,
ADD COLUMN     "time_critical_escalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vet_certificate_url" TEXT;

-- CreateTable
CREATE TABLE "cold_chain_logs" (
    "id" VARCHAR(26) NOT NULL,
    "trip_id" TEXT NOT NULL,
    "checkpoint_id" TEXT,
    "temperature_celsius" INTEGER NOT NULL,
    "cargo_type" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_excursion" BOOLEAN NOT NULL DEFAULT false,
    "excursion_alert_sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cold_chain_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cold_chain_logs_trip_id_recorded_at_idx" ON "cold_chain_logs"("trip_id", "recorded_at");
