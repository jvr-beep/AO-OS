-- Resource metadata fields for room/locker picker
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "description"    TEXT,
  ADD COLUMN IF NOT EXISTS "features"       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "floor_section"  TEXT,
  ADD COLUMN IF NOT EXISTS "is_discrete"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "max_occupancy"  INTEGER;

-- Guest preference profile for personalised resource suggestions
ALTER TABLE "guests"
  ADD COLUMN IF NOT EXISTS "preferences" JSONB;
