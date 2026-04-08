import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const mainFloorAreas = [
  { code: "ENT-1", name: "Arrival Threshold", areaType: "entry", x: "2", y: "36", width: "10", height: "18" },
  { code: "COR-1", name: "Main Corridor", areaType: "corridor", x: "12", y: "38", width: "72", height: "14" },
  { code: "LNG-1", name: "Tea Lounge", areaType: "lounge", x: "18", y: "10", width: "18", height: "18" },
  { code: "OPS-1", name: "Operations Desk", areaType: "service", x: "2", y: "58", width: "14", height: "18" },
  { code: "BTH-1", name: "Bath Suite", areaType: "bath", x: "82", y: "12", width: "14", height: "18" },
  { code: "LKR-1", name: "Locker Bank", areaType: "locker_bank", x: "84", y: "58", width: "12", height: "20" },
  { code: "RM-01", name: "Ember Room", areaType: "room", x: "18", y: "58", width: "14", height: "18" },
  { code: "RM-02", name: "Cedar Room", areaType: "room", x: "34", y: "58", width: "14", height: "18" },
  { code: "RM-03", name: "Juniper Room", areaType: "room", x: "50", y: "58", width: "14", height: "18" },
  { code: "RM-04", name: "Willow Room", areaType: "room", x: "66", y: "58", width: "14", height: "18" }
] as const;

const roomDefinitions = [
  { code: "RM-01", name: "Ember Room", roomType: "private", privacyLevel: "high", status: "occupied", cleaningRequired: true },
  { code: "RM-02", name: "Cedar Room", roomType: "premium_private", privacyLevel: "premium", status: "booked", cleaningRequired: true },
  { code: "RM-03", name: "Juniper Room", roomType: "retreat", privacyLevel: "high", status: "available", cleaningRequired: true },
  { code: "RM-04", name: "Willow Room", roomType: "accessible", privacyLevel: "standard", status: "cleaning", cleaningRequired: true }
] as const;

const zonePolygons: Record<string, { x: number; y: number }[]> = {
  "ENT-1": [{ x: 2, y: 36 }, { x: 12, y: 36 }, { x: 12, y: 54 }, { x: 2, y: 54 }],
  "COR-1": [{ x: 12, y: 38 }, { x: 84, y: 38 }, { x: 84, y: 52 }, { x: 12, y: 52 }],
  "LNG-1": [{ x: 18, y: 10 }, { x: 36, y: 10 }, { x: 36, y: 28 }, { x: 18, y: 28 }],
  "OPS-1": [{ x: 2, y: 58 }, { x: 16, y: 58 }, { x: 16, y: 76 }, { x: 2, y: 76 }],
  "BTH-1": [{ x: 82, y: 12 }, { x: 96, y: 12 }, { x: 96, y: 30 }, { x: 82, y: 30 }],
  "LKR-1": [{ x: 84, y: 58 }, { x: 96, y: 58 }, { x: 96, y: 78 }, { x: 84, y: 78 }],
  "RM-01": [{ x: 18, y: 58 }, { x: 32, y: 58 }, { x: 32, y: 76 }, { x: 18, y: 76 }],
  "RM-02": [{ x: 34, y: 58 }, { x: 48, y: 58 }, { x: 48, y: 76 }, { x: 34, y: 76 }],
  "RM-03": [{ x: 50, y: 58 }, { x: 64, y: 58 }, { x: 64, y: 76 }, { x: 50, y: 76 }],
  "RM-04": [{ x: 66, y: 58 }, { x: 80, y: 58 }, { x: 80, y: 76 }, { x: 66, y: 76 }]
};

