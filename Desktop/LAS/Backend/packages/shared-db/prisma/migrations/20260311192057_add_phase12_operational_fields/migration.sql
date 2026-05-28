-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "insurance_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insurance_coverage_cents" INTEGER,
ADD COLUMN     "insurance_premium_cents" INTEGER;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "detention_started_at" TIMESTAMP(3),
ADD COLUMN     "reroute_approved_at" TIMESTAMP(3),
ADD COLUMN     "reroute_requested" BOOLEAN NOT NULL DEFAULT false;
