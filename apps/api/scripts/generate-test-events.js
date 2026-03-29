#!/usr/bin/env node

// Direct database insertion of test events for Phase 1 polling validation
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=== Generating Test Events ===\n");

  const now = new Date();
  const testMemberId = "14b6139e-1a68-402d-9a80-5c356d9191c5";
  const testLockerId = "c18c97ef-7e39-4a6a-9fb7-dea46ceca32c";
  const testRoomId = "6301ff12-0933-4ba5-8c9d-253d66982871";

  try {
    // Get or use null for optional foreign keys
    const wristband = await prisma.wristband.findFirst();
    const wristbandId = wristband?.id || null;
    // 1. Create LockerAccessEvent
    console.log("1. Creating LockerAccessEvent...");
    const lockerAccess = await prisma.lockerAccessEvent.create({
      data: {
        id: `test-lac-${Date.now()}`,
        memberId: testMemberId,
        lockerId: testLockerId,
        wristbandId: wristbandId,
        decision: "allowed",
        eventType: "unlock",
        occurredAt: new Date(now.getTime() - 90000),
        sourceReference: "test-poll-001"
      }
    });
    console.log(`✓ Created: ${lockerAccess.id}`);

    // 2. Create PresenceEvent
    console.log("\n2. Creating PresenceEvent...");
    // First create a VisitSession for the presence event
    const session = await prisma.visitSession.create({
      data: {
        id: `test-vs-${Date.now()}`,
        memberId: testMemberId,
        locationId: "aaaaaaaa-0000-0000-0000-000000000001", // Use seeded location
        status: "checked_in",
        checkInAt: new Date(now.getTime() - 60000)
      }
    });

    const presenceEvent = await prisma.presenceEvent.create({
      data: {
        id: `test-pe-${Date.now()}`,
        visitSessionId: session.id,
        memberId: testMemberId,
        accessZoneId: "bbbbbbbb-0000-0000-0000-000000000001", // Use seeded access zone
        eventType: "entry",
        sourceType: "sensor",
        sourceReference: "door-sensor-001",
        occurredAt: new Date(now.getTime() - 60000)
      }
    });
    console.log(`✓ Created: ${presenceEvent.id}`);

    // 3. Create AccessAttempt
    console.log("\n3. Creating AccessAttempt...");
    const accessAttempt = await prisma.accessAttempt.create({
      data: {
        id: `test-aa-${Date.now()}`,
        memberId: testMemberId,
        accessPointId: "cccccccc-0000-0000-0000-000000000001", // Use seeded access point
        accessZoneId: "bbbbbbbb-0000-0000-0000-000000000001", // Use seeded access zone
        decision: "allowed",
        occurredAt: new Date(now.getTime() - 45000)
      }
    });
    console.log(`✓ Created: ${accessAttempt.id}`);

    // 4. Create RoomAccessEvent
    console.log("\n4. Creating RoomAccessEvent...");
    const roomAccess = await prisma.roomAccessEvent.create({
      data: {
        id: `test-rae-${Date.now()}`,
        roomId: testRoomId,
        memberId: testMemberId,
        wristbandId: wristbandId,
        decision: "allowed",
        eventType: "unlock",
        sourceType: "wristband_reader",
        sourceReference: "lock-001",
        occurredAt: new Date(now.getTime() - 30000)
      }
    });
    console.log(`✓ Created: ${roomAccess.id}`);

    // 5. Create StaffAuditEvent
    console.log("\n5. Creating StaffAuditEvent...");
    const auditEvent = await prisma.staffAuditEvent.create({
      data: {
        id: `test-sae-${Date.now()}`,
        eventType: "locker_policy_evaluated",
        actorStaffUserId: "3abb2e39-d067-4a10-8cc9-648aea07046f",
        actorEmailSnapshot: "staff@ao-os.local",
        actorRoleSnapshot: "admin",
        targetStaffUserId: null,
        outcome: "success",
        occurredAt: new Date(now.getTime() - 20000)
      }
    });
    console.log(`✓ Created: ${auditEvent.id}`);

    // 6. Create RoomBooking
    console.log("\n6. Creating RoomBooking...");
    try {
      // Check if a room exists first
      const existingRoom = await prisma.room.findFirst();
      if (existingRoom) {
        const booking = await prisma.roomBooking.create({
          data: {
            id: `test-rb-${Date.now()}`,
            memberId: testMemberId,
            roomId: existingRoom.id,
            bookingType: "restore",
            status: "reserved",
            startsAt: new Date(now.getTime() - 10000),
            endsAt: new Date(now.getTime() + 3600000),
            sourceType: "manual_staff",
            sourceReference: "test-booking"
          }
        });
        console.log(`✓ Created: ${booking.id}`);
      } else {
        console.log("⚠ Skipped: No rooms available in database");
      }
    } catch (err) {
      console.log(`⚠ Skipped: ${err.message}`);
    }

    // 7. Create CleaningTask
    console.log("\n7. Creating CleaningTask...");
    try {
      // Check if a room exists first
      const existingRoom = await prisma.room.findFirst();
      if (existingRoom) {
        const cleaningTask = await prisma.cleaningTask.create({
          data: {
            id: `test-ct-${Date.now()}`,
            roomId: existingRoom.id,
            taskType: "turnover",
            status: "open"
          }
        });
        console.log(`✓ Created: ${cleaningTask.id}`);
      } else {
        console.log("⚠ Skipped: No rooms available in database");
      }
    } catch (err) {
      console.log(`⚠ Skipped: ${err.message}`);
    }

    console.log("\n=== Test Events Generated ===");
    console.log("All 7 event types have been created.");
    console.log("\nNext: Call polling endpoint to retrieve the events:");
    console.log("  GET /v1/events/poll -H 'Authorization: Bearer <JWT>'");

  } catch (error) {
    console.error("Error creating test events:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