const accessNodeDefinitions = [
  { code: "MAIN-ENTRY", name: "Main Entry", nodeType: "entry", x: "7", y: "45", zoneCode: "ENT-1", detail: "Primary guest ingress." },
  { code: "OPS-POINT", name: "Operations Point", nodeType: "service_point", x: "9", y: "67", zoneCode: "OPS-1", detail: "Staff operational checkpoint." },
  { code: "RM-01-READER", name: "Ember Reader", nodeType: "reader", x: "20", y: "67", zoneCode: "RM-01", detail: "Reader at Ember threshold." },
  { code: "RM-02-READER", name: "Cedar Reader", nodeType: "reader", x: "36", y: "67", zoneCode: "RM-02", detail: "Reader at Cedar threshold." },
  { code: "RM-03-READER", name: "Juniper Reader", nodeType: "reader", x: "52", y: "67", zoneCode: "RM-03", detail: "Reader at Juniper threshold." },
  { code: "RM-04-READER", name: "Willow Reader", nodeType: "reader", x: "68", y: "67", zoneCode: "RM-04", detail: "Reader at Willow threshold." }
] as const;

const deviceDefinitions = [
  { code: "COR-1-CAM", name: "Corridor Camera", deviceType: "camera", x: "48", y: "34", zoneCode: "COR-1", status: "online", detail: "Shared corridor visibility." },
  { code: "ENT-1-CAM", name: "Entry Camera", deviceType: "camera", x: "7", y: "32", zoneCode: "ENT-1", status: "online", detail: "Entry lane visibility." },
  { code: "RM-01-CTRL", name: "Ember Controller", deviceType: "door_controller", x: "30", y: "67", zoneCode: "RM-01", status: "online", detail: "Door controller for Ember Room." },
  { code: "RM-02-CTRL", name: "Cedar Controller", deviceType: "door_controller", x: "46", y: "67", zoneCode: "RM-02", status: "degraded", detail: "Door controller with degraded telemetry." },
  { code: "RM-03-CTRL", name: "Juniper Controller", deviceType: "door_controller", x: "62", y: "67", zoneCode: "RM-03", status: "online", detail: "Door controller for Juniper Room." },
  { code: "RM-04-CTRL", name: "Willow Controller", deviceType: "door_controller", x: "78", y: "67", zoneCode: "RM-04", status: "offline", detail: "Door controller awaiting maintenance." },
  { code: "LNG-1-AIR", name: "Lounge Climate Sensor", deviceType: "environmental", x: "27", y: "16", zoneCode: "LNG-1", status: "online", detail: "Environmental monitoring in lounge." }
] as const;

const lowerFloorAreas = [
  { code: "LOW-STAIR", name: "Stair Landing", areaType: "entry", x: "4", y: "18", width: "12", height: "14" },
  { code: "LOW-COR", name: "Lower Corridor", areaType: "corridor", x: "16", y: "20", width: "68", height: "12" },
  { code: "LOW-LNG", name: "Quiet Lounge", areaType: "lounge", x: "18", y: "40", width: "18", height: "16" },
  { code: "LOW-SVC", name: "Support Alcove", areaType: "service", x: "4", y: "40", width: "12", height: "16" },
  { code: "LOW-BTH", name: "Cold Rinse", areaType: "bath", x: "84", y: "10", width: "12", height: "18" },
  { code: "LL-01", name: "Stone Room", areaType: "room", x: "20", y: "62", width: "14", height: "18" },
  { code: "LL-02", name: "Moss Room", areaType: "room", x: "38", y: "62", width: "14", height: "18" },
  { code: "LL-03", name: "Cove Room", areaType: "room", x: "56", y: "62", width: "14", height: "18" },
  { code: "LOW-LKR", name: "Lower Lockers", areaType: "locker_bank", x: "76", y: "58", width: "18", height: "22" }
] as const;

const lowerFloorRoomDefinitions = [
  { code: "LL-01", name: "Stone Room", roomType: "retreat", privacyLevel: "high", status: "available", cleaningRequired: true },
  { code: "LL-02", name: "Moss Room", roomType: "private", privacyLevel: "standard", status: "booked", cleaningRequired: true },
  { code: "LL-03", name: "Cove Room", roomType: "premium_private", privacyLevel: "premium", status: "out_of_service", cleaningRequired: true }
] as const;

