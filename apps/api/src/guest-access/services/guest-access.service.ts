import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GrantAccessPermissionDto } from "../dto/grant-access-permission.dto";
import { LogGuestAccessEventDto } from "../dto/log-guest-access-event.dto";

@Injectable()
export class GuestAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async grantPermission(dto: GrantAccessPermissionDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const wristband = await this.prisma.wristband.findUnique({ where: { id: dto.wristband_id } });
    if (!wristband) {
      throw new NotFoundException("Wristband not found");
    }

    const validFrom = new Date(dto.valid_from);
    const validUntil = new Date(dto.valid_until);
    if (validUntil <= validFrom) {
      throw new BadRequestException("valid_until must be after valid_from");
    }

    const existingActive = await this.prisma.accessPermission.findFirst({
      where: {
        wristbandId: dto.wristband_id,
        zoneCode: dto.zone_code,
        permissionStatus: "granted",
        validUntil: { gte: new Date() }
      }
    });

    if (existingActive) {
      throw new ConflictException("Active permission already exists for wristband and zone");
    }

    const permission = await this.prisma.accessPermission.create({
      data: {
        wristbandId: dto.wristband_id,
        visitId: dto.visit_id,
        zoneCode: dto.zone_code,
        permissionStatus: "granted",
        validFrom,
        validUntil
      }
    });

    return this.toPermissionResponse(permission);
  }

  async revokePermission(permissionId: string) {
    const permission = await this.prisma.accessPermission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw new NotFoundException("Permission not found");
    }

    if (permission.permissionStatus === "revoked") {
      return this.toPermissionResponse(permission);
    }

    const updated = await this.prisma.accessPermission.update({
      where: { id: permissionId },
      data: {
        permissionStatus: "revoked",
        revokedAt: new Date()
      }
    });

    return this.toPermissionResponse(updated);
  }

  async listVisitPermissions(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const permissions = await this.prisma.accessPermission.findMany({
      where: { visitId },
      orderBy: { createdAt: "desc" }
    });

    return permissions.map((permission) => this.toPermissionResponse(permission));
  }

  async logAccessEvent(dto: LogGuestAccessEventDto) {
    const eventTime = new Date(dto.event_time);

    if (dto.visit_id) {
      const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
      if (!visit) {
        throw new NotFoundException("Visit not found");
      }
    }

    if (dto.wristband_id) {
      const wristband = await this.prisma.wristband.findUnique({ where: { id: dto.wristband_id } });
      if (!wristband) {
        throw new NotFoundException("Wristband not found");
      }
    }

    const event = await this.prisma.guestAccessEvent.create({
      data: {
        wristbandId: dto.wristband_id ?? null,
        visitId: dto.visit_id ?? null,
        readerId: dto.reader_id,
        zoneCode: dto.zone_code,
        accessResult: dto.access_result,
        denialReason: dto.denial_reason ?? null,
        eventTime
      }
    });

    if (dto.access_result === "denied") {
      await this.prisma.systemException.create({
        data: {
          exceptionType: "guest_access_denied",
          severity: "warning",
          visitId: dto.visit_id ?? null,
          wristbandId: dto.wristband_id ?? null,
          status: "open",
          payload: {
            reader_id: dto.reader_id,
            zone_code: dto.zone_code,
            denial_reason: dto.denial_reason ?? null,
            event_time: eventTime.toISOString()
          }
        }
      });
    }

    return {
      id: event.id,
      wristband_id: event.wristbandId ?? null,
      visit_id: event.visitId ?? null,
      reader_id: event.readerId,
      zone_code: event.zoneCode,
      access_result: event.accessResult,
      denial_reason: event.denialReason ?? null,
      event_time: event.eventTime.toISOString()
    };
  }

  async listVisitAccessEvents(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const events = await this.prisma.guestAccessEvent.findMany({
      where: { visitId },
      orderBy: { eventTime: "desc" }
    });

    return events.map((event) => ({
      id: event.id,
      wristband_id: event.wristbandId ?? null,
      visit_id: event.visitId ?? null,
      reader_id: event.readerId,
      zone_code: event.zoneCode,
      access_result: event.accessResult,
      denial_reason: event.denialReason ?? null,
      event_time: event.eventTime.toISOString()
    }));
  }

  private toPermissionResponse(permission: {
    id: string;
    wristbandId: string;
    visitId: string;
    zoneCode: string;
    permissionStatus: string;
    validFrom: Date;
    validUntil: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: permission.id,
      wristband_id: permission.wristbandId,
      visit_id: permission.visitId,
      zone_code: permission.zoneCode,
      permission_status: permission.permissionStatus,
      valid_from: permission.validFrom.toISOString(),
      valid_until: permission.validUntil.toISOString(),
      revoked_at: permission.revokedAt ? permission.revokedAt.toISOString() : null,
      created_at: permission.createdAt.toISOString()
    };
  }
}
