// Uploads 3rd floor SVG v2 (individual room polygons) and updates MapObject svgElementIds.
// Run inside the API container: node /app/scripts/upgrade-3f-floor-map.mjs
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const THIRD_FLOOR = "35350133-5e37-4173-a393-3dd83c9f06c6";

async function main() {
  // 1. Upload v2 SVG
  const svgContent = readFileSync("/app/scripts/3rd-floor-v2.svg", "utf8");

  const existing = await prisma.mapFloorVersion.findFirst({
    where: { floorId: THIRD_FLOOR },
    orderBy: { versionNum: "desc" },
  });
  const nextVersion = (existing?.versionNum ?? 0) + 1;

  await prisma.mapFloorVersion.create({
    data: {
      floorId: THIRD_FLOOR,
      versionNum: nextVersion,
      label: `v${nextVersion} — individual room polygons`,
      notes: "Split north/south zones into one polygon per room (RM-01 through RM-04)",
      svgContent,
      isDraft: false,
      publishedAt: new Date(),
      publishedBy: "system",
      createdBy: "system",
    },
  });
  console.log(`Uploaded 3rd floor v${nextVersion} (${svgContent.length} chars)`);

  // 2. Update MapObject svgElementIds to match new polygon IDs
  const updates = [
    { code: "3F-NORTH-A", svgElementId: "zone-rm-01" }, // Ember Room
    { code: "3F-NORTH-B", svgElementId: "zone-rm-02" }, // Cedar Room
    { code: "3F-SOUTH-A", svgElementId: "zone-rm-03" }, // Juniper Room
    { code: "3F-SOUTH-B", svgElementId: "zone-rm-04" }, // Willow Room
  ];

  for (const u of updates) {
    await prisma.mapObject.update({
      where: { floorId_code: { floorId: THIRD_FLOOR, code: u.code } },
      data: { svgElementId: u.svgElementId },
    });
    console.log(`Updated [${u.code}] → ${u.svgElementId}`);
  }

  console.log("Done.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