const lowerFloorZonePolygons: Record<string, { x: number; y: number }[]> = {
  "LOW-STAIR": [{ x: 4, y: 18 }, { x: 16, y: 18 }, { x: 16, y: 32 }, { x: 4, y: 32 }],
  "LOW-COR": [{ x: 16, y: 20 }, { x: 84, y: 20 }, { x: 84, y: 32 }, { x: 16, y: 32 }],
  "LOW-LNG": [{ x: 18, y: 40 }, { x: 36, y: 40 }, { x: 36, y: 56 }, { x: 18, y: 56 }],
  "LOW-SVC": [{ x: 4, y: 40 }, { x: 16, y: 40 }, { x: 16, y: 56 }, { x: 4, y: 56 }],
  "LOW-BTH": [{ x: 84, y: 10 }, { x: 96, y: 10 }, { x: 96, y: 28 }, { x: 84, y: 28 }],
  "LL-01": [{ x: 20, y: 62 }, { x: 34, y: 62 }, { x: 34, y: 80 }, { x: 20, y: 80 }],
  "LL-02": [{ x: 38, y: 62 }, { x: 52, y: 62 }, { x: 52, y: 80 }, { x: 38, y: 80 }],
  "LL-03": [{ x: 56, y: 62 }, { x: 70, y: 62 }, { x: 70, y: 80 }, { x: 56, y: 80 }],
  "LOW-LKR": [{ x: 76, y: 58 }, { x: 94, y: 58 }, { x: 94, y: 80 }, { x: 76, y: 80 }]
};

const lowerFloorAccessNodeDefinitions = [
  { code: "LOW-STAIR-ENTRY", name: "Lower Landing", nodeType: "entry", x: "10", y: "25", zoneCode: "LOW-STAIR", detail: "Vertical circulation arrival point." },
  { code: "LOW-SVC-OPS", name: "Lower Support Point", nodeType: "service_point", x: "10", y: "48", zoneCode: "LOW-SVC", detail: "Support checkpoint for the lower level." },
  { code: "LL-01-READER", name: "Stone Reader", nodeType: "reader", x: "22", y: "71", zoneCode: "LL-01", detail: "Reader at Stone Room threshold." },
  { code: "LL-02-READER", name: "Moss Reader", nodeType: "reader", x: "40", y: "71", zoneCode: "LL-02", detail: "Reader at Moss Room threshold." },
  { code: "LL-03-READER", name: "Cove Reader", nodeType: "reader", x: "58", y: "71", zoneCode: "LL-03", detail: "Reader at Cove Room threshold." }
] as const;

const lowerFloorDeviceDefinitions = [
  { code: "LOW-COR-CAM", name: "Lower Corridor Camera", deviceType: "camera", x: "50", y: "16", zoneCode: "LOW-COR", status: "online", detail: "Shared circulation monitoring." },
  { code: "LOW-LNG-AIR", name: "Quiet Lounge Sensor", deviceType: "environmental", x: "27", y: "44", zoneCode: "LOW-LNG", status: "online", detail: "Ambient monitoring in the quiet lounge." },
  { code: "LL-01-CTRL", name: "Stone Controller", deviceType: "door_controller", x: "32", y: "71", zoneCode: "LL-01", status: "online", detail: "Door controller for Stone Room." },
  { code: "LL-02-CTRL", name: "Moss Controller", deviceType: "door_controller", x: "50", y: "71", zoneCode: "LL-02", status: "degraded", detail: "Door controller with intermittent telemetry." },
  { code: "LL-03-CTRL", name: "Cove Controller", deviceType: "door_controller", x: "68", y: "71", zoneCode: "LL-03", status: "offline", detail: "Door controller isolated for maintenance." }
] as const;

