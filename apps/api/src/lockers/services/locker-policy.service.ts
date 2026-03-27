import { Injectable } from "@nestjs/common";
import { LockerAssignmentMode, LockerStatus, Prisma, WristbandStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { LockerPolicyDecisionResponseDto } from "../dto/locker-policy-decision.response.dto";

interface EvaluateInput {
  memberId: string;
  credentialId: string;
  siteId: string;
  sessionId: string;
  requestMode: LockerAssignmentMode;
  requestedZoneId?: string;
  requestedLockerId?: string;
  staffOverride?: boolean;
  staffOverrideReason?: string;
  staffUserId?: string;
  correlationId?: string;
}

const ACTIVE_CREDENTIAL_STATUSES: WristbandStatus[] = ["active", "assigned", "pending_activation"];
const ASSIGNABLE_STATUSES: LockerStatus[] = ["available", "reserved", "assigned"];
const HARD_BLOCKED_STATUSES: LockerStatus[] = ["maintenance", "offline", "forced_open", "out_of_service"];

@Injectable()
export class LockerPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(input: EvaluateInput): Promise<LockerPolicyDecisionResponseDto> {
    const member = await this.prisma.member.findUnique({
      where: { id: input.memberId },
      include: {
        subscriptions: {
          where: { status: { in: ["active", "trialing"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { membershipPlan: true }
        }
      }
    });

    if (!member) {
      return this.logAndReturn(input, {
        decision: "deny",
        reasonCode: "MEMBER_NOT_FOUND",
        eligibleLockerIds: [],
        assignmentMode: input.requestMode,
        policySnapshot: this.snapshot(input, null, null, [])
      });
    }

    const credential = await this.prisma.wristband.findUnique({ where: { id: input.credentialId } });
    if (!credential || !ACTIVE_CREDENTIAL_STATUSES.includes(credential.status)) {
      return this.logAndReturn(input, {
        decision: "deny",
        reasonCode: "CREDENTIAL_NOT_ACTIVE",
        eligibleLockerIds: [],
        assignmentMode: input.requestMode,
        policySnapshot: this.snapshot(input, member, credential, [])
      });
    }

    const activeSession = await this.prisma.visitSession.findFirst({
      where: {
        id: input.sessionId,
        memberId: input.memberId,
        locationId: input.siteId,
        status: "checked_in"
      }
    });

    if (!activeSession) {
      return this.logAndReturn(input, {
        decision: "deny",
        reasonCode: "SESSION_NOT_ACTIVE",
        eligibleLockerIds: [],
        assignmentMode: input.requestMode,
        policySnapshot: this.snapshot(input, member, credential, [])
      });
    }

    const baseWhere = {
      locationId: input.siteId,
      active: true,
      status: { in: ASSIGNABLE_STATUSES },
      ...(input.requestedZoneId ? { zoneId: input.requestedZoneId } : {}),
      ...(input.requestedLockerId ? { id: input.requestedLockerId } : {})
    };

    const lockers = await this.prisma.locker.findMany({
      where: baseWhere,
      include: {
        assignments: {
          where: { active: true },
          take: 1
        }
      }
    });

    const hasPremiumTier = (member.subscriptions[0]?.membershipPlan?.tierRank ?? 0) >= 3;

    let filtered = lockers.filter((locker) => locker.assignments.length === 0);

    if (input.requestMode === "day_use_shared") {
      filtered = filtered.filter((locker) => locker.supportsDayUse);
    }

    if (input.requestMode === "assigned") {
      filtered = filtered.filter((locker) => locker.supportsAssignedUse);
    }

    if (input.requestMode === "premium") {
      filtered = filtered.filter((locker) => locker.tierClass === "premium");
      if (!hasPremiumTier && !input.staffOverride) {
        return this.logAndReturn(input, {
          decision: "deny",
          reasonCode: "LOCKER_TIER_RESTRICTED",
          eligibleLockerIds: [],
          assignmentMode: input.requestMode,
          policySnapshot: this.snapshot(input, member, credential, [])
        });
      }
    }

    // staffOverride can bypass business-policy restrictions, but never hard safety/operational states.
    filtered = filtered.filter((locker) => !HARD_BLOCKED_STATUSES.includes(locker.status));

    const sorted = [...filtered].sort((a, b) => {
      const aPremium = a.tierClass === "premium" ? 0 : 1;
      const bPremium = b.tierClass === "premium" ? 0 : 1;
      if (aPremium !== bPremium) return aPremium - bPremium;

      if (a.zoneId && b.zoneId && a.zoneId !== b.zoneId) {
        return a.zoneId.localeCompare(b.zoneId);
      }

      const aLabel = a.lockerLabel ?? a.code;
      const bLabel = b.lockerLabel ?? b.code;
      return aLabel.localeCompare(bLabel);
    });

    if (sorted.length === 0) {
      const reasonCode = input.staffOverride ? "LOCKER_HARD_BLOCKED_STATUS" : "NO_ELIGIBLE_LOCKERS";
      return this.logAndReturn(input, {
        decision: "deny",
        reasonCode,
        eligibleLockerIds: [],
        assignmentMode: input.requestMode,
        policySnapshot: this.snapshot(input, member, credential, [])
      });
    }

    const chosenLockerId = sorted[0].id;
    const reasonCode = input.staffOverride ? "STAFF_OVERRIDE_APPLIED" : "LOCKER_ELIGIBLE";

    return this.logAndReturn(input, {
      decision: "allow",
      reasonCode,
      eligibleLockerIds: sorted.map((locker) => locker.id),
      chosenLockerId,
      assignmentMode: input.requestMode,
      policySnapshot: this.snapshot(input, member, credential, sorted.map((locker) => locker.id))
    });
  }

  private snapshot(
    input: EvaluateInput,
    member: { id: string } | null,
    credential: { id: string; status: WristbandStatus } | null,
    eligibleLockerIds: string[]
  ): Record<string, unknown> {
    return {
      memberId: member?.id,
      credentialId: credential?.id,
      credentialStatus: credential?.status,
      siteId: input.siteId,
      sessionId: input.sessionId,
      requestedZoneId: input.requestedZoneId,
      requestedLockerId: input.requestedLockerId,
      requestMode: input.requestMode,
      staffOverride: Boolean(input.staffOverride),
      staffOverrideReason: input.staffOverrideReason,
      eligibleLockerIds
    };
  }

  private async logAndReturn(
    input: EvaluateInput,
    output: LockerPolicyDecisionResponseDto
  ): Promise<LockerPolicyDecisionResponseDto> {
    await this.prisma.lockerPolicyDecisionEvent.create({
      data: {
        memberId: input.memberId,
        lockerId: output.chosenLockerId ?? null,
        visitSessionId: input.sessionId,
        staffUserId: input.staffUserId ?? null,
        siteId: input.siteId,
        requestedZoneId: input.requestedZoneId ?? null,
        requestedLockerId: input.requestedLockerId ?? null,
        assignmentMode: input.requestMode,
        decision: output.decision,
        reasonCode: output.reasonCode,
        eligibleLockerIds: output.eligibleLockerIds,
        chosenLockerId: output.chosenLockerId ?? null,
        inputSnapshotJson: this.snapshot(input, { id: input.memberId }, null, []) as Prisma.InputJsonValue,
        outputSnapshotJson: output.policySnapshot as Prisma.InputJsonValue,
        correlationId: input.correlationId ?? null
      }
    });

    return output;
  }
}
