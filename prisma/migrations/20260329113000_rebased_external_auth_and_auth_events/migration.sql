/*
  Warnings:

  - You are about to drop the `AuthIdentity` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ExternalAuthProvider" AS ENUM ('google');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('password', 'google', 'admin_invite');

-- DropForeignKey
ALTER TABLE "AuthIdentity" DROP CONSTRAINT "AuthIdentity_memberId_fkey";

-- DropForeignKey
ALTER TABLE "auth_accounts" DROP CONSTRAINT "auth_accounts_member_id_fkey";

-- DropForeignKey
ALTER TABLE "auth_tokens" DROP CONSTRAINT "auth_tokens_member_id_fkey";

-- DropTable
DROP TABLE "AuthIdentity";

-- CreateTable
CREATE TABLE "external_auth_identities" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "provider" "ExternalAuthProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "email_at_provider" TEXT,
    "profile_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "auth_method" "AuthMethod" NOT NULL,
    "refresh_token_hash" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "session_id" TEXT,
    "event_type" TEXT NOT NULL,
    "auth_method" "AuthMethod",
    "outcome" TEXT NOT NULL,
    "failure_reason_code" TEXT,
    "attempted_email" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata_json" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_auth_identities_member_id_idx" ON "external_auth_identities"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_auth_identities_provider_provider_subject_key" ON "external_auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE INDEX "auth_sessions_member_id_idx" ON "auth_sessions"("member_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "auth_events_occurred_at_idx" ON "auth_events"("occurred_at");

-- CreateIndex
CREATE INDEX "auth_events_event_type_occurred_at_idx" ON "auth_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "auth_events_member_id_occurred_at_idx" ON "auth_events"("member_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "external_auth_identities" ADD CONSTRAINT "external_auth_identities_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed polling cursor for auth-domain events
INSERT INTO "EventPollingCursor" ("id", "eventType", "lastPolledAt", "createdAt", "updatedAt") VALUES
    ('auth-event-cursor', 'AuthEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("eventType") DO NOTHING;
