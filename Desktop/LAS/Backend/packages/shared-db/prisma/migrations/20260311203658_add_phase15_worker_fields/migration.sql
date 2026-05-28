-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "device_fingerprint" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notification_throttled_until" TIMESTAMP(3);
