import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { WristbandStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignWristbandDto } from "../dto/assign-wristband.dto";
import { CreateWristbandDto } from "../dto/create-wristband.dto";
import { UnassignWristbandDto } from "../dto/unassign-wristband.dto";
import { WristbandAssignmentResponseDto } from "../dto/wristband-assignment.response.dto";
import { WristbandResponseDto } from "../dto/wristband.response.dto";

@Injectable()
export class WristbandsService {
  constructor(private readonly prisma: PrismaService) {}

  async createWristband(input: CreateWristbandDto): Promise<WristbandResponseDto> {
    const created = await this.prisma.wristband.create({
      data: {
        uid: input.uid,
        locationId: input.locationId ?? null,
        status: input.status ?? "inventory"
      }
    });

    return {
      id: created.id,
      uid: created.uid,
      locationId: created.locationId,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    };
  }

  async getWristbandById(id: string): Promise<WristbandResponseDto> {
    const wristband = await this.prisma.wristband.findUnique({
      where: { id }
    });

    if (!wristband) {
      throw new NotFoundException("Wristband not found");
    }

    return {
      id: wristband.id,
      uid: wristband.uid,
      locationId: wristband.locationId,
      status: wristband.status,
      createdAt: wristband.createdAt.toISOString(),
      updatedAt: wristband.updatedAt.toISOString()
    };
  }

  async listWristbands(): Promise<WristbandResponseDto[]> {
    const wristbands = await this.prisma.wristband.findMany({
      orderBy: { createdAt: "desc" }
    });

    return wristbands.map((wb) => ({
      id: wb.id,
      uid: wb.uid,
      locationId: wb.locationId,
      status: wb.status,
      createdAt: wb.createdAt.toISOString(),
      updatedAt: wb.updatedAt.toISOString()
    }));
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
      data: { status: "assigned" }
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

    const exitStatuses: WristbandStatus[] = ["lost", "stolen", "damaged", "retired"];
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
}
