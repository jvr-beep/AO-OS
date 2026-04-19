import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DeviceStatus, FloorPlanAreaType, RoomStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateFloorPlanAreaDto } from "../dto/create-floor-plan-area.dto";
import { CreateFloorPlanDto } from "../dto/create-floor-plan.dto";
import {
  FacilityAccessNodeResponseDto,
  FacilityBookingSummaryResponseDto,
  FacilityDeviceResponseDto,
  FacilityMapResponseDto,
  FacilityPointResponseDto,
  FacilityRoomAccessSummaryResponseDto,
  FacilityVisitSessionSummaryResponseDto,
  FacilityZoneResponseDto
} from "../dto/facility-map.response.dto";
import { FloorPlanAreaResponseDto } from "../dto/floor-plan-area.response.dto";
import { FloorPlanResponseDto } from "../dto/floor-plan.response.dto";
import { FloorPlanLiveResponseDto, LiveAreaDto } from "../dto/floor-plan-live.response.dto";
import { ListFloorPlansQueryDto } from "../dto/list-floor-plans.query.dto";

type FacilityMapBookingRow = {
  id: string;
  memberId: string;
  status: "reserved" | "checked_in" | "checked_out" | "expired" | "cancelled" | "no_show" | "waitlisted";
  startsAt: Date;
  endsAt: Date;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
};

type FacilityMapVisitSessionRow = {
  id: string;
  memberId: string;
  status: "checked_in" | "checked_out";
  checkInAt: Date;
  checkOutAt: Date | null;
};

@Injectable()
export class FloorPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async createFloorPlan(input: CreateFloorPlanDto): Promise<FloorPlanResponseDto> {
    const created = await this.prisma.floorPlan.create({
      data: {
        locationId: input.locationId,
        name: input.name,
        active: input.active ?? true
      },
      include: {
        areas: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return this.toFloorPlanResponse(created);
  }

  async createFloorPlanArea(
    floorPlanId: string,
    input: CreateFloorPlanAreaDto
  ): Promise<FloorPlanAreaResponseDto> {
    const floorPlan = await this.prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!floorPlan) {
      throw new NotFoundException("FLOOR_PLAN_NOT_FOUND");
    }

    const area = await this.prisma.floorPlanArea.create({
      data: {
        floorPlanId,
        code: input.code,
        name: input.name,
        areaType: this.parseAreaType(input.areaType),
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        active: input.active ?? true
      }
    });

    return this.toFloorPlanAreaResponse(area);
  }

  async listFloorPlans(query: ListFloorPlansQueryDto): Promise<FloorPlanResponseDto[]> {
    const take = this.parseLimit(query.limit);
    const active = this.parseOptionalBoolean(query.active, "INVALID_ACTIVE_FILTER");

    const rows = await this.prisma.floorPlan.findMany({
      where: {
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(active !== undefined ? { active } : {})
      },
      include: {
        areas: {
          where: { active: true },
          orderBy: { createdAt: "asc" }
        }
      },
      take,
      orderBy: { createdAt: "desc" }
    });

    return rows.map((row) => this.toFloorPlanResponse(row));
  }

  async getLiveFloorPlan(id: string): Promise<FloorPlanLiveResponseDto> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: {
        areas: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!plan) throw new NotFoundException("FLOOR_PLAN_NOT_FOUND");

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const areaCodes = plan.areas.map((a) => a.code);

    // Active visits: active or checked_in, with their zone permissions and wristband links
    const activeVisits = await this.prisma.visit.findMany({
      where: {
        locationId: plan.locationId,
        status: { in: ["active", "checked_in", "extended"] },
      },
      include: {
        guest: true,
        tier: true,
        accessPermissions: {
          where: {
            zoneCode: { in: areaCodes },
            permissionStatus: "granted",
          },
        },
      },
    });

    // Cleaning tasks: open or in_progress, keyed by room code
    const cleaningTasks = await this.prisma.cleaningTask.findMany({
      where: {
        status: { in: ["open", "in_progress"] },
        room: { code: { in: areaCodes } },
      },
      include: { room: true },
    });
    const cleaningByCode = new Map<string, string>();
    for (const task of cleaningTasks) {
      cleaningByCode.set(task.room.code, task.status);
    }

    // RFID health: any granted access event in last 5 min per zone → online
    const recentEvents = await this.prisma.guestAccessEvent.groupBy({
      by: ["zoneCode"],
      where: {
        zoneCode: { in: areaCodes },
        eventTime: { gte: fiveMinAgo },
        accessResult: "granted",
      },
      _count: true,
    });
    const rfidOnline = new Set(recentEvents.map((e) => e.zoneCode));

    // Build per-area enrichment
    const liveAreas: LiveAreaDto[] = plan.areas.map((area) => {
      const zoneVisits = activeVisits.filter((v) =>
        v.accessPermissions.some((p) => p.zoneCode === area.code)
      );

      return {
        id: area.id,
        code: area.code,
        name: area.name,
        areaType: area.areaType,
        x: area.x.toString(),
        y: area.y.toString(),
        width: area.width.toString(),
        height: area.height.toString(),
        occupancy: zoneVisits.length,
        cleaningStatus: cleaningByCode.get(area.code) ?? null,
        rfidStatus: rfidOnline.has(area.code) ? "online" : "unknown",
        activeVisits: zoneVisits.map((v) => ({
          visitId: v.id,
          guestName: `${v.guest.firstName} ${v.guest.lastName ?? ""}`.trim(),
          tierName: v.tier.name,
          scheduledEndTime: v.scheduledEndTime?.toISOString() ?? null,
          durationMinutes: v.durationMinutes,
        })),
      };
    });

    return {
      id: plan.id,
      name: plan.name,
      locationId: plan.locationId,
      fetchedAt: now.toISOString(),
      areas: liveAreas,
    };
  }

