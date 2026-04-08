import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type AreaDefinition = {
  code: string;
  name: string;
  areaType: "room" | "corridor" | "entry" | "service" | "bath" | "lounge" | "locker_bank";
  x: string;
  y: string;
  width: string;
  height: string;
};

type RoomDefinition = {
  code: string;
  name: string;
  roomType: "private" | "premium_private" | "retreat" | "accessible";
  privacyLevel: "standard" | "high" | "premium";
  status: "available" | "booked" | "occupied" | "cleaning" | "out_of_service";
  cleaningRequired: boolean;
};

type AccessNodeDefinition = {
  code: string;
  name: string;
  nodeType: "entry" | "reader" | "service_point";
  x: string;
  y: string;
  zoneCode: string;
  detail: string;
};

type DeviceDefinition = {
  code: string;
  name: string;
  deviceType: "door_controller" | "camera" | "environmental";
  x: string;
  y: string;
  zoneCode: string;
  status: "online" | "offline" | "degraded";
  detail: string;
};

type FloorTopologyDefinition = {
  floorPlanName: string;
  floorCode: string;
  floorName: string;
  levelIndex: number;
  areas: readonly AreaDefinition[];
  rooms: readonly RoomDefinition[];
  polygons: Record<string, { x: number; y: number }[]>;
  accessNodes: readonly AccessNodeDefinition[];
  devices: readonly DeviceDefinition[];
};

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

const mainFloorRooms = [
  { code: "RM-01", name: "Ember Room", roomType: "private", privacyLevel: "high", status: "occupied", cleaningRequired: true },
  { code: "RM-02", name: "Cedar Room", roomType: "premium_private", privacyLevel: "premium", status: "booked", cleaningRequired: true },
  { code: "RM-03", name: "Juniper Room", roomType: "retreat", privacyLevel: "high", status: "available", cleaningRequired: true },
  { code: "RM-04", name: "Willow Room", roomType: "accessible", privacyLevel: "standard", status: "cleaning", cleaningRequired: true }
] as const;

