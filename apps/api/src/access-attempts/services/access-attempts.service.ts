import { Injectable, NotFoundException } from "@nestjs/common";
import { AccessDecision } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AccessControlService } from "../../access-control/access-control.service";
import { AccessAttemptResponseDto } from "../dto/access-attempt.response.dto";
import { CreateAccessAttemptDto } from "../dto/create-access-attempt.dto";
import { ScanDecisionResponseDto } from "../dto/scan-decision.response.dto";
import { ScanWristbandDto } from "../dto/scan-wristband.dto";

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

  async evaluateScan(input: ScanWristbandDto): Promise<ScanDecisionResponseDto> {
    const occurredAt = new Date(input.occurredAt);

    const accessPoint = await this.prisma.accessPoint.findUnique({
      where: { code: input.accessPointCode }
    });

    if (!accessPoint) {
      throw new NotFoundException("ACCESS_POINT_NOT_FOUND");
    }

    const wristband = await this.prisma.wristband.findFirst({
      where: { uid: input.wristbandUid }
    });

    if (!wristband) {
      const attempt = await this.prisma.accessAttempt.create({
        data: {
          wristbandId: null,
          accessPointId: accessPoint.id,
          accessZoneId: accessPoint.accessZoneId,
          attemptSource: input.attemptSource ?? null,
          decision: AccessDecision.denied,
          denialReasonCode: "WRISTBAND_NOT_FOUND",
          occurredAt
        }
      });
      return { attemptId: attempt.id, decision: "denied", denialReasonCode: "WRISTBAND_NOT_FOUND" };
    }

    // Member path: WristbandAssignment
    const assignment = await this.prisma.wristbandAssignment.findFirst({
      where: { wristbandId: wristband.id, active: true }
    });

    if (assignment) {
      const evaluation = await this.accessControl.evaluateZoneAccess({
        memberId: assignment.memberId,
        accessZoneId: accessPoint.accessZoneId,
        attemptedAt: occurredAt.toISOString()
      });

      const decision = evaluation.allowed ? AccessDecision.allowed : AccessDecision.denied;
      const attempt = await this.prisma.accessAttempt.create({
        data: {
          memberId: assignment.memberId,
          wristbandId: wristband.id,
          accessPointId: accessPoint.id,
          accessZoneId: accessPoint.accessZoneId,
          attemptSource: input.attemptSource ?? null,
          decision,
          denialReasonCode: evaluation.denialReasonCode ?? null,
          occurredAt
        }
      });

      return {
        attemptId: attempt.id,
        decision: evaluation.allowed ? "allowed" : "denied",
        signal: evaluation.allowed ? "open_door" : undefined,
        denialReasonCode: evaluation.denialReasonCode ?? undefined,
        memberId: assignment.memberId,
        accessZoneId: accessPoint.accessZoneId
      };
    }

    // Guest path: WristbandLink + AccessPermission
    const link = await this.prisma.wristbandLink.findFirst({
      where: { wristbandId: wristband.id, linkStatus: "active" }
    });

    if (link) {
      const zone = await this.prisma.accessZone.findUnique({
        where: { id: accessPoint.accessZoneId }
      });

      const permission = zone
        ? await this.prisma.accessPermission.findFirst({
            where: {
              wristbandId: wristband.id,
              zoneCode: zone.code,
              permissionStatus: "granted",
              validFrom: { lte: occurredAt },
              validUntil: { gte: occurredAt }
            }
          })
        : null;

      const allowed = permission !== null;
      const denialReasonCode = allowed ? null : "ZONE_PERMISSION_NOT_GRANTED";
      const attempt = await this.prisma.accessAttempt.create({
        data: {
          wristbandId: wristband.id,
          accessPointId: accessPoint.id,
          accessZoneId: accessPoint.accessZoneId,
          attemptSource: input.attemptSource ?? null,
          decision: allowed ? AccessDecision.allowed : AccessDecision.denied,
          denialReasonCode,
          occurredAt
        }
      });

      return {
        attemptId: attempt.id,
        decision: allowed ? "allowed" : "denied",
        signal: allowed ? "open_door" : undefined,
        denialReasonCode: denialReasonCode ?? undefined,
        guestId: link.guestId,
        accessZoneId: accessPoint.accessZoneId
      };
    }

    // No assignment and no link — unknown credential
    const attempt = await this.prisma.accessAttempt.create({
      data: {
        wristbandId: wristband.id,
        accessPointId: accessPoint.id,
        accessZoneId: accessPoint.accessZoneId,
        attemptSource: input.attemptSource ?? null,
        decision: AccessDecision.denied,
        denialReasonCode: "UNKNOWN_CREDENTIAL",
        occurredAt
      }
    });

    return { attemptId: attempt.id, decision: "denied", denialReasonCode: "UNKNOWN_CREDENTIAL" };
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
