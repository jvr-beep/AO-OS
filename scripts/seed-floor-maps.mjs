// One-shot seed: uploads SVG floor plan versions for the three existing MapFloor records.
// Run inside the API container: node /app/scripts/seed-floor-maps.mjs
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FLOORS = [
  {
    id: "12f87477-d7c1-42f0-bfde-df1d1314f2eb",
    name: "Main Floor",
    svgPath: "/app/scripts/floor-plans/main-floor.svg",
  },
  {
    id: "3a80445c-d3cb-40ee-a5ab-d8f32830bc1f",
    name: "Second Floor",
    svgPath: "/app/scripts/floor-plans/2nd-floor.svg",
  },
  {
    id: "35350133-5e37-4173-a393-3dd83c9f06c6",
    name: "Third Floor",
    svgPath: "/app/scripts/floor-plans/3rd-floor.svg",
  },
];

async function main() {
  for (const floor of FLOORS) {
    const existing = await prisma.mapFloorVersion.findFirst({
      where: { floorId: floor.id },
      orderBy: { versionNum: "desc" },
    });

    if (existing) {
      console.log(`${floor.name}: already has version ${existing.versionNum} — skipping`);
      continue;
    }

    const svgContent = readFileSync(floor.svgPath, "utf8");

    await prisma.mapFloorVersion.create({
      data: {
        floorId: floor.id,
        versionNum: 1,
        label: "Initial floor plan v1",
        notes: "Uploaded from AO facility floor plan drawings",
        svgContent,
        isDraft: false,
        publishedAt: new Date(),
        publishedBy: "system",
        createdBy: "system",
      },
    });

    console.log(`${floor.name}: created v1 and published`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
