/**
 * Production-safe facility topology seed.
 *
 * Idempotent: uses upsert / createMany + skipDuplicates so it can be run
 * multiple times without error.
 *
 * Usage:
 *   npx ts-node prisma/seed-facility-topology.ts
 *
 * Called automatically by scripts/deploy-isolated-api-release.ps1 when the
 * -SeedFacilityTopology flag is passed.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("🏛️  Seeding facility topology...");

  // -------------------------------------------------------------------------
  // 1. Facility
  // -------------------------------------------------------------------------
  const facility = await prisma.facility.upsert({
    where: { code: "AO_SANCTUARY" },
    update: {},
    create: {
      code: "AO_SANCTUARY",
      name: "AO Sanctuary",
      address: "AO Sanctuary, New York, NY",
      timezone: "America/New_York",
      active: true
    }
  });
  console.log(`✓ Facility: ${facility.name} (${facility.id})`);

  // -------------------------------------------------------------------------
  // 2. Location (main floor — used as the anchor for access points & rooms)
  // -------------------------------------------------------------------------
  const existingLocation = await prisma.location.findFirst({
    where: { code: "AO_MAIN" }
  });

  let location = existingLocation;
  if (!location) {
    location = await prisma.location.create({
      data: {
        code: "AO_MAIN",
        name: "AO Sanctuary – Main Floor"
      }
    });
    console.log(`✓ Location: ${location.name} (${location.id})`);
  } else {
    console.log(`→ Location already exists: ${location.name} (${location.id})`);
  }

  // -------------------------------------------------------------------------
  // 3. Access Zones
  // -------------------------------------------------------------------------
  const zones = [
    { code: "MAIN_FLOOR", name: "Main Floor", requiresBooking: false },
    { code: "PRIVATE_STUDIO", name: "Private Studio", requiresBooking: true },
    { code: "LOCKER_ROOM", name: "Locker Room", requiresBooking: false },
    { code: "ROOFTOP", name: "Rooftop", requiresBooking: true }
  ];

  let zoneCount = 0;
  for (const z of zones) {
    const existing = await prisma.accessZone.findFirst({ where: { code: z.code } });
    if (!existing) {
      await prisma.accessZone.create({ data: z });
      zoneCount++;
    }
  }
  console.log(
    `✓ Access zones: ${zoneCount} created, ${zones.length - zoneCount} already existed`
  );

  // -------------------------------------------------------------------------
  // 4. Floor Plan + Areas
  // -------------------------------------------------------------------------
  const existingFloorPlan = await prisma.floorPlan.findFirst({
    where: { locationId: location.id, name: "Main Floor Plan" }
  });

  if (!existingFloorPlan) {
    const floorPlan = await prisma.floorPlan.create({
      data: {
        locationId: location.id,
        name: "Main Floor Plan",
        active: true
      }
    });
    console.log(`✓ Floor plan: ${floorPlan.name} (${floorPlan.id})`);
  } else {
    console.log(`→ Floor plan already exists: ${existingFloorPlan.name}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const [floorCount, zoneTotal] = await Promise.all([
    prisma.floorPlan.count(),
    prisma.accessZone.count()
  ]);
  console.log(`\n📊 Topology counts:`);
  console.log(`   Floor plans : ${floorCount}`);
  console.log(`   Access zones: ${zoneTotal}`);
  console.log("\n✅ Facility topology seed complete.");
}

seed()
  .catch((e) => {
    console.error("Error seeding facility topology:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
