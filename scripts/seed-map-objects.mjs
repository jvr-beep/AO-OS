// Seed MapObject records linking SVG zone elements to rooms and access zones.
// Run inside the API container: node /app/scripts/seed-map-objects.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Floor IDs ──────────────────────────────────────────────────────────────
const MAIN_FLOOR   = "12f87477-d7c1-42f0-bfde-df1d1314f2eb";
const SECOND_FLOOR = "3a80445c-d3cb-40ee-a5ab-d8f32830bc1f";
const THIRD_FLOOR  = "35350133-5e37-4173-a393-3dd83c9f06c6";

// ── Access Zone IDs ────────────────────────────────────────────────────────
const ALPHA_ZONE       = "zone0000-0000-0000-0000-000000000001";
const OMEGA_ZONE       = "zone0000-0000-0000-0000-000000000002";
const LABYRINTH        = "zone0000-0000-0000-0000-000000000003";
const BROTHERHOOD_HALL = "zone0000-0000-0000-0000-000000000004";
const SANCTUARY        = "zone0000-0000-0000-0000-000000000005";
const CALDARIUM        = "zone0000-0000-0000-0000-000000000006";
const THERMARIUM       = "zone0000-0000-0000-0000-000000000007";
const FRIGIDARIUM      = "zone0000-0000-0000-0000-000000000008";

// ── Room IDs ───────────────────────────────────────────────────────────────
const LL_01_STONE   = "08bc6c71-cfba-49bc-8141-cb66b815ef99"; // 2nd floor east
const LL_02_MOSS    = "44424ab2-4c96-491c-8a69-97252e04b71f"; // 2nd floor west
const LL_03_COVE    = "050574d7-75df-4aab-8e0f-191c231d5821"; // 2nd floor center
const RM_01_EMBER   = "f55cf7af-a0ad-4d48-8c9b-b6ba20dc3ac1"; // 3rd floor north-A
const RM_02_CEDAR   = "4b87caf1-a50d-45d0-80f0-b78c7f6a7b9a"; // 3rd floor north-B (no SVG polygon — appears in panel only)
const RM_03_JUNIPER = "d6acd07a-1d2f-4db0-8fb6-8bc09a171d22"; // 3rd floor south-A
const RM_04_WILLOW  = "ee8ac6a1-1e35-4395-98fa-f6a3efa07dfd"; // 3rd floor south-B (no SVG polygon — appears in panel only)

