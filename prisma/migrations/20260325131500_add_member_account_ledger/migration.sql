DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberAccountEntryType') THEN
    CREATE TYPE "MemberAccountEntryType" AS ENUM ('charge', 'credit', 'refund', 'payment');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberAccountEntryStatus') THEN
    CREATE TYPE "MemberAccountEntryStatus" AS ENUM ('posted', 'voided');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberAccountSourceType') THEN
    CREATE TYPE "MemberAccountSourceType" AS ENUM (
      'wristband_transaction',
      'manual_adjustment',
      'manual_payment',
      'refund',
      'membership',
      'locker_fee'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "MemberAccountEntry" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "entryType" "MemberAccountEntryType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "description" TEXT,
  "status" "MemberAccountEntryStatus" NOT NULL DEFAULT 'posted',
  "sourceType" "MemberAccountSourceType" NOT NULL,
  "sourceReference" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberAccountEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MemberAccountEntry_memberId_occurredAt_idx"
  ON "MemberAccountEntry"("memberId", "occurredAt");

CREATE INDEX IF NOT EXISTS "MemberAccountEntry_memberId_status_idx"
  ON "MemberAccountEntry"("memberId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemberAccountEntry_memberId_fkey'
  ) THEN
    ALTER TABLE "MemberAccountEntry"
      ADD CONSTRAINT "MemberAccountEntry_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;