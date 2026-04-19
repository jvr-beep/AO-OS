-- Seed AO Toronto location
INSERT INTO "Location" (id, code, name, "createdAt")
VALUES (
  'loc00000-0000-0000-0000-000000000001',
  'AO_TORONTO',
  'AO Toronto',
  NOW()
) ON CONFLICT (code) DO NOTHING;

-- Seed Greek zones for AO Toronto
INSERT INTO "AccessZone" (id, location_id, code, name, "requiresBooking", "createdAt")
VALUES
  ('zone0000-0000-0000-0000-000000000001', 'loc00000-0000-0000-0000-000000000001', 'ALPHA_ZONE',       'Alpha Zone',      false, NOW()),
  ('zone0000-0000-0000-0000-000000000002', 'loc00000-0000-0000-0000-000000000001', 'OMEGA_ZONE',       'Omega Zone',      false, NOW()),
  ('zone0000-0000-0000-0000-000000000003', 'loc00000-0000-0000-0000-000000000001', 'LABYRINTH',        'Labyrinth',       false, NOW()),
  ('zone0000-0000-0000-0000-000000000004', 'loc00000-0000-0000-0000-000000000001', 'BROTHERHOOD_HALL', 'Brotherhood Hall',false, NOW()),
  ('zone0000-0000-0000-0000-000000000005', 'loc00000-0000-0000-0000-000000000001', 'SANCTUARY',        'Sanctuary',       true,  NOW()),
  ('zone0000-0000-0000-0000-000000000006', 'loc00000-0000-0000-0000-000000000001', 'CALDARIUM',        'Caldarium',       false, NOW()),
  ('zone0000-0000-0000-0000-000000000007', 'loc00000-0000-0000-0000-000000000001', 'THERMARIUM',       'Thermarium',      false, NOW()),
  ('zone0000-0000-0000-0000-000000000008', 'loc00000-0000-0000-0000-000000000001', 'FRIGIDARIUM',      'Frigidarium',     false, NOW())
ON CONFLICT (code) DO NOTHING;