  async getFloorPlan(id: string): Promise<FloorPlanResponseDto> {
    const row = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: {
        areas: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!row) {
      throw new NotFoundException("FLOOR_PLAN_NOT_FOUND");
    }

    return this.toFloorPlanResponse(row);
  }

  async getFacilityMap(id: string): Promise<FacilityMapResponseDto> {
    const row = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: {
        location: true,
        areas: {
          orderBy: { createdAt: "asc" }
        },
        floor: {
          include: {
            facility: true,
            zones: {
              where: { active: true },
              orderBy: { code: "asc" }
            },
            accessNodes: {
              where: { active: true },
              orderBy: { code: "asc" }
            },
            devices: {
              where: { active: true },
              orderBy: { code: "asc" }
            }
          }
        }
      }
    });

    if (!row) {
      throw new NotFoundException("FLOOR_PLAN_NOT_FOUND");
    }

    const roomRows = await this.prisma.room.findMany({
      where: {
        floorPlanAreaId: { in: row.areas.map((area) => area.id) }
      },
      orderBy: { code: "asc" }
    });

    const roomIds = roomRows.map((room) => room.id);
    const now = new Date();
    const bookingRows = roomIds.length
      ? await this.prisma.roomBooking.findMany({
          where: {
            roomId: { in: roomIds },
            status: { in: ["reserved", "checked_in", "waitlisted"] },
            endsAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
          },
          orderBy: [{ roomId: "asc" }, { startsAt: "asc" }]
        })
      : [];

    const memberIds = Array.from(new Set(bookingRows.map((booking) => booking.memberId)));
    const visitSessionRows = memberIds.length
      ? await this.prisma.visitSession.findMany({
          where: {
            memberId: { in: memberIds },
            locationId: row.locationId,
            status: "checked_in",
            checkOutAt: null
          },
          orderBy: { checkInAt: "desc" }
        })
      : [];

    const accessEventRows = roomIds.length
      ? await this.prisma.roomAccessEvent.findMany({
          where: {
            roomId: { in: roomIds },
            occurredAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
          },
          orderBy: { occurredAt: "desc" },
          take: Math.max(roomIds.length * 4, 24)
        })
      : [];

    const roomByAreaId = new Map(roomRows.map((room) => [room.floorPlanAreaId, room]));
    const bookingsByRoomId = new Map<string, typeof bookingRows>();
    for (const booking of bookingRows) {
      const current = bookingsByRoomId.get(booking.roomId) ?? [];
      current.push(booking);
      bookingsByRoomId.set(booking.roomId, current);
    }

    const visitSessionByMemberId = new Map<string, (typeof visitSessionRows)[number]>();
    for (const session of visitSessionRows) {
      if (!visitSessionByMemberId.has(session.memberId)) {
        visitSessionByMemberId.set(session.memberId, session);
      }
    }

    const accessEventsByRoomId = new Map<string, FacilityRoomAccessSummaryResponseDto[]>();
    for (const event of accessEventRows) {
      const current = accessEventsByRoomId.get(event.roomId) ?? [];
      if (current.length < 4) {
        current.push(this.toRoomAccessSummary(event));
        accessEventsByRoomId.set(event.roomId, current);
      }
    }

    const topologyMode = row.floor ? "persisted" : "derived";
    const zones = row.floor
      ? row.floor.zones.map((zone) => {
          const room = zone.roomId ? roomRows.find((candidate) => candidate.id === zone.roomId) : undefined;
          return this.toFacilityZoneResponse({
            id: zone.id,
            code: zone.code,
            name: zone.name,
            type: zone.zoneType,
            polygonJson: zone.polygonJson,
            sourceAreaId: zone.floorPlanAreaId ?? undefined,
            room,
            bookings: room ? bookingsByRoomId.get(room.id) ?? [] : [],
            activeVisitSession: room ? this.findVisitSessionForRoom(room.id, bookingsByRoomId, visitSessionByMemberId, now) : undefined,
            recentAccessEvents: room ? accessEventsByRoomId.get(room.id) ?? [] : []
          }, now);
        })
      : row.areas.map((area) => {
          const room = roomByAreaId.get(area.id);
          return this.toFacilityZoneResponse({
            id: `derived-${area.id}`,
            code: area.code,
            name: area.name,
            type: area.areaType,
            polygonJson: this.rectangleToPolygonJson(area),
            sourceAreaId: area.id,
            room,
            bookings: room ? bookingsByRoomId.get(room.id) ?? [] : [],
            activeVisitSession: room ? this.findVisitSessionForRoom(room.id, bookingsByRoomId, visitSessionByMemberId, now) : undefined,
            recentAccessEvents: room ? accessEventsByRoomId.get(room.id) ?? [] : []
          }, now);
        });

    const accessNodes = row.floor
      ? row.floor.accessNodes.map((node) => this.toAccessNodeResponse(node))
      : zones
          .flatMap((zone) => this.buildDerivedAccessNodes(zone))
          .sort((left, right) => left.code.localeCompare(right.code));

    const devices = row.floor
      ? row.floor.devices.map((device) => this.toDeviceResponse(device))
      : zones
          .flatMap((zone) => this.buildDerivedDevices(zone))
          .sort((left, right) => left.code.localeCompare(right.code));

    return {
      id: row.floor?.id ?? `derived-${row.id}`,
      topologyMode,
      facilityId: row.floor?.facility.id,
      facilityCode: row.floor?.facility.code,
      facilityName: row.floor?.facility.name,
      sourcePlanId: row.id,
      sourcePlanName: row.name,
      locationId: row.locationId,
      levelLabel: this.inferLevelLabel(row.name),
      refreshedAt: now.toISOString(),
      zones,
      accessNodes,
      devices
    };
  }

  private parseAreaType(input: string): FloorPlanAreaType {
    if (
      input === "room" ||
      input === "corridor" ||
      input === "entry" ||
      input === "service" ||
      input === "bath" ||
      input === "lounge" ||
      input === "locker_bank"
    ) {
      return input;
    }

    throw new BadRequestException("INVALID_FLOOR_PLAN_AREA_TYPE");
  }

  private parseLimit(input: string | undefined): number | undefined {
    if (!input) {
      return undefined;
    }

    const parsed = Number.parseInt(input, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException("INVALID_LIMIT");
    }

    return Math.min(parsed, 200);
  }

  private parseOptionalBoolean(
    input: string | undefined,
    errorCode: "INVALID_ACTIVE_FILTER"
  ): boolean | undefined {
    if (!input) {
      return undefined;
    }

    if (input === "true") {
      return true;
    }

    if (input === "false") {
      return false;
    }

    throw new BadRequestException(errorCode);
  }

  private inferLevelLabel(name: string): string {
    const normalized = name.trim().toLowerCase();

    if (normalized.includes("main")) {
      return "Main Floor";
    }

    if (normalized.includes("lower")) {
      return "Lower Level";
    }

    if (normalized.includes("upper")) {
      return "Upper Level";
    }

    return name;
  }

  private rectangleToPolygonJson(area: {
    x: { toString: () => string };
    y: { toString: () => string };
    width: { toString: () => string };
    height: { toString: () => string };
  }): FacilityPointResponseDto[] {
    const left = this.parseCoordinate(area.x.toString());
    const top = this.parseCoordinate(area.y.toString());
    const width = this.parseCoordinate(area.width.toString());
    const height = this.parseCoordinate(area.height.toString());
    const right = Math.min(100, left + width);
    const bottom = Math.min(100, top + height);

    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom }
    ];
  }

  private parseCoordinate(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
  }

  private mapRoomState(status: RoomStatus | undefined): FacilityZoneResponseDto["roomState"] {
    switch (status) {
      case "available":
        return "ready";
      case "booked":
        return "reserved";
      case "occupied":
        return "in_use";
      case "cleaning":
        return "turnover";
      case "out_of_service":
        return "out_of_service";
      default:
        return status ? "unknown" : undefined;
    }
  }

  private toFacilityZoneResponse(
    row: {
      id: string;
      code: string;
      name: string;
      type: FloorPlanAreaType;
      polygonJson: unknown;
      sourceAreaId?: string;
      room?: {
        id: string;
        roomType: "private" | "premium_private" | "retreat" | "ritual" | "accessible" | "couples_reserved_future";
        status: RoomStatus;
      };
      bookings: FacilityMapBookingRow[];
      activeVisitSession?: FacilityMapVisitSessionRow;
      recentAccessEvents: FacilityRoomAccessSummaryResponseDto[];
    },
    now: Date
  ): FacilityZoneResponseDto {
    const currentBooking = this.pickCurrentBooking(row.bookings, now);
    const upcomingBooking = this.pickUpcomingBooking(row.bookings, now);

    return {
      id: row.id,
      sourceAreaId: row.sourceAreaId,
      code: row.code,
      name: row.name,
      type: row.type,
      polygon: this.toPointArray(row.polygonJson),
      roomId: row.room?.id,
      roomType: row.room?.roomType,
      roomState: this.mapRoomState(row.room?.status),
      currentBooking: currentBooking ? this.toBookingSummary(currentBooking) : undefined,
      upcomingBooking: upcomingBooking ? this.toBookingSummary(upcomingBooking) : undefined,
      activeVisitSession: row.activeVisitSession ? this.toVisitSessionSummary(row.activeVisitSession) : undefined,
      recentAccessEvents: row.recentAccessEvents
    };
  }

  private toPointArray(value: unknown): FacilityPointResponseDto[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((point) => {
        if (!point || typeof point !== "object") {
          return null;
        }

        const x = typeof (point as { x?: unknown }).x === "number" ? (point as { x: number }).x : 0;
        const y = typeof (point as { y?: unknown }).y === "number" ? (point as { y: number }).y : 0;
        return { x, y };
      })
      .filter((point): point is FacilityPointResponseDto => point !== null);
  }

  private pickCurrentBooking(
    rows: FacilityMapBookingRow[],
    now: Date
  ): FacilityMapBookingRow | undefined {
    return rows.find((booking) => booking.startsAt <= now && booking.endsAt >= now);
  }

  private pickUpcomingBooking(
    rows: FacilityMapBookingRow[],
    now: Date
  ): FacilityMapBookingRow | undefined {
    return rows.find((booking) => booking.startsAt > now);
  }

  private toBookingSummary(row: FacilityMapBookingRow): FacilityBookingSummaryResponseDto {
    return {
      id: row.id,
      memberId: row.memberId,
      status: row.status,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      checkedInAt: row.checkedInAt?.toISOString(),
      checkedOutAt: row.checkedOutAt?.toISOString()
    };
  }

  private toVisitSessionSummary(row: FacilityMapVisitSessionRow): FacilityVisitSessionSummaryResponseDto {
    return {
      id: row.id,
      memberId: row.memberId,
      status: row.status,
      checkInAt: row.checkInAt.toISOString(),
      checkOutAt: row.checkOutAt?.toISOString()
    };
  }

  private toRoomAccessSummary(row: {
    id: string;
    bookingId: string | null;
    memberId: string | null;
    decision: "allowed" | "denied" | "error";
    denialReasonCode: string | null;
    eventType: "unlock" | "lock" | "open" | "close" | "check_in_gate" | "check_out_gate";
    occurredAt: Date;
    sourceType: "wristband_reader" | "staff_console" | "system";
  }): FacilityRoomAccessSummaryResponseDto {
    return {
      id: row.id,
      bookingId: row.bookingId ?? undefined,
      memberId: row.memberId ?? undefined,
      decision: row.decision,
      denialReasonCode: row.denialReasonCode ?? undefined,
      eventType: row.eventType,
      occurredAt: row.occurredAt.toISOString(),
      sourceType: row.sourceType
    };
  }

  private findVisitSessionForRoom(
    roomId: string,
    bookingsByRoomId: Map<string, FacilityMapBookingRow[]>,
    visitSessionByMemberId: Map<string, FacilityMapVisitSessionRow>,
    now: Date
  ): FacilityMapVisitSessionRow | undefined {
    const currentBooking = this.pickCurrentBooking(bookingsByRoomId.get(roomId) ?? [], now);
    if (!currentBooking) {
      return undefined;
    }

    return visitSessionByMemberId.get(currentBooking.memberId);
  }

  private toAccessNodeResponse(row: {
    id: string;
    code: string;
    name: string;
    nodeType: "entry" | "reader" | "camera" | "service_point";
    x: { toString: () => string };
    y: { toString: () => string };
    zoneId: string | null;
    status: DeviceStatus;
    metadataJson: unknown;
  }): FacilityAccessNodeResponseDto {
    return {
      id: row.id,
      code: row.code,
      label: row.name,
      type: row.nodeType,
      x: this.parseCoordinate(row.x.toString()),
      y: this.parseCoordinate(row.y.toString()),
      zoneId: row.zoneId ?? undefined,
      status: row.status,
      detail: this.extractDetail(row.metadataJson)
    };
  }

  private toDeviceResponse(row: {
    id: string;
    code: string;
    name: string;
    deviceType: "door_controller" | "reader" | "camera" | "environmental";
    x: { toString: () => string };
    y: { toString: () => string };
    zoneId: string | null;
    status: DeviceStatus;
    metadataJson: unknown;
  }): FacilityDeviceResponseDto {
    return {
      id: row.id,
      code: row.code,
      label: row.name,
      type: row.deviceType,
      x: this.parseCoordinate(row.x.toString()),
      y: this.parseCoordinate(row.y.toString()),
      zoneId: row.zoneId ?? undefined,
      status: row.status,
      detail: this.extractDetail(row.metadataJson)
    };
  }

  private extractDetail(metadataJson: unknown): string | undefined {
    if (!metadataJson || typeof metadataJson !== "object") {
      return undefined;
    }

    const candidate = (metadataJson as { detail?: unknown }).detail;
    return typeof candidate === "string" ? candidate : undefined;
  }

  private buildDerivedAccessNodes(zone: FacilityZoneResponseDto): FacilityAccessNodeResponseDto[] {
    const center = this.centerPoint(zone.polygon);

    if (zone.type === "entry") {
      return [{
        id: `${zone.id}-entry`,
        code: `${zone.code}-ENTRY`,
        label: `${zone.code} ingress`,
        type: "entry",
        x: center.x,
        y: center.y,
        zoneId: zone.id,
        status: "online",
        detail: "Derived entry waypoint."
      }];
    }

    if (zone.type === "service") {
      return [{
        id: `${zone.id}-ops`,
        code: `${zone.code}-OPS`,
        label: `${zone.code} ops point`,
        type: "service_point",
        x: center.x,
        y: center.y,
        zoneId: zone.id,
        status: "online",
        detail: "Derived service checkpoint."
      }];
    }

    if (zone.type === "room") {
      return [{
        id: `${zone.id}-reader`,
        code: `${zone.code}-READER`,
        label: `${zone.code} reader`,
        type: "reader",
        x: Math.max(2, center.x - 3.5),
        y: center.y,
        zoneId: zone.id,
        status: zone.roomState === "out_of_service" ? "offline" : zone.roomState === "turnover" ? "degraded" : "online",
        detail: "Derived room reader."
      }];
    }

    return [];
  }

  private buildDerivedDevices(zone: FacilityZoneResponseDto): FacilityDeviceResponseDto[] {
    const center = this.centerPoint(zone.polygon);

    if (zone.type === "room") {
      return [{
        id: `${zone.id}-controller`,
        code: `${zone.code}-CTRL`,
        label: `${zone.code} controller`,
        type: "door_controller",
        x: Math.min(98, center.x + 3.5),
        y: center.y,
        zoneId: zone.id,
        status: zone.roomState === "out_of_service" ? "offline" : zone.roomState === "turnover" ? "degraded" : "online",
        detail: "Derived room controller."
      }];
    }

    if (zone.type === "corridor" || zone.type === "entry") {
      return [{
        id: `${zone.id}-camera`,
        code: `${zone.code}-CAM`,
        label: `${zone.code} camera`,
        type: "camera",
        x: center.x,
        y: Math.max(2, center.y - 4),
        zoneId: zone.id,
        status: "online",
        detail: "Derived corridor visibility."
      }];
    }

    return [];
  }

  private centerPoint(points: FacilityPointResponseDto[]): FacilityPointResponseDto {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    const total = points.reduce(
      (accumulator, point) => ({
        x: accumulator.x + point.x,
        y: accumulator.y + point.y
      }),
      { x: 0, y: 0 }
    );

    return {
      x: total.x / points.length,
      y: total.y / points.length
    };
  }

  private toFloorPlanResponse(row: {
    id: string;
    locationId: string;
    name: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    areas: {
      id: string;
      floorPlanId: string;
      code: string;
      name: string;
      areaType: FloorPlanAreaType;
      x: { toString: () => string };
      y: { toString: () => string };
      width: { toString: () => string };
      height: { toString: () => string };
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }): FloorPlanResponseDto {
    return {
      id: row.id,
      locationId: row.locationId,
      name: row.name,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      areas: row.areas.map((area) => this.toFloorPlanAreaResponse(area))
    };
  }

  private toFloorPlanAreaResponse(row: {
    id: string;
    floorPlanId: string;
    code: string;
    name: string;
    areaType: FloorPlanAreaType;
    x: { toString: () => string };
    y: { toString: () => string };
    width: { toString: () => string };
    height: { toString: () => string };
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): FloorPlanAreaResponseDto {
    return {
      id: row.id,
      floorPlanId: row.floorPlanId,
      code: row.code,
      name: row.name,
      areaType: row.areaType,
      x: row.x.toString(),
      y: row.y.toString(),
      width: row.width.toString(),
      height: row.height.toString(),
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
