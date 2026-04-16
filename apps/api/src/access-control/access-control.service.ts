import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CheckInEligibilityDto } from "./dto/check-in-eligibility.dto";
import { EligibilityDecisionDto } from "./dto/eligibility-decision.dto";
import { ZoneAccessDecisionDto } from "./dto/zone-access-decision.dto";
import { ZoneAccessEligibilityDto } from "./dto/zone-access-eligibility.dto";

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateCheckIn(input: CheckInEligibilityDto): Promise<EligibilityDecisionDto> {
    const member = await this.prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member) return { eligible: false, denialReasonCode: "MEMBER_NOT_FOUND" };
    if (member.status !== "active") return { eligible: false, denialReasonCode: "MEMBER_NOT_ACTIVE" };

    const activeSubscription = await this.prisma.membershipSubscription.findFirst({
      where: { memberId: input.memberId, status: { in: ["active", "trialing"] } }
    });
    if (!activeSubscription) return { eligible: false, denialReasonCode: "NO_ACTIVE_SUBSCRIPTION" };

    const openVisitSession = await this.prisma.visitSession.findFirst({
      where: { memberId: input.memberId, status: "checked_in" }
    });
    if (openVisitSession) return { eligible: false, denialReasonCode: "ALREADY_CHECKED_IN" };

    // 5. Wristband assignment is required — every entrant must present a valid credential
    if (!input.wristbandAssignmentId) return { eligible: false, denialReasonCode: "WRISTBAND_REQUIRED" };

    const wa = await this.prisma.wristbandAssignment.findUnique({
      where: { id: input.wristbandAssignmentId },
      include: { wristband: true }
    });
    if (!wa || !wa.active) return { eligible: false, denialReasonCode: "NO_ACTIVE_WRISTBAND_ASSIGNMENT" };
    if (!(["assigned", "active"]).includes(wa.wristband.status)) return { eligible: false, denialReasonCode: "WRISTBAND_NOT_ACTIVE" };

    return { eligible: true };
  }

  async evaluateZoneAccess(input: ZoneAccessEligibilityDto): Promise<ZoneAccessDecisionDto> {
    const attemptedAtDate = new Date(input.attemptedAt);
    const AND = [
      { OR: [{ validFrom: null }, { validFrom: { lte: attemptedAtDate } }] },
      { OR: [{ validUntil: null }, { validUntil: { gte: attemptedAtDate } }] }
    ];

    const denyOverride = await this.prisma.memberAccessOverride.findFirst({
      where: { memberId: input.memberId, accessZoneId: input.accessZoneId, action: "deny", AND }
    });
    if (denyOverride) return { allowed: false, denialReasonCode: "ZONE_ACCESS_EXPLICITLY_DENIED" };

    const allowOverride = await this.prisma.memberAccessOverride.findFirst({
      where: { memberId: input.memberId, accessZoneId: input.accessZoneId, action: "allow", AND }
    });
    if (allowOverride) return { allowed: true };

    const grant = await this.prisma.memberAccessGrant.findFirst({
      where: { memberId: input.memberId, accessZoneId: input.accessZoneId, active: true, AND }
    });
    if (grant) return { allowed: true };

    const zone = await this.prisma.accessZone.findUnique({ where: { id: input.accessZoneId } });
    if (!zone) return { allowed: false, denialReasonCode: "ZONE_NOT_FOUND" };
    if (!zone.requiresBooking) return { allowed: true };

    const booking = await this.prisma.booking.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        status: { in: ["reserved", "checked_in"] },
        startsAt: { lte: attemptedAtDate },
        endsAt: { gte: attemptedAtDate }
      }
    });
    if (booking) return { allowed: true };

    return { allowed: false, denialReasonCode: "ZONE_BOOKING_REQUIRED" };
  }
}
