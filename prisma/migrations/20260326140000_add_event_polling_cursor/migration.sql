-- Add EventPollingCursor table to track polling state for n8n integration

CREATE TABLE "EventPollingCursor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventType" TEXT NOT NULL UNIQUE,
  "lastPolledAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Initialize cursors for all event types (start from now)
INSERT INTO "EventPollingCursor" ("id", "eventType", "lastPolledAt", "createdAt", "updatedAt") VALUES
  ('locker-access-event-cursor', 'LockerAccessEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('locker-policy-event-cursor', 'LockerPolicyDecisionEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('access-attempt-cursor', 'AccessAttempt', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('presence-event-cursor', 'PresenceEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('room-access-event-cursor', 'RoomAccessEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff-audit-event-cursor', 'StaffAuditEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cleaning-task-cursor', 'CleaningTask', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('room-booking-cursor', 'RoomBooking', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE INDEX "EventPollingCursor_eventType_idx" ON "EventPollingCursor"("eventType");
