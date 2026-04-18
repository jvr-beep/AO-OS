import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FloorPlanAreaType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateFloorPlanAreaDto } from "../dto/create-floor-plan-area.dto";
import { CreateFloorPlanDto } from "../dto/create-floor-plan.dto";
import { FloorPlanAreaResponseDto } from "../dto/floor-plan-area.response.dto";
import { FloorPlanResponseDto } from "../dto/floor-plan.response.dto";
import { FloorPlanLiveResponseDto, LiveAreaDto } from "../dto/floor-plan-live.response.dto";
import { ListFloorPlansQueryDto } from "../dto/list-floor-plans.query.dto";

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
