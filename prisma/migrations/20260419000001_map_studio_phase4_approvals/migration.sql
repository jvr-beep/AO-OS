-- Map Studio Phase 4: version approval workflow
CREATE TYPE "MapApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "map_version_approvals" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "version_id"   TEXT         NOT NULL,
  "requested_by" TEXT         NOT NULL,
  "status"       "MapApprovalStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by"  TEXT,
  "review_note"  TEXT,
  "n8n_run_id"   TEXT,
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at"  TIMESTAMPTZ(6),

  CONSTRAINT "map_version_approvals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "map_version_approvals"
  ADD CONSTRAINT "map_version_approvals_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "map_floor_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "map_version_approvals_version_id_status_idx"
  ON "map_version_approvals"("version_id", "status");
