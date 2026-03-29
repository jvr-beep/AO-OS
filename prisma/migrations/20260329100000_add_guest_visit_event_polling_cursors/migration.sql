-- Add EventPollingCursor rows for new guest-visit domain event types
INSERT INTO "EventPollingCursor" ("id", "eventType", "lastPolledAt", "createdAt", "updatedAt") VALUES
  ('guest-access-event-cursor', 'GuestAccessEvent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system-exception-cursor',   'SystemException',  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("eventType") DO NOTHING;
