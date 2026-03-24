import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AccessAttemptResponseDto } from "../dto/access-attempt.response.dto";
import { CreateAccessAttemptDto } from "../dto/create-access-attempt.dto";

@Injectable()
export class AccessAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAttempt(input: CreateAccessAttemptDto): Promise<AccessAttemptResponseDto> {
    const created = await this.prisma.accessAttempt.create({
      data: {
        memberId: input.memberId ?? null,
        wristbandId: input.wristbandId ?? null,
        accessPointId: input.accessPointId,
        accessZoneId: input.accessZoneId,
        attemptSource: input.attemptSource ?? null,
        decision: input.decision,
        denialReasonCode: input.denialReasonCode ?? null,
        occurredAt: new Date(input.occurredAt)
      }
    });

    return this.toDto(created);
  }

  async listAttempts(): Promise<AccessAttemptResponseDto[]> {
    const attempts = await this.prisma.accessAttempt.findMany({
      orderBy: { occurredAt: "desc" }
    });

    return attempts.map((a) => this.toDto(a));
  }

  async listMemberAttempts(memberId: string): Promise<AccessAttemptResponseDto[]> {
    const attempts = await this.prisma.accessAttempt.findMany({
      where: { memberId },
      orderBy: { occurredAt: "desc" }
    });

    return attempts.map((a) => this.toDto(a));
  }

  private toDto(a: {
    id: string;
    memberId: string | null;
    wristbandId: string | null;
    accessPointId: string;
    accessZoneId: string;
    attemptSource: string | null;
    decision: string;
    denialReasonCode: string | null;
    occurredAt: Date;
  }): AccessAttemptResponseDto {
    return {
      id: a.id,
      memberId: a.memberId,
      wristbandId: a.wristbandId,
      accessPointId: a.accessPointId,
      accessZoneId: a.accessZoneId,
      attemptSource: a.attemptSource,
      decision: a.decision as AccessAttemptResponseDto["decision"],
      denialReasonCode: a.denialReasonCode,
      occurredAt: a.occurredAt.toISOString()
    };
  }
}
