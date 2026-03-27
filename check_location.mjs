import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check for existing locations
    const locations = await prisma.location.findMany({ take: 10 });
    
    if (locations.length === 0) {
      console.log("No locations found. Creating seed location...");
      const newLoc = await prisma.location.create({
        data: {
          code: "SMOKE_LOC",
          name: "Smoke Test Location"
        }
      });
      console.log(`LOCATION_ID=${newLoc.id}`);
    } else {
      console.log(`LOCATION_ID=${locations[0].id}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
