import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { WristbandStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivateCredentialDto } from "../dto/activate-credential.dto";
import { AssignWristbandDto } from "../dto/assign-wristband.dto";
import { CreateWristbandDto } from "../dto/create-wristband.dto";
import { IssueCredentialDto } from "../dto/issue-credential.dto";
import { ReplaceCredentialDto } from "../dto/replace-credential.dto";
import { SuspendCredentialDto } from "../dto/suspend-credential.dto";
import { UnassignWristbandDto } from "../dto/unassign-wristband.dto";
import { WristbandAssignmentResponseDto } from "../dto/wristband-assignment.response.dto";
import { WristbandResponseDto } from "../dto/wristband.response.dto";

@Injectable()
export class WristbandsService {
  constructor(private readonly prisma: PrismaService) {}

  async issueCredential(input: IssueCredentialDto): Promise<WristbandResponseDto> {
    const created = await this.prisma.wristband.create({
      data: {
        uid: input.uid,
        locationId: input.siteId ?? null,
        homeLocationId: input.siteId ?? null,
        globalAccessFlag: input.globalAccessFlag ?? false,
        status: input.memberId ? "pending_activation" : "unassigned"
      }
    });

    if (input.memberId) {
      const member = await this.prisma.member.findUnique({ where: { id: input.memberId } });
      if (!member) {
        throw new NotFoundException("MEMBER_NOT_FOUND");
      }

      await this.prisma.wristbandAssignment.create({
        data: {
          wristbandId: created.id,
          memberId: input.memberId,
          assignedByStaffUserId: input.assignedByStaffUserId ?? null,
          active: true
        }
      });
    }

    return this.toWristbandResponse(created);
  }

