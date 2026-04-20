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

-- 4. Catalog Tier (room/day-pass) — used by E2E walk-in mutation tests
INSERT INTO "tiers" (id, "location_id", product_type, code, name, "public_description", upgrade_rank, base_price_cents, active, created_at, updated_at)
VALUES (
  'dddddddd-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'room',
  'E2E_DAY_PASS',
  'E2E Day Pass',
  'Used by automated E2E tests',
  0,
  2500,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5. TierDurationOption for the E2E tier
INSERT INTO "tier_duration_options" (id, tier_id, duration_minutes, price_cents, active, created_at)
VALUES (
  'eeeeeeee-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001',
  120,
  2500,
  true,
  NOW()
)
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
