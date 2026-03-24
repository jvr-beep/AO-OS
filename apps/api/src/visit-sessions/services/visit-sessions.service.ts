import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccessControlService } from "../../access-control/access-control.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CheckOutVisitSessionDto } from "../dto/check-out-visit-session.dto";
import { CreateVisitSessionDto } from "../dto/create-visit-session.dto";
import { VisitSessionResponseDto } from "../dto/visit-session.response.dto";

@Injectable()
export class VisitSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService
  ) {}

  async checkIn(input: CreateVisitSessionDto): Promise<VisitSessionResponseDto> {
    const eligibility = await this.accessControlService.evaluateCheckIn({
      memberId: input.memberId,
      wristbandAssignmentId: input.wristbandAssignmentId
    });

    if (!eligibility.eligible) {
      throw new ForbiddenException(eligibility.denialReasonCode);
    }

    const created = await this.prisma.visitSession.create({
      data: {
        memberId: input.memberId,
        locationId: input.locationId,
        wristbandAssignmentId: input.wristbandAssignmentId ?? null,
        checkInAt: new Date(input.checkInAt),
        status: "checked_in"
      }
    });

    return this.toDto(created);
  }

  async checkOut(input: CheckOutVisitSessionDto): Promise<VisitSessionResponseDto> {
    const session = await this.prisma.visitSession.findUnique({
      where: { id: input.visitSessionId }
    });

    if (!session) {
      throw new NotFoundException("Visit session not found");
    }

    const updated = await this.prisma.visitSession.update({
      where: { id: input.visitSessionId },
      data: {
        checkOutAt: new Date(input.checkOutAt),
        status: "checked_out"
      }
    });

    return this.toDto(updated);
  }

  async listMemberSessions(memberId: string): Promise<VisitSessionResponseDto[]> {
    const sessions = await this.prisma.visitSession.findMany({
      where: { memberId },
      orderBy: { checkInAt: "desc" }
    });

    return sessions.map((s) => this.toDto(s));
  }

  private toDto(s: {
    id: string;
    memberId: string;
    locationId: string;
    wristbandAssignmentId: string | null;
    checkInAt: Date;
    checkOutAt: Date | null;
    status: string;
    createdAt: Date;
  }): VisitSessionResponseDto {
    return {
      id: s.id,
      memberId: s.memberId,
      locationId: s.locationId,
      wristbandAssignmentId: s.wristbandAssignmentId,
      checkInAt: s.checkInAt.toISOString(),
      checkOutAt: s.checkOutAt?.toISOString() ?? null,
      status: s.status as VisitSessionResponseDto["status"],
      createdAt: s.createdAt.toISOString()
    };
  }
}
