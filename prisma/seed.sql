-- Minimal seed for local Postman verification
-- Run with: pnpm prisma db execute --file ./prisma/seed.sql --schema ./prisma/schema.prisma

-- 1. Location
INSERT INTO "Location" (id, code, name, "createdAt")
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'AO_MAIN', 'AO Main Floor', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. AccessZone
INSERT INTO "AccessZone" (id, code, name, "requiresBooking", "createdAt")
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'GENERAL', 'General Access', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. AccessPoint (depends on Location + AccessZone above)
INSERT INTO "AccessPoint" (id, "locationId", "accessZoneId", code, name, "createdAt")
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'MAIN_ENTRY',
  'Main Entry Scanner',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
