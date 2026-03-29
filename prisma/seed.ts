import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding test data...");

  // 1. Create test staff user (if not exists)
  const staffEmail = "staff@ao-os.local";
  const staffUser = await prisma.staffUser.findUnique({ where: { email: staffEmail } });

  if (!staffUser) {
    const passwordHash = await argon2.hash("TestPassword123!");
    await prisma.staffUser.create({
      data: {
        email: staffEmail,
        fullName: "Test Staff",
        passwordHash,
        role: "admin",
        active: true
      }
    });
    console.log("✓ Created staff user:", staffEmail);
  } else {
    console.log("→ Staff user already exists:", staffEmail);
  }

  // 2. Create test anonymous member
  const anonMember = await prisma.member.create({
    data: {
      publicMemberNumber: `AO-TEST-ANON-${Date.now()}`,
      type: "anonymous",
      alias: "TestWalkIn",
      status: "active"
    }
  });
  console.log("✓ Created anonymous member:", anonMember.id, "alias:", anonMember.alias);

  // 3. Create test registered member (no password yet - simulating admin invite)
  const regMember = await prisma.member.create({
    data: {
      publicMemberNumber: `AO-TEST-REG-${Date.now()}`,
      type: "registered",
      email: `test-member-${Date.now()}@test.local`,
      displayName: "Test Registered Member",
      status: "pending"
    }
  });
  console.log("✓ Created registered member:", regMember.id, "email:", regMember.email);

  console.log("\n✅ Seed complete!");
  console.log("\nTest credentials:");
  console.log("  Staff Email:", staffEmail);
  console.log("  Staff Password: TestPassword123!");
  console.log("\nTest members:");
  console.log("  Anonymous (walk-in):", anonMember.id);
  console.log("  Registered (pending):", regMember.id);
}

seed()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
