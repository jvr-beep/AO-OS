import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TORONTO_CODE = "AO_TORONTO";

// Greek access zones
const AO_ZONES = [
  { code: "ALPHA_ZONE",       name: "Alpha Zone",       requiresBooking: false },
  { code: "OMEGA_ZONE",       name: "Omega Zone",       requiresBooking: false },
  { code: "LABYRINTH",        name: "The Labyrinth",    requiresBooking: false },
  { code: "BROTHERHOOD_HALL", name: "Brotherhood Hall", requiresBooking: false },
  { code: "SANCTUARY",        name: "The Sanctuary",    requiresBooking: true  },
  { code: "CALDARIUM",        name: "Caldarium",        requiresBooking: false },
  { code: "THERMARIUM",       name: "Thermarium",       requiresBooking: false },
  { code: "FRIGIDARIUM",      name: "Frigidarium",      requiresBooking: false },
];

// Common-area zones (thermal circuit + main floor social spaces)
const COMMON_ZONES   = ["ALPHA_ZONE", "BROTHERHOOD_HALL", "CALDARIUM", "THERMARIUM", "FRIGIDARIUM"];
// Private / erotic zones
const PRIVATE_ZONES  = ["OMEGA_ZONE"];
const CRUISING_ZONES = ["LABYRINTH"];
const HEALTH_ZONES   = ["SANCTUARY"];
const ALL_ZONES      = [...COMMON_ZONES, ...PRIVATE_ZONES, ...CRUISING_ZONES, ...HEALTH_ZONES];

// ---------------------------------------------------------------------------
// Membership plans (recurring subscriptions)
// Billing handled via Stripe in Phase 3 — plan records seeded now.
// ---------------------------------------------------------------------------
const MEMBERSHIP_PLANS = [
  {
    code: "ESSENTIAL",
    name: "AO Essential",
    description: "Entry membership — 1 monthly access credit, member pricing, RFID express entry.",
    tierRank: 1,
    billingInterval: "month" as const,
    priceAmount: "49.00",
    currency: "CAD",
    zones: COMMON_ZONES,
  },
  {
    code: "RITUAL",
    name: "AO Ritual",
    description: "Anchor membership — 2–3 monthly credits, priority booking, 1 room credit, deeper OS personalization.",
    tierRank: 2,
    billingInterval: "month" as const,
    priceAmount: "99.00",
    currency: "CAD",
    zones: [...COMMON_ZONES, ...PRIVATE_ZONES],
  },
  {
    code: "SANCTUARY",
    name: "AO Sanctuary",
    description: "Premium local — 4+ monthly credits, premium priority, room entitlement, private club experience.",
    tierRank: 3,
    billingInterval: "month" as const,
    priceAmount: "179.00",
    currency: "CAD",
    zones: [...COMMON_ZONES, ...PRIVATE_ZONES, ...CRUISING_ZONES],
  },
  {
    code: "BLACK",
    name: "AO Black",
    description: "Elite tier — unlimited priority, top credit pool, white-glove support, future international access.",
    tierRank: 4,
    billingInterval: "month" as const,
    priceAmount: "399.00",
    currency: "CAD",
    zones: ALL_ZONES,
  },
];

// ---------------------------------------------------------------------------
// One-time access tiers (guest visit products)
// These map to Tier model — used for kiosk walk-in flow and member upgrades.
// ---------------------------------------------------------------------------
const ACCESS_TIERS = [
  {
    code: "HOUSE_PASS",
    name: "House Pass",
    description: "Single visit — common areas + locker assignment.",
    productType: "locker" as const,
    upgradeRank: 0,
    basePriceCents: 3500,
    zones: COMMON_ZONES,
  },
  {
    code: "PRIVATE_PASS",
    name: "Private Pass",
    description: "Single visit — common areas + private room allocation.",
    productType: "room" as const,
    upgradeRank: 1,
    basePriceCents: 6500,
    zones: [...COMMON_ZONES, ...PRIVATE_ZONES],
  },
  {
    code: "RETREAT_PASS",
    name: "Retreat Pass",
    description: "Longer-duration premium-room visit — maximum privacy and service level.",
    productType: "room" as const,
    upgradeRank: 2,
    basePriceCents: 11500,
    zones: [...COMMON_ZONES, ...PRIVATE_ZONES, ...CRUISING_ZONES],
  },
  {
    code: "TRAVEL_PASS",
    name: "Travel Pass",
    description: "Premium single visit for out-of-town guests and event windows.",
    productType: "room" as const,
    upgradeRank: 2,
    basePriceCents: 14500,
    zones: [...COMMON_ZONES, ...PRIVATE_ZONES, ...CRUISING_ZONES],
  },
];

