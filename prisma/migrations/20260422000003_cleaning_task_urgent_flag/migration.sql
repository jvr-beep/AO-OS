-- Add urgent flag to CleaningTask
ALTER TABLE "CleaningTask"
  ADD COLUMN "isUrgent" BOOLEAN NOT NULL DEFAULT FALSE;
