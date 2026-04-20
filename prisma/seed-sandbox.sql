-- Sandbox location seed — full facility with all Sandbox-named entities
-- Run with: pnpm prisma db execute --file ./prisma/seed-sandbox.sql --schema ./prisma/schema.prisma

-- 1. Location
INSERT INTO "Location" (id, code, name, "createdAt")
VALUES ('55000000-0000-0000-0000-000000000001', 'AO_SANDBOX', 'AO Sandbox', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Access Zones
INSERT INTO "AccessZone" (id, location_id, code, name, "requiresBooking", "createdAt")
VALUES
  ('55000000-0000-0000-0000-000000000010', '55000000-0000-0000-0000-000000000001', 'SANDBOX_ENTRY',   'Sandbox Entry',        false, NOW()),
  ('55000000-0000-0000-0000-000000000011', '55000000-0000-0000-0000-000000000001', 'SANDBOX_RESTORE', 'Sandbox Restore Zone', false, NOW()),
  ('55000000-0000-0000-0000-000000000012', '55000000-0000-0000-0000-000000000001', 'SANDBOX_LOCKER',  'Sandbox Locker Zone',  false, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Access Points (virtual readers — no physical hardware)
INSERT INTO "AccessPoint" (id, "locationId", "accessZoneId", code, name, "createdAt")
VALUES
  ('55000000-0000-0000-0000-000000000020', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000010', 'SANDBOX_ENTRY_READER',    'Sandbox Entry Reader',          NOW()),
  ('55000000-0000-0000-0000-000000000021', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000011', 'SANDBOX_READER_ROOM_01',  'Sandbox Reader — Room 01',      NOW()),
  ('55000000-0000-0000-0000-000000000022', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000011', 'SANDBOX_READER_ROOM_02',  'Sandbox Reader — Room 02',      NOW()),
  ('55000000-0000-0000-0000-000000000023', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000011', 'SANDBOX_READER_ROOM_03',  'Sandbox Reader — Room 03',      NOW()),
  ('55000000-0000-0000-0000-000000000024', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000011', 'SANDBOX_READER_ROOM_04',  'Sandbox Reader — Room 04',      NOW()),
  ('55000000-0000-0000-0000-000000000025', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000011', 'SANDBOX_READER_ROOM_05',  'Sandbox Reader — Room 05',      NOW()),
  ('55000000-0000-0000-0000-000000000026', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000012', 'SANDBOX_LOCKER_READER',   'Sandbox Locker Zone Reader',    NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Floor Plan
INSERT INTO "FloorPlan" (id, "locationId", name, active, "createdAt", "updatedAt")
VALUES ('55000000-0000-0000-0000-000000000030', '55000000-0000-0000-0000-000000000001', 'Sandbox Floor Plan', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Floor Plan Areas (laid out in a simple 3+2 grid)
INSERT INTO "FloorPlanArea" (id, "floorPlanId", code, name, "areaType", x, y, width, height, active, "createdAt", "updatedAt")
VALUES
  ('55000000-0000-0000-0000-000000000031', '55000000-0000-0000-0000-000000000030', 'SANDBOX_AREA_01', 'Sandbox Area 01', 'room',   10,  10, 80, 60, true, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000032', '55000000-0000-0000-0000-000000000030', 'SANDBOX_AREA_02', 'Sandbox Area 02', 'room',  100,  10, 80, 60, true, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000033', '55000000-0000-0000-0000-000000000030', 'SANDBOX_AREA_03', 'Sandbox Area 03', 'room',  190,  10, 80, 60, true, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000034', '55000000-0000-0000-0000-000000000030', 'SANDBOX_AREA_04', 'Sandbox Area 04', 'room',   10,  80, 80, 60, true, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000035', '55000000-0000-0000-0000-000000000030', 'SANDBOX_AREA_05', 'Sandbox Area 05', 'room',  100,  80, 80, 60, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Rooms
INSERT INTO "Room" (id, "locationId", "floorPlanAreaId", code, name, "roomType", "privacyLevel", status, active, bookable, "cleaningRequired", "createdAt", "updatedAt")
VALUES
  ('55000000-0000-0000-0000-000000000041', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000031', 'SANDBOX_ROOM_01', 'Sandbox Room 01', 'private', 'standard', 'available', true, true, false, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000042', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000032', 'SANDBOX_ROOM_02', 'Sandbox Room 02', 'private', 'standard', 'available', true, true, false, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000043', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000033', 'SANDBOX_ROOM_03', 'Sandbox Room 03', 'private', 'standard', 'available', true, true, false, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000044', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000034', 'SANDBOX_ROOM_04', 'Sandbox Room 04', 'private', 'standard', 'available', true, true, false, NOW(), NOW()),
  ('55000000-0000-0000-0000-000000000045', '55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000035', 'SANDBOX_ROOM_05', 'Sandbox Room 05', 'private', 'standard', 'available', true, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
