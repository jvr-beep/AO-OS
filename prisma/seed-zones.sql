-- Minimal seed for zone access testing
-- Run with: pnpm prisma db execute --file ./prisma/seed-zones.sql --schema ./prisma/schema.prisma

-- 1. AccessZone without booking requirement (open zone)
INSERT INTO "AccessZone" (id, code, name, "requiresBooking", "createdAt")
VALUES ('dddddddd-0000-0000-0000-000000000001', 'OPEN_AREA', 'Open Area', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. AccessZone with booking requirement (reserved zone)
INSERT INTO "AccessZone" (id, code, name, "requiresBooking", "createdAt")
VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'RESERVED_ZONE', 'Reserved Zone', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. MemberAccessGrant (test member has access to OPEN_AREA, no time limit)
INSERT INTO "MemberAccessGrant" (id, "memberId", "accessZoneId", "validFrom", "validUntil", active, "createdAt")
VALUES (
  'ffffffff-0000-0000-0000-000000000001',
  '5d211c05-b810-4f4b-aad4-ad465e60a5df',
  'dddddddd-0000-0000-0000-000000000001',
  NULL,
  NULL,
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. MemberAccessOverride (test member has 24-hour override for RESERVED_ZONE)
INSERT INTO "MemberAccessOverride" (id, "memberId", "accessZoneId", action, reason, "grantedByStaffUserId", "validFrom", "validUntil", "createdAt")
VALUES (
  '11111111-0000-0000-0000-000000000001',
  '5d211c05-b810-4f4b-aad4-ad465e60a5df',
  'eeeeeeee-0000-0000-0000-000000000001',
  'allow',
  'Temporary access for testing',
  NULL,
  '2026-03-24 00:00:00',
  '2026-03-25 00:00:00',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5. Booking (test member has a booking in RESERVED_ZONE today)
INSERT INTO "Booking" (id, "memberId", "accessZoneId", "startsAt", "endsAt", status, "createdAt")
VALUES (
  '22222222-0000-0000-0000-000000000001',
  '5d211c05-b810-4f4b-aad4-ad465e60a5df',
  'eeeeeeee-0000-0000-0000-000000000001',
  '2026-03-24 08:00:00',
  '2026-03-24 18:00:00',
  'confirmed',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
