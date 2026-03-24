CREATE TABLE IF NOT EXISTS "StaffAuditEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorStaffUserId" TEXT NOT NULL,
  "actorEmailSnapshot" TEXT NOT NULL,
  "actorRoleSnapshot" TEXT NOT NULL,
  "targetStaffUserId" TEXT,
  "targetEmailSnapshot" TEXT,
  "outcome" TEXT NOT NULL,
  "reasonCode" TEXT,
  "metadataJson" JSONB,

  CONSTRAINT "StaffAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffAuditEvent_occurredAt_idx"
  ON "StaffAuditEvent"("occurredAt");

CREATE INDEX IF NOT EXISTS "StaffAuditEvent_targetStaffUserId_idx"
  ON "StaffAuditEvent"("targetStaffUserId");