const OBJECTS = [
  // ── Main Floor ─────────────────────────────────────────────────────────
  { floorId: MAIN_FLOOR, svgElementId: "zone-entry",           objectType: "zone_boundary", code: "MF-ENTRY",   label: "Entry — Alpha Zone",          accessZoneId: ALPHA_ZONE },
  { floorId: MAIN_FLOOR, svgElementId: "zone-licensed-lounge", objectType: "amenity",       code: "MF-LOUNGE",  label: "Brotherhood Hall",             accessZoneId: BROTHERHOOD_HALL },
  { floorId: MAIN_FLOOR, svgElementId: "zone-shower-room",     objectType: "amenity",       code: "MF-SHOWERS", label: "Showers — Frigidarium",         accessZoneId: FRIGIDARIUM },
  { floorId: MAIN_FLOOR, svgElementId: "zone-pool",            objectType: "amenity",       code: "MF-POOL",    label: "Pool — Frigidarium",            accessZoneId: FRIGIDARIUM },
  { floorId: MAIN_FLOOR, svgElementId: "zone-steam-room",      objectType: "amenity",       code: "MF-STEAM",   label: "Steam Room — Caldarium",        accessZoneId: CALDARIUM },
  { floorId: MAIN_FLOOR, svgElementId: "zone-sauna",           objectType: "amenity",       code: "MF-SAUNA",   label: "Sauna — Thermarium",            accessZoneId: THERMARIUM },
  { floorId: MAIN_FLOOR, svgElementId: "zone-storage",         objectType: "staff_area",    code: "MF-STORAGE", label: "Storage" },
  { floorId: MAIN_FLOOR, svgElementId: "zone-laundry",         objectType: "staff_area",    code: "MF-LAUNDRY", label: "Laundry" },
  { floorId: MAIN_FLOOR, svgElementId: "zone-office",          objectType: "staff_area",    code: "MF-OFFICE",  label: "Office" },

  // ── Second Floor ────────────────────────────────────────────────────────
  { floorId: SECOND_FLOOR, svgElementId: "zone-rooms-east",   objectType: "room", code: "2F-EAST",     label: "Stone Room (LL-01)",     roomId: LL_01_STONE },
  { floorId: SECOND_FLOOR, svgElementId: "zone-rooms-west",   objectType: "room", code: "2F-WEST",     label: "Moss Room (LL-02)",      roomId: LL_02_MOSS },
  { floorId: SECOND_FLOOR, svgElementId: "zone-rooms-center", objectType: "room", code: "2F-CENTER",   label: "Cove Room (LL-03)",      roomId: LL_03_COVE },
  { floorId: SECOND_FLOOR, svgElementId: "zone-clinic",       objectType: "amenity",       code: "2F-CLINIC",   label: "Clinic — Sanctuary",     accessZoneId: SANCTUARY },
  { floorId: SECOND_FLOOR, svgElementId: "zone-corridor-2f",  objectType: "circulation",   code: "2F-CORRIDOR", label: "Corridor" },

  // ── Third Floor ─────────────────────────────────────────────────────────
  // North polygon covers Ember (RM-01). Cedar (RM-02) is tracked in panel without its own polygon.
  { floorId: THIRD_FLOOR, svgElementId: "zone-rooms-north-3f",  objectType: "room",    code: "3F-NORTH-A",  label: "Ember Room (RM-01)",           roomId: RM_01_EMBER },
  { floorId: THIRD_FLOOR, svgElementId: null,                   objectType: "room",    code: "3F-NORTH-B",  label: "Cedar Room (RM-02)",           roomId: RM_02_CEDAR },
  // South polygon covers Juniper (RM-03). Willow (RM-04) is tracked in panel without its own polygon.
  { floorId: THIRD_FLOOR, svgElementId: "zone-rooms-south-3f",  objectType: "room",    code: "3F-SOUTH-A",  label: "Juniper Room (RM-03)",         roomId: RM_03_JUNIPER },
  { floorId: THIRD_FLOOR, svgElementId: null,                   objectType: "room",    code: "3F-SOUTH-B",  label: "Willow Room (RM-04)",          roomId: RM_04_WILLOW },
  { floorId: THIRD_FLOOR, svgElementId: "zone-common-lounge-3f", objectType: "amenity", code: "3F-COMMON",  label: "Common Lounge — Omega Zone",   accessZoneId: OMEGA_ZONE },
  { floorId: THIRD_FLOOR, svgElementId: "zone-bar-lounge-3f",   objectType: "amenity", code: "3F-BAR",     label: "Bar Lounge — The Labyrinth",   accessZoneId: LABYRINTH },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const obj of OBJECTS) {
    const { floorId, accessZoneId, ...rest } = obj;
    try {
      await prisma.mapObject.upsert({
        where: { floorId_code: { floorId, code: rest.code } },
        create: {
          floorId,
          ...rest,
          ...(accessZoneId ? { accessZoneId } : {}),
          active: true,
        },
        update: {
          svgElementId: rest.svgElementId ?? null,
          label: rest.label,
          objectType: rest.objectType,
          ...(rest.roomId ? { roomId: rest.roomId } : {}),
          ...(accessZoneId ? { accessZoneId } : {}),
          active: true,
        },
      });
      console.log(`OK  [${rest.code}] ${rest.label}`);
      created++;
    } catch (err) {
      console.error(`ERR [${rest.code}]`, err.message);
      skipped++;
    }
  }

  console.log(`\nDone — ${created} upserted, ${skipped} errors.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