async function ensureAoSanctuaryMainFloor() {
  const location = await prisma.location.upsert({
    where: { code: "AO_SANCTUARY" },
    update: { name: "AO Sanctuary" },
    create: { code: "AO_SANCTUARY", name: "AO Sanctuary" }
  });

  const facility = await prisma.facility.upsert({
    where: { code: "AO_SANCTUARY_FACILITY" },
    update: {
      name: "AO Sanctuary Campus",
      locationId: location.id
    },
    create: {
      code: "AO_SANCTUARY_FACILITY",
      name: "AO Sanctuary Campus",
      locationId: location.id
    }
  });

  let floorPlan = await prisma.floorPlan.findFirst({
    where: {
      locationId: location.id,
      name: "AO Sanctuary Main Floor"
    }
  });

  if (!floorPlan) {
    floorPlan = await prisma.floorPlan.create({
      data: {
        locationId: location.id,
        name: "AO Sanctuary Main Floor",
        active: true
      }
    });
  }

  const floor = await prisma.floor.upsert({
    where: { floorPlanId: floorPlan.id },
    update: {
      facilityId: facility.id,
      code: "MAIN",
      name: "Main Floor",
      levelIndex: 0,
      active: true
    },
    create: {
      facilityId: facility.id,
      floorPlanId: floorPlan.id,
      code: "MAIN",
      name: "Main Floor",
      levelIndex: 0,
      active: true
    }
  });

  const areasByCode = new Map<string, { id: string; areaType: string }>();

  for (const area of mainFloorAreas) {
    const saved = await prisma.floorPlanArea.upsert({
      where: {
        floorPlanId_code: {
          floorPlanId: floorPlan.id,
          code: area.code
        }
      },
      update: {
        name: area.name,
        areaType: area.areaType,
        x: new Prisma.Decimal(area.x),
        y: new Prisma.Decimal(area.y),
        width: new Prisma.Decimal(area.width),
        height: new Prisma.Decimal(area.height),
        active: true
      },
      create: {
        floorPlanId: floorPlan.id,
        code: area.code,
        name: area.name,
        areaType: area.areaType,
        x: new Prisma.Decimal(area.x),
        y: new Prisma.Decimal(area.y),
        width: new Prisma.Decimal(area.width),
        height: new Prisma.Decimal(area.height),
        active: true
      }
    });

    areasByCode.set(area.code, { id: saved.id, areaType: saved.areaType });
  }

  const roomsByCode = new Map<string, { id: string }>();

  for (const roomDefinition of roomDefinitions) {
    const area = areasByCode.get(roomDefinition.code);
    if (!area) {
      continue;
    }

    const room = await prisma.room.upsert({
      where: { code: roomDefinition.code },
      update: {
        locationId: location.id,
        floorPlanAreaId: area.id,
        name: roomDefinition.name,
        roomType: roomDefinition.roomType,
        privacyLevel: roomDefinition.privacyLevel,
        status: roomDefinition.status,
        active: true,
        bookable: true,
        cleaningRequired: roomDefinition.cleaningRequired
      },
      create: {
        locationId: location.id,
        floorPlanAreaId: area.id,
        code: roomDefinition.code,
        name: roomDefinition.name,
        roomType: roomDefinition.roomType,
        privacyLevel: roomDefinition.privacyLevel,
        status: roomDefinition.status,
        active: true,
        bookable: true,
        cleaningRequired: roomDefinition.cleaningRequired
      }
    });

    roomsByCode.set(roomDefinition.code, { id: room.id });
  }

  const zonesByCode = new Map<string, { id: string }>();

  for (const area of mainFloorAreas) {
    const persistedArea = areasByCode.get(area.code);
    if (!persistedArea) {
      continue;
    }

    const room = roomsByCode.get(area.code);
    const zone = await prisma.zone.upsert({
      where: {
        floorId_code: {
          floorId: floor.id,
          code: area.code
        }
      },
      update: {
        floorPlanAreaId: persistedArea.id,
        roomId: room?.id ?? null,
        name: area.name,
        zoneType: area.areaType,
        polygonJson: zonePolygons[area.code] as Prisma.InputJsonValue,
        active: true
      },
      create: {
        floorId: floor.id,
        floorPlanAreaId: persistedArea.id,
        roomId: room?.id,
        code: area.code,
        name: area.name,
        zoneType: area.areaType,
        polygonJson: zonePolygons[area.code] as Prisma.InputJsonValue,
        active: true
      }
    });

    zonesByCode.set(area.code, { id: zone.id });
  }

  for (const node of accessNodeDefinitions) {
    const zone = zonesByCode.get(node.zoneCode);
    await prisma.accessNode.upsert({
      where: { code: node.code },
      update: {
        floorId: floor.id,
        zoneId: zone?.id ?? null,
        name: node.name,
        nodeType: node.nodeType,
        x: new Prisma.Decimal(node.x),
        y: new Prisma.Decimal(node.y),
        status: "online",
        active: true,
        metadataJson: { detail: node.detail } as Prisma.InputJsonValue
      },
      create: {
        floorId: floor.id,
        zoneId: zone?.id,
        code: node.code,
        name: node.name,
        nodeType: node.nodeType,
        x: new Prisma.Decimal(node.x),
        y: new Prisma.Decimal(node.y),
        status: "online",
        active: true,
        metadataJson: { detail: node.detail } as Prisma.InputJsonValue
      }
    });
  }

  for (const device of deviceDefinitions) {
    const zone = zonesByCode.get(device.zoneCode);
    await prisma.device.upsert({
      where: { code: device.code },
      update: {
        floorId: floor.id,
        zoneId: zone?.id ?? null,
        name: device.name,
        deviceType: device.deviceType,
        x: new Prisma.Decimal(device.x),
        y: new Prisma.Decimal(device.y),
        status: device.status,
        active: true,
        metadataJson: { detail: device.detail } as Prisma.InputJsonValue
      },
      create: {
        floorId: floor.id,
        zoneId: zone?.id,
        code: device.code,
        name: device.name,
        deviceType: device.deviceType,
        x: new Prisma.Decimal(device.x),
        y: new Prisma.Decimal(device.y),
        status: device.status,
        active: true,
        metadataJson: { detail: device.detail } as Prisma.InputJsonValue
      }
    });
  }

  const demoMember = await prisma.member.upsert({
    where: { email: "floor-demo@ao-os.local" },
    update: {
      displayName: "Facility Demo Member",
      status: "active"
    },
    create: {
      publicMemberNumber: "AO-DEMO-FLOOR",
      type: "registered",
      email: "floor-demo@ao-os.local",
      displayName: "Facility Demo Member",
      status: "active"
    }
  });

  const now = new Date();
  const roomOne = roomsByCode.get("RM-01");
  const roomTwo = roomsByCode.get("RM-02");

  if (roomOne) {
    const currentBooking = await prisma.roomBooking.findFirst({
      where: {
        roomId: roomOne.id,
        sourceReference: "facility-seed-current"
      }
    });

    if (!currentBooking) {
      await prisma.roomBooking.create({
        data: {
          memberId: demoMember.id,
          roomId: roomOne.id,
          bookingType: "restore",
          status: "checked_in",
          startsAt: new Date(now.getTime() - 30 * 60 * 1000),
          endsAt: new Date(now.getTime() + 45 * 60 * 1000),
          sourceType: "manual_staff",
          sourceReference: "facility-seed-current",
          waitlistPriority: 0,
          checkedInAt: new Date(now.getTime() - 25 * 60 * 1000)
        }
      });
    }

    const activeVisitSession = await prisma.visitSession.findFirst({
      where: {
        memberId: demoMember.id,
        locationId: location.id,
        status: "checked_in",
        checkOutAt: null
      }
    });

    if (!activeVisitSession) {
      await prisma.visitSession.create({
        data: {
          memberId: demoMember.id,
          locationId: location.id,
          status: "checked_in",
          checkInAt: new Date(now.getTime() - 35 * 60 * 1000)
        }
      });
    }

    const latestAccessEvent = await prisma.roomAccessEvent.findFirst({
      where: {
        roomId: roomOne.id,
        sourceReference: "facility-seed-access"
      }
    });

    if (!latestAccessEvent) {
      const booking = await prisma.roomBooking.findFirst({
        where: {
          roomId: roomOne.id,
          sourceReference: "facility-seed-current"
        }
      });

      await prisma.roomAccessEvent.create({
        data: {
          bookingId: booking?.id,
          roomId: roomOne.id,
          memberId: demoMember.id,
          decision: "allowed",
          eventType: "unlock",
          occurredAt: new Date(now.getTime() - 12 * 60 * 1000),
          sourceType: "staff_console",
          sourceReference: "facility-seed-access"
        }
      });
    }
  }

  if (roomTwo) {
    const upcomingBooking = await prisma.roomBooking.findFirst({
      where: {
        roomId: roomTwo.id,
        sourceReference: "facility-seed-upcoming"
      }
    });

    if (!upcomingBooking) {
      await prisma.roomBooking.create({
        data: {
          memberId: demoMember.id,
          roomId: roomTwo.id,
          bookingType: "retreat",
          status: "reserved",
          startsAt: new Date(now.getTime() + 45 * 60 * 1000),
          endsAt: new Date(now.getTime() + 105 * 60 * 1000),
          sourceType: "manual_staff",
          sourceReference: "facility-seed-upcoming",
          waitlistPriority: 0
        }
      });
    }
  }

  console.log("✓ Seeded AO Sanctuary main-floor topology and demo live data");
}