  async activateCredential(input: ActivateCredentialDto): Promise<WristbandResponseDto> {
    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.credentialId } });
    if (!wristband) {
      throw new NotFoundException("WRISTBAND_NOT_FOUND");
    }

    if (!["pending_activation", "assigned", "active"].includes(wristband.status)) {
      throw new ConflictException("CREDENTIAL_CANNOT_BE_ACTIVATED");
    }

    const updated = await this.prisma.wristband.update({
      where: { id: input.credentialId },
      data: {
        status: "active",
        activatedAt: new Date()
      }
    });

    return this.toWristbandResponse(updated);
  }

  async suspendCredential(input: SuspendCredentialDto): Promise<WristbandResponseDto> {
    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.credentialId } });
    if (!wristband) {
      throw new NotFoundException("WRISTBAND_NOT_FOUND");
    }

    const updated = await this.prisma.wristband.update({
      where: { id: input.credentialId },
      data: {
        status: "suspended",
        suspendedAt: new Date()
      }
    });

    return this.toWristbandResponse(updated);
  }

  async replaceCredential(input: ReplaceCredentialDto): Promise<WristbandResponseDto> {
    const oldCredential = await this.prisma.wristband.findUnique({
      where: { id: input.oldCredentialId }
    });

    if (!oldCredential) {
      throw new NotFoundException("WRISTBAND_NOT_FOUND");
    }

    const activeAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: { wristbandId: input.oldCredentialId, active: true },
      orderBy: { assignedAt: "desc" }
    });

    const created = await this.prisma.wristband.create({
      data: {
        uid: input.newCredentialUid,
        locationId: oldCredential.locationId,
        homeLocationId: oldCredential.homeLocationId,
        globalAccessFlag: oldCredential.globalAccessFlag,
        replacedFromWristbandId: oldCredential.id,
        status: "pending_activation"
      }
    });

    if (activeAssignment) {
      await this.prisma.wristbandAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          active: false,
          unassignedAt: new Date(),
          unassignedReason: "replaced"
        }
      });

      await this.prisma.wristbandAssignment.create({
        data: {
          wristbandId: created.id,
          memberId: activeAssignment.memberId,
          assignedByStaffUserId: input.assignedByStaffUserId ?? null,
          active: true
        }
      });
    }

    await this.prisma.wristband.update({
      where: { id: oldCredential.id },
      data: { status: "replaced" }
    });

    return this.toWristbandResponse(created);
  }

  async createWristband(input: CreateWristbandDto): Promise<WristbandResponseDto> {
    const created = await this.prisma.wristband.create({
      data: {
        uid: input.uid,
        locationId: input.locationId ?? null,
        status: input.status ?? "inventory"
      }
    });

    return this.toWristbandResponse(created);
  }

  async getWristbandById(id: string): Promise<WristbandResponseDto> {
    const wristband = await this.prisma.wristband.findUnique({
      where: { id }
    });

    if (!wristband) {
      throw new NotFoundException("Wristband not found");
    }

    return this.toWristbandResponse(wristband);
  }

  async listWristbands(): Promise<WristbandResponseDto[]> {
    const wristbands = await this.prisma.wristband.findMany({
      orderBy: { createdAt: "desc" }
    });

    return wristbands.map((wb) => this.toWristbandResponse(wb));
  }

  async assignWristband(input: AssignWristbandDto): Promise<WristbandAssignmentResponseDto> {
    const wristband = await this.prisma.wristband.findUnique({ where: { id: input.wristbandId } });
    if (!wristband) {
      throw new NotFoundException("Wristband not found");
    }

    if (wristband.status !== "inventory") {
      throw new ConflictException("WRISTBAND_NOT_IN_INVENTORY");
    }

    const member = await this.prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const assignment = await this.prisma.wristbandAssignment.create({
      data: {
        wristbandId: input.wristbandId,
        memberId: input.memberId,
        assignedByStaffUserId: input.assignedByStaffUserId ?? null,
        active: true
      }
    });

    await this.prisma.wristband.update({
      where: { id: input.wristbandId },
      data: {
        status: "assigned",
        activatedAt: null,
        suspendedAt: null
      }
    });

    return {
      id: assignment.id,
      wristbandId: assignment.wristbandId,
      memberId: assignment.memberId,
      assignedByStaffUserId: assignment.assignedByStaffUserId,
      assignedAt: assignment.assignedAt.toISOString(),
      unassignedAt: null,
      unassignedReason: null,
      active: assignment.active
    };
  }

  async unassignWristband(input: UnassignWristbandDto): Promise<WristbandAssignmentResponseDto> {
    const assignment = await this.prisma.wristbandAssignment.findFirst({
      where: { wristbandId: input.wristbandId, active: true }
    });

    if (!assignment) {
      throw new NotFoundException("No active assignment found for this wristband");
    }

    const updated = await this.prisma.wristbandAssignment.update({
      where: { id: assignment.id },
      data: {
        active: false,
        unassignedAt: new Date(),
        unassignedReason: input.unassignedReason ?? null
      }
    });

    const exitStatuses: WristbandStatus[] = ["lost", "stolen", "damaged", "retired", "replaced"];
    const wristbandStatus: WristbandStatus = exitStatuses.includes(input.unassignedReason as WristbandStatus)
      ? (input.unassignedReason as WristbandStatus)
      : "inventory";

    await this.prisma.wristband.update({
      where: { id: input.wristbandId },
      data: { status: wristbandStatus }
    });

    return {
      id: updated.id,
      wristbandId: updated.wristbandId,
      memberId: updated.memberId,
      assignedByStaffUserId: updated.assignedByStaffUserId,
      assignedAt: updated.assignedAt.toISOString(),
      unassignedAt: updated.unassignedAt?.toISOString() ?? null,
      unassignedReason: updated.unassignedReason,
      active: updated.active
    };
  }

  private toWristbandResponse(wristband: {
    id: string;
    uid: string;
    locationId: string | null;
    homeLocationId: string | null;
    status: WristbandStatus;
    globalAccessFlag: boolean;
    issuedAt: Date;
    activatedAt: Date | null;
    suspendedAt: Date | null;
    replacedFromWristbandId: string | null;
    lastSeenLocationId: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): WristbandResponseDto {
    return {
      id: wristband.id,
      uid: wristband.uid,
      locationId: wristband.locationId,
      homeLocationId: wristband.homeLocationId,
      status: wristband.status,
      globalAccessFlag: wristband.globalAccessFlag,
      issuedAt: wristband.issuedAt.toISOString(),
      activatedAt: wristband.activatedAt?.toISOString() ?? null,
      suspendedAt: wristband.suspendedAt?.toISOString() ?? null,
      replacedFromWristbandId: wristband.replacedFromWristbandId,
      lastSeenLocationId: wristband.lastSeenLocationId,
      lastSeenAt: wristband.lastSeenAt?.toISOString() ?? null,
      createdAt: wristband.createdAt.toISOString(),
      updatedAt: wristband.updatedAt.toISOString()
    };
  }
}
