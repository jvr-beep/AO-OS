import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { resolveDisplayName } from "../../members/utils/member-display";
import { PrismaService } from "../../prisma/prisma.service";
import { LocationContextService } from "../../location/location-context.service";
import { CreateMapFloorDto } from "../dto/create-map-floor.dto";
import { CreateMapFloorVersionDto } from "../dto/create-map-floor-version.dto";
import { CreateMapObjectDto } from "../dto/create-map-object.dto";
import { MapFloorResponseDto, MapFloorVersionSummaryDto } from "../dto/map-floor.response.dto";
import { MapFloorVersionResponseDto } from "../dto/map-floor-version.response.dto";
import { MapObjectResponseDto } from "../dto/map-object.response.dto";
import { MapStudioLiveResponseDto, LiveObjectStateDto } from "../dto/map-studio-live.response.dto";
import { MapVersionApprovalResponseDto } from "../dto/map-version-approval.response.dto";
import { MapAiAnalysisResponseDto, MapAiSuggestionDto } from "../dto/map-ai-analysis.response.dto";

@Injectable()
export class MapStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationContext: LocationContextService,
  ) {}

  private get locationId(): string {
    const loc = this.locationContext.locationOrNull;
    if (!loc) throw new NotFoundException("Location required");
    return loc.id;
  }

  async listFloors(): Promise<MapFloorResponseDto[]> {
    const floors = await this.prisma.mapFloor.findMany({
      where: { locationId: this.locationId, status: { not: "archived" } },
      orderBy: [{ sortOrder: "asc" }, { level: "asc" }],
      include: {
        versions: {
          where: { isDraft: false },
          orderBy: { versionNum: "desc" },
          take: 1,
        },
        _count: { select: { versions: true } },
      },
    });

    return floors.map((f) => this.toFloorDto(f));
  }

  async createFloor(dto: CreateMapFloorDto): Promise<MapFloorResponseDto> {
    const floor = await this.prisma.mapFloor.create({
      data: {
        locationId: this.locationId,
        name: dto.name,
        level: dto.level ?? 0,
        description: dto.description ?? null,
        status: dto.status ?? "active",
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toFloorDto(floor);
  }

  async getFloor(floorId: string): Promise<MapFloorResponseDto> {
    const floor = await this.prisma.mapFloor.findFirst({
      where: { id: floorId, locationId: this.locationId },
      include: {
        versions: {
          where: { isDraft: false },
          orderBy: { versionNum: "desc" },
          take: 1,
        },
        _count: { select: { versions: true } },
      },
    });
    if (!floor) throw new NotFoundException("Floor not found");
    return this.toFloorDto(floor);
  }

  async listVersions(floorId: string): Promise<MapFloorVersionResponseDto[]> {
    await this.assertFloorOwnership(floorId);
    const versions = await this.prisma.mapFloorVersion.findMany({
      where: { floorId },
      orderBy: { versionNum: "desc" },
    });
    return versions.map((v) => this.toVersionDto(v));
  }

  async createVersion(
    floorId: string,
    dto: CreateMapFloorVersionDto,
    staffId: string,
  ): Promise<MapFloorVersionResponseDto> {
    await this.assertFloorOwnership(floorId);

    const last = await this.prisma.mapFloorVersion.findFirst({
      where: { floorId },
      orderBy: { versionNum: "desc" },
      select: { versionNum: true },
    });
    const nextNum = (last?.versionNum ?? 0) + 1;

    const now = new Date();
    const version = await this.prisma.mapFloorVersion.create({
      data: {
        floorId,
        versionNum: nextNum,
        svgContent: dto.svgContent,
        label: dto.label ?? null,
        notes: dto.notes ?? null,
        isDraft: dto.publish !== true,
        publishedAt: dto.publish ? now : null,
        publishedBy: dto.publish ? staffId : null,
        createdBy: staffId,
      },
    });
    return this.toVersionDto(version);
  }

  async publishVersion(floorId: string, versionId: string, staffId: string): Promise<MapFloorVersionResponseDto> {
    await this.assertFloorOwnership(floorId);
    const version = await this.prisma.mapFloorVersion.findFirst({
      where: { id: versionId, floorId },
    });
    if (!version) throw new NotFoundException("Version not found");
    if (!version.isDraft) throw new ConflictException("Version already published");

    const updated = await this.prisma.mapFloorVersion.update({
      where: { id: versionId },
      data: { isDraft: false, publishedAt: new Date(), publishedBy: staffId },
    });
    return this.toVersionDto(updated);
  }

  async getVersion(floorId: string, versionId: string): Promise<MapFloorVersionResponseDto> {
    await this.assertFloorOwnership(floorId);
    const version = await this.prisma.mapFloorVersion.findFirst({
      where: { id: versionId, floorId },
    });
    if (!version) throw new NotFoundException("Version not found");
    return this.toVersionDto(version);
  }

  async rollbackVersion(floorId: string, versionId: string, staffId: string): Promise<MapFloorVersionResponseDto> {
    await this.assertFloorOwnership(floorId);
    const source = await this.prisma.mapFloorVersion.findFirst({
      where: { id: versionId, floorId },
    });
    if (!source) throw new NotFoundException("Source version not found");

    const last = await this.prisma.mapFloorVersion.findFirst({
      where: { floorId },
      orderBy: { versionNum: "desc" },
      select: { versionNum: true },
    });

    const newVersion = await this.prisma.mapFloorVersion.create({
      data: {
        floorId,
        versionNum: (last?.versionNum ?? 0) + 1,
        svgContent: source.svgContent,
        label: `Rollback to v${source.versionNum}`,
        notes: `Restored from version ${source.versionNum}${source.label ? ` (${source.label})` : ""}`,
        isDraft: true,
        createdBy: staffId,
      },
    });
    return this.toVersionDto(newVersion);
  }

  async listObjects(floorId: string): Promise<MapObjectResponseDto[]> {
    await this.assertFloorOwnership(floorId);
    const objects = await this.prisma.mapObject.findMany({
      where: { floorId },
      orderBy: { code: "asc" },
    });
    return objects.map((o) => this.toObjectDto(o));
  }

  async upsertObject(floorId: string, dto: CreateMapObjectDto): Promise<MapObjectResponseDto> {
    await this.assertFloorOwnership(floorId);
    const obj = await this.prisma.mapObject.upsert({
      where: { floorId_code: { floorId, code: dto.code } },
      create: {
        floorId,
        svgElementId: dto.svgElementId ?? null,
        objectType: dto.objectType,
        code: dto.code,
        label: dto.label,
        roomId: dto.roomId ?? null,
        accessPointId: dto.accessPointId ?? null,
        lockerId: dto.lockerId ?? null,
        accessZoneId: dto.accessZoneId ?? null,
        posX: dto.posX ?? null,
        posY: dto.posY ?? null,
        active: dto.active ?? true,
      },
      update: {
        svgElementId: dto.svgElementId ?? null,
        objectType: dto.objectType,
        label: dto.label,
        roomId: dto.roomId ?? null,
        accessPointId: dto.accessPointId ?? null,
        lockerId: dto.lockerId ?? null,
        accessZoneId: dto.accessZoneId ?? null,
        posX: dto.posX ?? null,
        posY: dto.posY ?? null,
        active: dto.active ?? true,
      },
    });
    return this.toObjectDto(obj);
  }

  async deleteObject(floorId: string, objectId: string): Promise<void> {
    await this.assertFloorOwnership(floorId);
    const obj = await this.prisma.mapObject.findFirst({ where: { id: objectId, floorId } });
    if (!obj) throw new NotFoundException("Map object not found");
    await this.prisma.mapObject.delete({ where: { id: objectId } });
  }

  async getLiveState(floorId: string): Promise<MapStudioLiveResponseDto> {
    await this.assertFloorOwnership(floorId);

    const publishedVersion = await this.prisma.mapFloorVersion.findFirst({
      where: { floorId, isDraft: false },
      orderBy: { versionNum: "desc" },
    });
    if (!publishedVersion) throw new NotFoundException("No published version for this floor");

    const objects = await this.prisma.mapObject.findMany({
      where: { floorId, active: true },
      orderBy: { code: "asc" },
    });

    const liveObjects: LiveObjectStateDto[] = await Promise.all(
      objects.map((obj) => this.resolveObjectLiveState(obj))
    );

    return {
      floorId,
      versionId: publishedVersion.id,
      svgContent: publishedVersion.svgContent,
      objects: liveObjects,
      generatedAt: new Date(),
    };
  }

  private async resolveObjectLiveState(obj: {
    id: string;
    svgElementId: string | null;
    objectType: string;
    code: string;
    label: string;
    roomId: string | null;
    lockerId: string | null;
    metadataJson: unknown;
  }): Promise<LiveObjectStateDto> {
    const base: LiveObjectStateDto = {
      mapObjectId: obj.id,
      svgElementId: obj.svgElementId,
      objectType: obj.objectType,
      code: obj.code,
      label: obj.label,
      state: "unknown",
      occupantName: null,
      endsAt: null,
      timeRemainingSeconds: null,
      cleaningStatus: null,
      incidentNote: null,
      metadata: (obj.metadataJson as Record<string, unknown>) ?? {},
    };

    if (obj.objectType === "room" && obj.roomId) {
      return this.resolveRoomState(base, obj.roomId);
    }

    if (obj.objectType === "locker_bank" && obj.lockerId) {
      return this.resolveLockerState(base, obj.lockerId);
    }

    if (obj.objectType === "incident") {
      const note = typeof base.metadata.note === "string" ? base.metadata.note : null;
      return { ...base, state: "incident", incidentNote: note };
    }

    return { ...base, state: "unknown" };
  }

  private async resolveRoomState(
    base: LiveObjectStateDto,
    roomId: string,
  ): Promise<LiveObjectStateDto> {
    const now = new Date();

    const [activeBooking, cleaningTask, reservedBooking] = await Promise.all([
      this.prisma.roomBooking.findFirst({
        where: { roomId, status: "checked_in" },
        include: {
          member: {
            select: {
              publicMemberNumber: true,
              alias: true,
              displayName: true,
              profile: { select: { preferredName: true } },
            },
          },
        },
        orderBy: { checkedInAt: "desc" },
      }),
      this.prisma.cleaningTask.findFirst({
        where: { roomId, status: { in: ["open", "in_progress"] } },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      }),
      this.prisma.roomBooking.findFirst({
        where: { roomId, status: "reserved", startsAt: { lte: new Date(now.getTime() + 30 * 60_000) } },
        orderBy: { startsAt: "asc" },
      }),
    ]);

    if (cleaningTask) {
      return {
        ...base,
        state: "cleaning",
        cleaningStatus: cleaningTask.status,
      };
    }

    if (activeBooking) {
      const endsAt = activeBooking.endsAt;
      const secsRemaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
      return {
        ...base,
        state: "occupied",
        occupantName: resolveDisplayName(activeBooking.member),
        endsAt: endsAt.toISOString(),
        timeRemainingSeconds: secsRemaining,
        cleaningStatus: null,
      };
    }

    if (reservedBooking) {
      return { ...base, state: "reserved" };
    }

    return { ...base, state: "available" };
  }

  private async resolveLockerState(
    base: LiveObjectStateDto,
    lockerId: string,
  ): Promise<LiveObjectStateDto> {
    const locker = await this.prisma.locker.findUnique({
      where: { id: lockerId },
      select: { status: true },
    });
    if (!locker) return { ...base, state: "unknown" };

    const stateMap: Record<string, LiveObjectStateDto["state"]> = {
      available: "available",
      reserved: "reserved",
      occupied: "occupied",
      assigned: "occupied",
      cleaning: "cleaning",
      maintenance: "offline",
      offline: "offline",
      forced_open: "incident",
      out_of_service: "offline",
    };

    return { ...base, state: stateMap[locker.status] ?? "unknown" };
  }

  // ── Phase 4: Approval workflow ────────────────────────────────────────────

  async requestApproval(
    floorId: string,
    versionId: string,
    staffId: string,
    note?: string,
  ): Promise<MapVersionApprovalResponseDto> {
    await this.assertFloorOwnership(floorId);
    const version = await this.prisma.mapFloorVersion.findFirst({
      where: { id: versionId, floorId },
      include: { floor: { select: { name: true } } },
    });
    if (!version) throw new NotFoundException("Version not found");
    if (!version.isDraft) throw new ConflictException("Version is already published");

    const existing = await this.prisma.mapVersionApproval.findFirst({
      where: { versionId, status: "pending" },
    });
    if (existing) throw new ConflictException("Approval already pending for this version");

    const approval = await this.prisma.mapVersionApproval.create({
      data: { versionId, requestedBy: staffId, reviewNote: note ?? null },
    });

    // Notify n8n approval workflow (non-blocking)
    this.fireN8nApprovalWebhook({
      floorId,
      versionId,
      versionNum: version.versionNum,
      floorName: (version as any).floor?.name ?? floorId,
      label: version.label,
      requestedBy: staffId,
      note: note ?? null,
      approvalId: approval.id,
    }).catch(() => {});

    return this.toApprovalDto(approval);
  }

  async approveVersion(
    floorId: string,
    versionId: string,
    staffId: string,
    reviewNote?: string,
  ): Promise<MapVersionApprovalResponseDto> {
    await this.assertFloorOwnership(floorId);
    const approval = await this.prisma.mapVersionApproval.findFirst({
      where: { versionId, status: "pending" },
    });
    if (!approval) throw new NotFoundException("No pending approval for this version");

    const [updated] = await this.prisma.$transaction([
      this.prisma.mapVersionApproval.update({
        where: { id: approval.id },
        data: { status: "approved", reviewedBy: staffId, reviewNote: reviewNote ?? null, resolvedAt: new Date() },
      }),
      this.prisma.mapFloorVersion.update({
        where: { id: versionId },
        data: { isDraft: false, publishedAt: new Date(), publishedBy: staffId },
      }),
    ]);

    return this.toApprovalDto(updated);
  }

  async rejectVersion(
    floorId: string,
    versionId: string,
    staffId: string,
    reviewNote?: string,
  ): Promise<MapVersionApprovalResponseDto> {
    await this.assertFloorOwnership(floorId);
    const approval = await this.prisma.mapVersionApproval.findFirst({
      where: { versionId, status: "pending" },
    });
    if (!approval) throw new NotFoundException("No pending approval for this version");

    const updated = await this.prisma.mapVersionApproval.update({
      where: { id: approval.id },
      data: { status: "rejected", reviewedBy: staffId, reviewNote: reviewNote ?? null, resolvedAt: new Date() },
    });

    return this.toApprovalDto(updated);
  }

  async getVersionApproval(floorId: string, versionId: string): Promise<MapVersionApprovalResponseDto | null> {
    await this.assertFloorOwnership(floorId);
    const approval = await this.prisma.mapVersionApproval.findFirst({
      where: { versionId },
      orderBy: { requestedAt: "desc" },
    });
    return approval ? this.toApprovalDto(approval) : null;
  }

  // ── Phase 4: AI floor analysis ────────────────────────────────────────────

  async analyzeFloor(floorId: string): Promise<MapAiAnalysisResponseDto> {
    await this.assertFloorOwnership(floorId);

    const floor = await this.prisma.mapFloor.findFirst({
      where: { id: floorId, locationId: this.locationId },
      select: { name: true },
    });
    if (!floor) throw new NotFoundException("Floor not found");

    const objects = await this.prisma.mapObject.findMany({
      where: { floorId, active: true },
      orderBy: { code: "asc" },
    });

    const webhookUrl = process.env.N8N_MAP_STUDIO_AI_WEBHOOK;

    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            floorId,
            floorName: floor.name,
            objects: objects.map((o) => ({
              code: o.code,
              label: o.label,
              objectType: o.objectType,
              svgElementId: o.svgElementId,
              roomId: o.roomId,
              accessPointId: o.accessPointId,
              lockerId: o.lockerId,
              accessZoneId: o.accessZoneId,
            })),
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (res.ok) {
          const data = await res.json() as { suggestions?: MapAiSuggestionDto[]; summary?: string };
          return {
            floorId,
            floorName: floor.name,
            objectCount: objects.length,
            analysedAt: new Date(),
            suggestions: data.suggestions ?? [],
            summary: data.summary ?? "Analysis complete.",
          };
        }
      } catch {
        // fall through to local analysis
      }
    }

    // Local fallback analysis when n8n is unavailable
    const suggestions: MapAiSuggestionDto[] = [];

    const rooms = objects.filter((o) => o.objectType === "room");
    const doors = objects.filter((o) => o.objectType === "door");
    const readers = objects.filter((o) => o.objectType === "access_reader");

    for (const r of rooms) {
      if (!r.roomId) {
        suggestions.push({
          type: "missing_binding",
          severity: "warning",
          objectCode: r.code,
          message: `Room "${r.label}" has no Room ID binding.`,
          suggestion: "Bind this map object to a Room record in the database.",
        });
      }
      if (!r.svgElementId) {
        suggestions.push({
          type: "missing_binding",
          severity: "info",
          objectCode: r.code,
          message: `Room "${r.label}" has no SVG element ID.`,
          suggestion: "Set svgElementId to enable live overlay highlighting.",
        });
      }
    }

    for (const d of doors) {
      if (!d.accessPointId) {
        suggestions.push({
          type: "missing_binding",
          severity: "warning",
          objectCode: d.code,
          message: `Door "${d.label}" has no Access Point binding.`,
          suggestion: "Bind to an AccessPoint to enable zone-based access control.",
        });
      }
    }

    if (readers.length === 0 && doors.length > 0) {
      suggestions.push({
        type: "anomaly",
        severity: "info",
        objectCode: null,
        message: `${doors.length} door(s) defined but no access readers placed.`,
        suggestion: "Add access_reader objects for doors that have physical readers installed.",
      });
    }

    const codes = objects.map((o) => o.code);
    const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
    for (const dup of [...new Set(duplicates)]) {
      suggestions.push({
        type: "naming",
        severity: "critical",
        objectCode: dup,
        message: `Duplicate object code "${dup}" detected.`,
        suggestion: "Each map object must have a unique code within the floor.",
      });
    }

    const summary =
      suggestions.length === 0
        ? `Floor looks good — ${objects.length} objects, no issues detected.`
        : `Found ${suggestions.length} suggestion(s) across ${objects.length} objects.`;

    return { floorId, floorName: floor.name, objectCount: objects.length, analysedAt: new Date(), suggestions, summary };
  }

  private async fireN8nApprovalWebhook(payload: Record<string, unknown>): Promise<void> {
    const webhookUrl = process.env.N8N_MAP_STUDIO_APPROVAL_WEBHOOK;
    if (!webhookUrl) return;
    const appBase = process.env.AO_APP_BASE_URL ?? "https://app.aosanctuary.com";
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        reviewUrl: `${appBase}/map-studio/${payload.floorId}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  }

  private toApprovalDto(a: any): MapVersionApprovalResponseDto {
    return {
      id: a.id,
      versionId: a.versionId,
      requestedBy: a.requestedBy,
      status: a.status,
      reviewedBy: a.reviewedBy ?? null,
      reviewNote: a.reviewNote ?? null,
      n8nRunId: a.n8nRunId ?? null,
      requestedAt: a.requestedAt,
      resolvedAt: a.resolvedAt ?? null,
    };
  }

  private async assertFloorOwnership(floorId: string): Promise<void> {
    const floor = await this.prisma.mapFloor.findFirst({
      where: { id: floorId, locationId: this.locationId },
      select: { id: true },
    });
    if (!floor) throw new NotFoundException("Floor not found");
  }

  private toFloorDto(floor: any): MapFloorResponseDto {
    const publishedVersionRaw = floor.versions?.[0] ?? null;
    return {
      id: floor.id,
      locationId: floor.locationId,
      name: floor.name,
      level: floor.level,
      description: floor.description,
      status: floor.status,
      sortOrder: floor.sortOrder,
      createdAt: floor.createdAt,
      updatedAt: floor.updatedAt,
      versionCount: floor._count?.versions,
      publishedVersion: publishedVersionRaw
        ? ({
            id: publishedVersionRaw.id,
            versionNum: publishedVersionRaw.versionNum,
            label: publishedVersionRaw.label,
            isDraft: publishedVersionRaw.isDraft,
            publishedAt: publishedVersionRaw.publishedAt,
            createdAt: publishedVersionRaw.createdAt,
          } as MapFloorVersionSummaryDto)
        : null,
    };
  }

  private toVersionDto(v: any): MapFloorVersionResponseDto {
    return {
      id: v.id,
      floorId: v.floorId,
      versionNum: v.versionNum,
      label: v.label,
      svgContent: v.svgContent,
      isDraft: v.isDraft,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
      createdBy: v.createdBy,
      notes: v.notes,
      createdAt: v.createdAt,
    };
  }

  private toObjectDto(o: any): MapObjectResponseDto {
    return {
      id: o.id,
      floorId: o.floorId,
      svgElementId: o.svgElementId,
      objectType: o.objectType,
      code: o.code,
      label: o.label,
      roomId: o.roomId,
      accessPointId: o.accessPointId,
      lockerId: o.lockerId,
      accessZoneId: o.accessZoneId,
      posX: o.posX !== null && o.posX !== undefined ? Number(o.posX) : null,
      posY: o.posY !== null && o.posY !== undefined ? Number(o.posY) : null,
      metadataJson: (o.metadataJson as Record<string, unknown>) ?? {},
      active: o.active,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }

  // ── Editor data ───────────────────────────────────────────────────────────

  async getEditorData(floorId: string): Promise<{ rooms: unknown[]; accessZones: unknown[] }> {
    await this.assertFloorOwnership(floorId);
    const floor = await this.prisma.mapFloor.findFirstOrThrow({
      where: { id: floorId },
      select: { locationId: true },
    });
    const [rooms, accessZones] = await Promise.all([
      this.prisma.room.findMany({
        where: { locationId: floor.locationId, active: true },
        select: { id: true, code: true, name: true, roomType: true, status: true },
        orderBy: { code: "asc" },
      }),
      this.prisma.accessZone.findMany({
        where: { locationId: floor.locationId },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ]);
    return { rooms, accessZones };
  }
}
