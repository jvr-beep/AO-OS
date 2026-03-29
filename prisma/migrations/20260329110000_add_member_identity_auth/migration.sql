-- =====================================================================
-- Migration: Add member identity model (type/alias/email optional) +
--            AuthAccount (password + lockout) + AuthToken (reset/verify)
-- =====================================================================

-- Add MemberType enum
CREATE TYPE "MemberType" AS ENUM ('anonymous', 'registered');

-- Add AuthTokenType enum
CREATE TYPE "AuthTokenType" AS ENUM ('password_reset', 'email_verify', 'invite_set_password');

-- Update Member table
ALTER TABLE "Member"
  ADD COLUMN "type"               "MemberType" NOT NULL DEFAULT 'registered',
  ADD COLUMN "alias"              TEXT,
  ADD COLUMN "email_verified_at"  TIMESTAMP(3),
  ADD COLUMN "created_by_staff_id" TEXT;

-- Make email, firstName, lastName optional
ALTER TABLE "Member"
  ALTER COLUMN "email"     DROP NOT NULL,
  ALTER COLUMN "firstName" DROP NOT NULL,
  ALTER COLUMN "lastName"  DROP NOT NULL;

-- Drop the NOT NULL constraint duplicate index entry if email is now nullable
-- (the UNIQUE constraint stays; NULLs are not considered duplicates in Postgres)

-- AuthAccount table
CREATE TABLE "auth_accounts" (
  "id"              TEXT        NOT NULL PRIMARY KEY,
  "member_id"       TEXT        NOT NULL UNIQUE,
  "password_hash"   TEXT        NOT NULL,
  "failed_attempts" INTEGER     NOT NULL DEFAULT 0,
  "locked_until"    TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "auth_accounts_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

-- AuthToken table
CREATE TABLE "auth_tokens" (
  "id"           TEXT             NOT NULL PRIMARY KEY,
  "member_id"    TEXT             NOT NULL,
  "type"         "AuthTokenType"  NOT NULL,
  "token_hash"   TEXT             NOT NULL,
  "expires_at"   TIMESTAMP(3)     NOT NULL,
  "consumed_at"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_tokens_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE INDEX "auth_tokens_token_hash_idx"          ON "auth_tokens"("token_hash");
CREATE INDEX "auth_tokens_member_id_type_consumed_at_idx" ON "auth_tokens"("member_id", "type", "consumed_at");
