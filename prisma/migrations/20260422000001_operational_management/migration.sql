-- CreateEnum
CREATE TYPE "WaiverDocumentStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterTable: add risk flag audit fields to guests
ALTER TABLE "guests"
  ADD COLUMN "risk_flag_reason" TEXT,
  ADD COLUMN "risk_flagged_at"  TIMESTAMPTZ(6),
  ADD COLUMN "risk_flagged_by"  TEXT;

-- CreateTable: waiver_documents
CREATE TABLE "waiver_documents" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "version"      TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "body"         TEXT NOT NULL,
    "status"       "WaiverDocumentStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "effective_at" TIMESTAMPTZ(6),
    "created_by"   TEXT,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "waiver_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waiver_documents_version_key" ON "waiver_documents"("version");

-- CreateTable: visit_notes
CREATE TABLE "visit_notes" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "visit_id"      UUID NOT NULL,
    "staff_user_id" TEXT,
    "body"          TEXT NOT NULL,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_visit_notes_visit_time" ON "visit_notes"("visit_id", "created_at" DESC);

ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_visit_id_fkey"
  FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the initial waiver document so the system has a published version on migration
INSERT INTO "waiver_documents" ("id", "version", "title", "body", "status", "published_at", "effective_at")
VALUES (
  gen_random_uuid(),
  'AO-WAIVER-v1',
  'AO Sanctuary — House Rules & Waiver of Liability',
  E'ALPHA OMEGA (ΑΩ) SANCTUARY — HOUSE RULES & WAIVER OF LIABILITY\n\nBy entering AO Sanctuary, you acknowledge and agree to the following:\n\n1. CONDUCT\nAll guests are expected to conduct themselves with respect for the house, its members, and their boundaries. Consent is non-negotiable. Any conduct that violates the dignity of another person will result in immediate removal and permanent ban.\n\n2. HEALTH & SAFETY\nYou confirm that you are in good health and not aware of any condition that would put yourself or others at risk. AO Sanctuary is an adult wellness environment. You accept responsibility for your own physical safety and wellbeing during your visit.\n\n3. PREMISES & PERSONAL PROPERTY\nAO Sanctuary is not responsible for loss, theft, or damage to personal property. Lockers are provided as a courtesy and do not constitute a bailment.\n\n4. PHOTOGRAPHY\nNo photography or recording of any kind is permitted inside AO Sanctuary premises. Violation of this policy will result in immediate removal and permanent ban.\n\n5. DISCRETION\nWhat occurs within AO Sanctuary is private. Members and guests are expected to maintain discretion regarding the identity and activities of others they may encounter on premises.\n\n6. LIMITATION OF LIABILITY\nYou release AO Sanctuary, its employees, agents, and affiliates from any and all claims arising from your visit, including but not limited to personal injury, property damage, or any other harm.\n\nBy signing below, you confirm that you have read, understood, and agree to these terms.',
  'published',
  now(),
  '2026-01-01 00:00:00+00'
);