const mainFloorPolygons: Record<string, { x: number; y: number }[]> = {
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

const mainFloorAccessNodes = [
  { code: "MAIN-ENTRY", name: "Main Entry", nodeType: "entry", x: "7", y: "45", zoneCode: "ENT-1", detail: "Primary guest ingress." },
  { code: "OPS-POINT", name: "Operations Point", nodeType: "service_point", x: "9", y: "67", zoneCode: "OPS-1", detail: "Staff operational checkpoint." },
  { code: "RM-01-READER", name: "Ember Reader", nodeType: "reader", x: "20", y: "67", zoneCode: "RM-01", detail: "Reader at Ember threshold." },
  { code: "RM-02-READER", name: "Cedar Reader", nodeType: "reader", x: "36", y: "67", zoneCode: "RM-02", detail: "Reader at Cedar threshold." },
  { code: "RM-03-READER", name: "Juniper Reader", nodeType: "reader", x: "52", y: "67", zoneCode: "RM-03", detail: "Reader at Juniper threshold." },
  { code: "RM-04-READER", name: "Willow Reader", nodeType: "reader", x: "68", y: "67", zoneCode: "RM-04", detail: "Reader at Willow threshold." }
] as const;

const mainFloorDevices = [
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

const lowerFloorRooms = [
  { code: "LL-01", name: "Stone Room", roomType: "retreat", privacyLevel: "high", status: "available", cleaningRequired: true },
  { code: "LL-02", name: "Moss Room", roomType: "private", privacyLevel: "standard", status: "booked", cleaningRequired: true },
  { code: "LL-03", name: "Cove Room", roomType: "premium_private", privacyLevel: "premium", status: "out_of_service", cleaningRequired: true }
] as const;

const lowerFloorPolygons: Record<string, { x: number; y: number }[]> = {
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

const lowerFloorAccessNodes = [
  { code: "LOW-STAIR-ENTRY", name: "Lower Landing", nodeType: "entry", x: "10", y: "25", zoneCode: "LOW-STAIR", detail: "Vertical circulation arrival point." },
  { code: "LOW-SVC-OPS", name: "Lower Support Point", nodeType: "service_point", x: "10", y: "48", zoneCode: "LOW-SVC", detail: "Support checkpoint for the lower level." },
  { code: "LL-01-READER", name: "Stone Reader", nodeType: "reader", x: "22", y: "71", zoneCode: "LL-01", detail: "Reader at Stone Room threshold." },
  { code: "LL-02-READER", name: "Moss Reader", nodeType: "reader", x: "40", y: "71", zoneCode: "LL-02", detail: "Reader at Moss Room threshold." },
  { code: "LL-03-READER", name: "Cove Reader", nodeType: "reader", x: "58", y: "71", zoneCode: "LL-03", detail: "Reader at Cove Room threshold." }
] as const;

const lowerFloorDevices = [
  { code: "LOW-COR-CAM", name: "Lower Corridor Camera", deviceType: "camera", x: "50", y: "16", zoneCode: "LOW-COR", status: "online", detail: "Shared circulation monitoring." },
  { code: "LOW-LNG-AIR", name: "Quiet Lounge Sensor", deviceType: "environmental", x: "27", y: "44", zoneCode: "LOW-LNG", status: "online", detail: "Ambient monitoring in the quiet lounge." },
  { code: "LL-01-CTRL", name: "Stone Controller", deviceType: "door_controller", x: "32", y: "71", zoneCode: "LL-01", status: "online", detail: "Door controller for Stone Room." },
  { code: "LL-02-CTRL", name: "Moss Controller", deviceType: "door_controller", x: "50", y: "71", zoneCode: "LL-02", status: "degraded", detail: "Door controller with intermittent telemetry." },
  { code: "LL-03-CTRL", name: "Cove Controller", deviceType: "door_controller", x: "68", y: "71", zoneCode: "LL-03", status: "offline", detail: "Door controller isolated for maintenance." }
] as const;

const topologyDefinitions: readonly FloorTopologyDefinition[] = [
  {
    floorPlanName: "AO Sanctuary Main Floor",
    floorCode: "MAIN",
    floorName: "Main Floor",
    levelIndex: 0,
    areas: mainFloorAreas,
    rooms: mainFloorRooms,
    polygons: mainFloorPolygons,
    accessNodes: mainFloorAccessNodes,
    devices: mainFloorDevices
  },
  {
    floorPlanName: "AO Sanctuary Lower Level",
    floorCode: "LOWER",
    floorName: "Lower Level",
    levelIndex: -1,
    areas: lowerFloorAreas,
    rooms: lowerFloorRooms,
    polygons: lowerFloorPolygons,
    accessNodes: lowerFloorAccessNodes,
    devices: lowerFloorDevices
  }
] as const;

async function ensureAoSanctuaryLocationAndFacility() {
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

  return { location, facility };
}

async function ensureFloorTopology(
  locationId: string,
  facilityId: string,
  definition: FloorTopologyDefinition
) {
  let floorPlan = await prisma.floorPlan.findFirst({
    where: {
      locationId,
      name: definition.floorPlanName
    }
  });

  if (!floorPlan) {
    floorPlan = await prisma.floorPlan.create({
      data: {
        locationId,
        name: definition.floorPlanName,
        active: true
      }
    });
  }

  const floor = await prisma.floor.upsert({
    where: { floorPlanId: floorPlan.id },
    update: {
      facilityId,
      code: definition.floorCode,
      name: definition.floorName,
      levelIndex: definition.levelIndex,
      active: true
    },
    create: {
      facilityId,
      floorPlanId: floorPlan.id,
      code: definition.floorCode,
      name: definition.floorName,
      levelIndex: definition.levelIndex,
      active: true
    }
  });

  const areasByCode = new Map<string, { id: string }>();
  for (const area of definition.areas) {
    const savedArea = await prisma.floorPlanArea.upsert({
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

    areasByCode.set(area.code, { id: savedArea.id });
  }

  const roomsByCode = new Map<string, { id: string }>();
  for (const room of definition.rooms) {
    const area = areasByCode.get(room.code);
    if (!area) {
      continue;
    }

    const existingRoom = await prisma.room.findUnique({ where: { code: room.code } });
    const savedRoom = existingRoom
      ? await prisma.room.update({
          where: { code: room.code },
          data: {
            locationId,
            floorPlanAreaId: area.id,
            name: room.name,
            roomType: room.roomType,
            privacyLevel: room.privacyLevel,
            active: true,
            bookable: true,
            cleaningRequired: room.cleaningRequired
          }
        })
      : await prisma.room.create({
          data: {
            locationId,
            floorPlanAreaId: area.id,
            code: room.code,
            name: room.name,
            roomType: room.roomType,
            privacyLevel: room.privacyLevel,
            status: room.status,
            active: true,
            bookable: true,
            cleaningRequired: room.cleaningRequired
          }
        });

    roomsByCode.set(room.code, { id: savedRoom.id });
  }

  const zonesByCode = new Map<string, { id: string }>();
  for (const area of definition.areas) {
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
        polygonJson: definition.polygons[area.code] as Prisma.InputJsonValue,
        active: true
      },
      create: {
        floorId: floor.id,
        floorPlanAreaId: persistedArea.id,
        roomId: room?.id,
        code: area.code,
        name: area.name,
        zoneType: area.areaType,
        polygonJson: definition.polygons[area.code] as Prisma.InputJsonValue,
        active: true
      }
    });

    zonesByCode.set(area.code, { id: zone.id });
  }

  for (const node of definition.accessNodes) {
    const zone = zonesByCode.get(node.zoneCode);
    const existingNode = await prisma.accessNode.findUnique({ where: { code: node.code } });

    if (existingNode) {
      await prisma.accessNode.update({
        where: { code: node.code },
        data: {
          floorId: floor.id,
          zoneId: zone?.id ?? null,
          name: node.name,
          nodeType: node.nodeType,
          x: new Prisma.Decimal(node.x),
          y: new Prisma.Decimal(node.y),
          active: true,
          metadataJson: { detail: node.detail } as Prisma.InputJsonValue
        }
      });
      continue;
    }

    await prisma.accessNode.create({
      data: {
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

  for (const device of definition.devices) {
    const zone = zonesByCode.get(device.zoneCode);
    const existingDevice = await prisma.device.findUnique({ where: { code: device.code } });

    if (existingDevice) {
      await prisma.device.update({
        where: { code: device.code },
        data: {
          floorId: floor.id,
          zoneId: zone?.id ?? null,
          name: device.name,
          deviceType: device.deviceType,
          x: new Prisma.Decimal(device.x),
          y: new Prisma.Decimal(device.y),
          active: true,
          metadataJson: { detail: device.detail } as Prisma.InputJsonValue
        }
      });
      continue;
    }

    await prisma.device.create({
      data: {
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

  console.log(`Seeded topology for ${definition.floorPlanName}`);
}

async function main() {
  console.log("Seeding AO Sanctuary facility topology...");

  const { location, facility } = await ensureAoSanctuaryLocationAndFacility();

  for (const definition of topologyDefinitions) {
    await ensureFloorTopology(location.id, facility.id, definition);
  }

  console.log("Facility topology seed complete.");
}

main()
  .catch((error) => {
    console.error("Facility topology seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });