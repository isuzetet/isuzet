-- CreateTable
CREATE TABLE "ussd_sessions" (
    "id" VARCHAR(26) NOT NULL,
    "session_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'MAIN_MENU',
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ussd_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ussd_sessions_session_id_key" ON "ussd_sessions"("session_id");

-- CreateIndex
CREATE INDEX "ussd_sessions_phone_number_created_at_idx" ON "ussd_sessions"("phone_number", "created_at");
