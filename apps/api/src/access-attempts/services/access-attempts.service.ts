import { Injectable } from "@nestjs/common";
import { AccessDecision } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AccessControlService } from "../../access-control/access-control.service";
import { AccessAttemptResponseDto } from "../dto/access-attempt.response.dto";
import { CreateAccessAttemptDto } from "../dto/create-access-attempt.dto";

@Injectable()
export class AccessAttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService
  ) {}

  async createAttempt(input: CreateAccessAttemptDto): Promise<AccessAttemptResponseDto> {
    const attemptOccurredAt = new Date(input.occurredAt);
    let decision: AccessDecision = AccessDecision.allowed;
    let denialReasonCode: string | null = null;

    if (input.memberId) {
      const zoneEvaluation = await this.accessControl.evaluateZoneAccess({
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        attemptedAt: attemptOccurredAt.toISOString()
      });

      if (!zoneEvaluation.allowed) {
        decision = AccessDecision.denied;
        denialReasonCode = zoneEvaluation.denialReasonCode ?? "ACCESS_DENIED";
      }
    } else {
      // No member associated with this credential scan — deny by default.
      // An unrecognized credential must never be granted access.
      decision = AccessDecision.denied;
      denialReasonCode = "UNKNOWN_CREDENTIAL";
    }

    const created = await this.prisma.accessAttempt.create({
      data: {
        memberId: input.memberId ?? null,
        wristbandId: input.wristbandId ?? null,
        accessPointId: input.accessPointId,
        accessZoneId: input.accessZoneId,
        attemptSource: input.attemptSource ?? null,
        decision,
        denialReasonCode,
        occurredAt: attemptOccurredAt
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
