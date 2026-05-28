-- AlterTable
ALTER TABLE "payout_records" ADD COLUMN "initiated_at" TIMESTAMP(3),
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "failed_at" TIMESTAMP(3),
ADD COLUMN "account_number" TEXT,
ADD COLUMN "provider_reference" TEXT,
ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
