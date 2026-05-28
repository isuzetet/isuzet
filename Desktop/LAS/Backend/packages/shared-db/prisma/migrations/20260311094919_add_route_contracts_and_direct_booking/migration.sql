/*
  Warnings:

  - The `frequency` column on the `route_contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RouteContractFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "direct_booking_id" VARCHAR(26),
ADD COLUMN     "source" TEXT DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "route_contracts" ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "pending_job_id" TEXT,
DROP COLUMN "frequency",
ADD COLUMN     "frequency" "RouteContractFrequency" NOT NULL DEFAULT 'WEEKLY';
