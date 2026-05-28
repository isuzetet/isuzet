-- AlterTable
ALTER TABLE "loads" ADD COLUMN     "charterTruckSize" TEXT,
ADD COLUMN     "pricingMode" TEXT NOT NULL DEFAULT 'CONSOLIDATED';
