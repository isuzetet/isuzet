-- AlterTable
ALTER TABLE "fleet_owners" ADD COLUMN     "is_restricted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "data_consent_given" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "data_consent_given_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "agent_clients" (
    "id" VARCHAR(26) NOT NULL,
    "agent_user_id" VARCHAR(26) NOT NULL,
    "client_user_id" VARCHAR(26) NOT NULL,
    "zone_id" VARCHAR(26) NOT NULL,
    "business_type" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_clients_agent_user_id_client_user_id_key" ON "agent_clients"("agent_user_id", "client_user_id");