async function ensureAoSanctuaryLowerFloor() {
  const location = await prisma.location.upsert({
    where: { code: "AO_SANCTUARY" },
    update: { name: "AO Sanctuary" },
    create: { code: "AO_SANCTUARY", name: "AO Sanctuary" }
  });

  const facility = await prisma.facility.upsert({
    where: { code: "AO_SANCTUARY_FACILITY" },
    update: {
      name: "AO Sanctuary Campus",
      locationId: location.id
    },
    create: {
      code: "AO_SANCTUARY_FACILITY",
      name: "AO Sanctuary Campus",
      locationId: location.id
    }
  });

  let floorPlan = await prisma.floorPlan.findFirst({
    where: {
      locationId: location.id,
      name: "AO Sanctuary Lower Level"
    }
  });

  if (!floorPlan) {
    floorPlan = await prisma.floorPlan.create({
      data: {
        locationId: location.id,
        name: "AO Sanctuary Lower Level",
        active: true
      }
    });
  }

  const floor = await prisma.floor.upsert({
    where: { floorPlanId: floorPlan.id },
    update: {
      facilityId: facility.id,
      code: "LOWER",
      name: "Lower Level",
      levelIndex: -1,
      active: true
    },
    create: {
      facilityId: facility.id,
      floorPlanId: floorPlan.id,
      code: "LOWER",
      name: "Lower Level",
      levelIndex: -1,
      active: true
    }
  });

  const areasByCode = new Map<string, { id: string; areaType: string }>();

  for (const area of lowerFloorAreas) {
    const saved = await prisma.floorPlanArea.upsert({
      where: {
        floorPlanId_code: {
          floorPlanId: floorPlan.id,
          code: area.code
        }
      },
      update: {
        name: area.name,
        areaType: area.areaType,
        x: new Prisma.Decimal(area.x),
        y: new Prisma.Decimal(area.y),
        width: new Prisma.Decimal(area.width),
        height: new Prisma.Decimal(area.height),
        active: true
      },
      create: {
        floorPlanId: floorPlan.id,
        code: area.code,
        name: area.name,
        areaType: area.areaType,
        x: new Prisma.Decimal(area.x),
        y: new Prisma.Decimal(area.y),
        width: new Prisma.Decimal(area.width),
        height: new Prisma.Decimal(area.height),
        active: true
      }
    });

    areasByCode.set(area.code, { id: saved.id, areaType: saved.areaType });
  }

  const roomsByCode = new Map<string, { id: string }>();

  for (const roomDefinition of lowerFloorRoomDefinitions) {
    const area = areasByCode.get(roomDefinition.code);
    if (!area) {
      continue;
    }

    const room = await prisma.room.upsert({
      where: { code: roomDefinition.code },
      update: {
        locationId: location.id,
        floorPlanAreaId: area.id,
        name: roomDefinition.name,
        roomType: roomDefinition.roomType,
        privacyLevel: roomDefinition.privacyLevel,
        status: roomDefinition.status,
        active: true,
        bookable: true,
        cleaningRequired: roomDefinition.cleaningRequired
      },
      create: {
        locationId: location.id,
        floorPlanAreaId: area.id,
        code: roomDefinition.code,
        name: roomDefinition.name,
        roomType: roomDefinition.roomType,
        privacyLevel: roomDefinition.privacyLevel,
        status: roomDefinition.status,
        active: true,
        bookable: true,
        cleaningRequired: roomDefinition.cleaningRequired
      }
    });

    roomsByCode.set(roomDefinition.code, { id: room.id });
  }

  const zonesByCode = new Map<string, { id: string }>();

  for (const area of lowerFloorAreas) {
    const persistedArea = areasByCode.get(area.code);
    if (!persistedArea) {
      continue;
    }

    const room = roomsByCode.get(area.code);
    const zone = await prisma.zone.upsert({
      where: {
        floorId_code: {
          floorId: floor.id,
          code: area.code
        }
      },
      update: {
        floorPlanAreaId: persistedArea.id,
        roomId: room?.id ?? null,
        name: area.name,
        zoneType: area.areaType,
        polygonJson: lowerFloorZonePolygons[area.code] as Prisma.InputJsonValue,
        active: true
      },
      create: {
        floorId: floor.id,
        floorPlanAreaId: persistedArea.id,
        roomId: room?.id,
        code: area.code,
        name: area.name,
        zoneType: area.areaType,
        polygonJson: lowerFloorZonePolygons[area.code] as Prisma.InputJsonValue,
        active: true
      }
    });

    zonesByCode.set(area.code, { id: zone.id });
  }

  for (const node of lowerFloorAccessNodeDefinitions) {
    const zone = zonesByCode.get(node.zoneCode);
    await prisma.accessNode.upsert({
      where: { code: node.code },
      update: {
        floorId: floor.id,
        zoneId: zone?.id ?? null,
        name: node.name,
        nodeType: node.nodeType,
        x: new Prisma.Decimal(node.x),
        y: new Prisma.Decimal(node.y),
        status: "online",
        active: true,
        metadataJson: { detail: node.detail } as Prisma.InputJsonValue
      },
      create: {
        floorId: floor.id,
        zoneId: zone?.id,
        code: node.code,
        name: node.name,
        nodeType: node.nodeType,
        x: new Prisma.Decimal(node.x),
        y: new Prisma.Decimal(node.y),
        status: "online",
        active: true,
        metadataJson: { detail: node.detail } as Prisma.InputJsonValue
      }
    });
  }

  for (const device of lowerFloorDeviceDefinitions) {
    const zone = zonesByCode.get(device.zoneCode);
    await prisma.device.upsert({
      where: { code: device.code },
      update: {
        floorId: floor.id,
        zoneId: zone?.id ?? null,
        name: device.name,
        deviceType: device.deviceType,
        x: new Prisma.Decimal(device.x),
        y: new Prisma.Decimal(device.y),
        status: device.status,
        active: true,
        metadataJson: { detail: device.detail } as Prisma.InputJsonValue
      },
      create: {
        floorId: floor.id,
        zoneId: zone?.id,
        code: device.code,
        name: device.name,
        deviceType: device.deviceType,
        x: new Prisma.Decimal(device.x),
        y: new Prisma.Decimal(device.y),
        status: device.status,
        active: true,
        metadataJson: { detail: device.detail } as Prisma.InputJsonValue
      }
    });
  }

  console.log("✓ Seeded AO Sanctuary lower-level topology");
}

async function seed() {
  console.log("🌱 Seeding test data...");

  // 1. Create test staff user (if not exists)
  const staffEmail = "staff@ao-os.local";
  const staffUser = await prisma.staffUser.findUnique({ where: { email: staffEmail } });

  if (!staffUser) {
    const passwordHash = await bcrypt.hash("TestPassword123!", 10);
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

  await ensureAoSanctuaryMainFloor();
  await ensureAoSanctuaryLowerFloor();

  console.log("\n✅ Seed complete!");
  console.log("\nTest credentials:");
  console.log("  Staff Email:", staffEmail);
  console.log("  Staff Password: TestPassword123!");
  console.log("\nTest members:");
  console.log("  Anonymous (walk-in):", anonMember.id);
  console.log("  Registered (pending):", regMember.id);
  console.log("  Facility demo member: floor-demo@ao-os.local");
}

seed()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
