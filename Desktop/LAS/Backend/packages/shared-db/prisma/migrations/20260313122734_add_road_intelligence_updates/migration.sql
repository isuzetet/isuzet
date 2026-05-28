/*
  Warnings:

  - You are about to drop the column `alert_type` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `bonus_paid_cents` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `confirmed_count` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `corridor_id` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `driver_id` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `road_alerts` table. All the data in the column will be lost.
  - You are about to alter the column `lat` on the `road_alerts` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,6)`.
  - You are about to alter the column `lng` on the `road_alerts` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,6)`.
  - Added the required column `alertType` to the `road_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `road_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `road_alerts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "road_alerts" DROP COLUMN "alert_type",
DROP COLUMN "bonus_paid_cents",
DROP COLUMN "confirmed_count",
DROP COLUMN "corridor_id",
DROP COLUMN "created_at",
DROP COLUMN "driver_id",
DROP COLUMN "expires_at",
DROP COLUMN "status",
DROP COLUMN "updated_at",
ADD COLUMN     "alertType" TEXT NOT NULL,
ADD COLUMN     "bonusPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bonusPaidEtb" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clearedAt" TIMESTAMP(3),
ADD COLUMN     "clearedByUserId" VARCHAR(26),
ADD COLUMN     "corridorId" VARCHAR(26),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "reportedByRole" TEXT,
ADD COLUMN     "reportedByUserId" VARCHAR(26),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'DRIVER_APP',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "severity" SET DEFAULT 'MEDIUM',
ALTER COLUMN "severity" SET DATA TYPE TEXT,
ALTER COLUMN "lat" SET DATA TYPE DECIMAL(10,6),
ALTER COLUMN "lng" SET DATA TYPE DECIMAL(10,6);

-- CreateTable
CREATE TABLE "RoadAlertConfirmation" (
    "id" VARCHAR(26) NOT NULL,
    "alertId" VARCHAR(26) NOT NULL,
    "confirmedByUserId" VARCHAR(26) NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadAlertConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadAlertConfirmation_alertId_confirmedByUserId_key" ON "RoadAlertConfirmation"("alertId", "confirmedByUserId");

-- CreateIndex
CREATE INDEX "road_alerts_corridorId_expiresAt_idx" ON "road_alerts"("corridorId", "expiresAt");

-- CreateIndex
CREATE INDEX "road_alerts_lat_lng_idx" ON "road_alerts"("lat", "lng");

-- CreateIndex
CREATE INDEX "road_alerts_alertType_createdAt_idx" ON "road_alerts"("alertType", "createdAt");

-- CreateIndex
CREATE INDEX "road_alerts_isVerified_expiresAt_idx" ON "road_alerts"("isVerified", "expiresAt");

-- AddForeignKey
ALTER TABLE "RoadAlertConfirmation" ADD CONSTRAINT "RoadAlertConfirmation_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "road_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