// ---------------------------------------------------------------------------
// Credit pack tiers (prepaid visit bundles)
// ---------------------------------------------------------------------------
const CREDIT_PACKS = [
  {
    code: "PACK_3",
    name: "3-Visit Pack",
    description: "Three House Pass credits — best for trial and gifting.",
    productType: "locker" as const,
    upgradeRank: 0,
    basePriceCents: 9900,
    zones: COMMON_ZONES,
  },
  {
    code: "PACK_5",
    name: "5-Visit Pack",
    description: "Five House Pass credits — best-value repeat access.",
    productType: "locker" as const,
    upgradeRank: 0,
    basePriceCents: 15500,
    zones: COMMON_ZONES,
  },
  {
    code: "PACK_ROOM_3",
    name: "Room Credit Pack (3)",
    description: "Three Private Pass room credits.",
    productType: "room" as const,
    upgradeRank: 1,
    basePriceCents: 18000,
    zones: [...COMMON_ZONES, ...PRIVATE_ZONES],
  },
];

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function upsertZoneEntitlements(
  productCode: string,
  productType: "tier" | "membership_plan",
  zoneCodes: string[],
) {
  for (const zoneCode of zoneCodes) {
    await prisma.zoneEntitlement.upsert({
      where: { uq_zone_entitlement_product_zone: { productCode, productType, zoneCode } },
      update: { active: true },
      create: { productCode, productType, zoneCode, active: true },
    });
  }
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Seeding AO-OS...");

  // ── 0. Location ──────────────────────────────────────────────────────────
  let toronto = await prisma.location.findUnique({ where: { code: TORONTO_CODE } });
  if (!toronto) {
    toronto = await prisma.location.create({ data: { code: TORONTO_CODE, name: "AO Toronto" } });
    console.log("✓ Location: AO Toronto");
  } else {
    console.log("→ Location exists: AO Toronto");
  }

  // ── 1. Greek access zones ────────────────────────────────────────────────
  for (const zone of AO_ZONES) {
    const existing = await prisma.accessZone.findUnique({ where: { code: zone.code } });
    if (!existing) {
      await prisma.accessZone.create({ data: zone });
      console.log(`✓ Zone: ${zone.name}`);
    } else {
      console.log(`→ Zone exists: ${zone.name}`);
    }
  }

  // ── 2. Membership plans ──────────────────────────────────────────────────
  for (const plan of MEMBERSHIP_PLANS) {
    const { zones, ...planData } = plan;
    const existing = await prisma.membershipPlan.findUnique({ where: { code: plan.code } });
    if (!existing) {
      await prisma.membershipPlan.create({
        data: { ...planData, priceAmount: planData.priceAmount },
      });
      console.log(`✓ Membership plan: ${plan.name}`);
    } else {
      console.log(`→ Membership plan exists: ${plan.name}`);
    }
    await upsertZoneEntitlements(plan.code, "membership_plan", zones);
  }

  // ── 3. Access tiers (one-time passes) ───────────────────────────────────
  for (const tier of ACCESS_TIERS) {
    const { zones, ...tierData } = tier;
    const existing = await prisma.tier.findUnique({ where: { code: tier.code } });
    if (!existing) {
      await prisma.tier.create({ data: tierData });
      console.log(`✓ Tier: ${tier.name}`);
    } else {
      console.log(`→ Tier exists: ${tier.name}`);
    }
    await upsertZoneEntitlements(tier.code, "tier", zones);
  }

  // ── 4. Credit packs ──────────────────────────────────────────────────────
  for (const pack of CREDIT_PACKS) {
    const { zones, ...packData } = pack;
    const existing = await prisma.tier.findUnique({ where: { code: pack.code } });
    if (!existing) {
      await prisma.tier.create({ data: packData });
      console.log(`✓ Credit pack: ${pack.name}`);
    } else {
      console.log(`→ Credit pack exists: ${pack.name}`);
    }
    await upsertZoneEntitlements(pack.code, "tier", zones);
  }

  // ── 5. Staff user ────────────────────────────────────────────────────────
  const staffEmail = "staff@ao-os.local";
  const staffUser = await prisma.staffUser.findUnique({ where: { email: staffEmail } });
  if (!staffUser) {
    const passwordHash = await argon2.hash("TestPassword123!");
    await prisma.staffUser.create({
      data: { email: staffEmail, fullName: "Test Staff", passwordHash, role: "admin", active: true, locationId: toronto.id },
    });
    console.log("✓ Staff user:", staffEmail);
  } else {
    console.log("→ Staff user exists:", staffEmail);
  }

  // ── 6. Test members ──────────────────────────────────────────────────────
  const anonMember = await prisma.member.create({
    data: { publicMemberNumber: `AO-TEST-ANON-${Date.now()}`, type: "anonymous", alias: "TestWalkIn", status: "active" },
  });
  console.log("✓ Anonymous member:", anonMember.id);

  const regMember = await prisma.member.create({
    data: {
      publicMemberNumber: `AO-TEST-REG-${Date.now()}`,
      type: "registered",
      email: `test-member-${Date.now()}@test.local`,
      displayName: "Test Registered Member",
      status: "pending",
    },
  });
  console.log("✓ Registered member:", regMember.id);

  console.log("\n✅ Seed complete.");
  console.log("\nStaff:", staffEmail, "/ TestPassword123!");
  console.log("Members:", anonMember.id, "(anon)", regMember.id, "(registered)");
}

seed()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
