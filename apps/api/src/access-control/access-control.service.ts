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
    // 1. Member exists
    const member = await this.prisma.member.findUnique({
      where: { id: input.memberId }
    });

    if (!member) {
      return {
        eligible: false,
        denialReasonCode: "MEMBER_NOT_FOUND"
      };
    }

    // 2. Member status is active
    if (member.status !== "active") {
      return {
        eligible: false,
        denialReasonCode: "MEMBER_NOT_ACTIVE"
      };
    }

    // 3. Member has an active or trialing subscription
    const activeSubscription = await this.prisma.membershipSubscription.findFirst({
      where: {
        memberId: input.memberId,
        status: { in: ["active", "trialing"] }
      }
    });

    if (!activeSubscription) {
      return {
        eligible: false,
        denialReasonCode: "NO_ACTIVE_SUBSCRIPTION"
      };
    }

    // 4. No open visit session already exists
    const openVisitSession = await this.prisma.visitSession.findFirst({
      where: {
        memberId: input.memberId,
        status: "checked_in"
      }
    });

    if (openVisitSession) {
      return {
        eligible: false,
        denialReasonCode: "ALREADY_CHECKED_IN"
      };
    }

    // 5. If wristbandAssignmentId provided, must be active and wristband status assigned/active
    if (input.wristbandAssignmentId) {
      const wristbandAssignment = await this.prisma.wristbandAssignment.findUnique({
        where: { id: input.wristbandAssignmentId },
        include: { wristband: true }
      });

      if (!wristbandAssignment || !wristbandAssignment.active) {
        return {
          eligible: false,
          denialReasonCode: "NO_ACTIVE_WRISTBAND_ASSIGNMENT"
        };
      }

      if (!(["assigned", "active"] as string[]).includes(wristbandAssignment.wristband.status)) {
        return {
          eligible: false,
          denialReasonCode: "WRISTBAND_NOT_ACTIVE"
        };
      }
    }

    // All checks passed
    return {
      eligible: true
    };
  }

  async evaluateZoneAccess(input: ZoneAccessEligibilityDto): Promise<ZoneAccessDecisionDto> {
    const attemptedAtDate = new Date(input.attemptedAt);

    // 1. Check for explicit DENY override (deny overrides take priority over everything)
    const denyOverride = await this.prisma.memberAccessOverride.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        action: "deny",
        AND: [
          {
            OR: [{ validFrom: null }, { validFrom: { lte: attemptedAtDate } }]
          },
          {
            OR: [{ validUntil: null }, { validUntil: { gte: attemptedAtDate } }]
          }
        ]
      }
    });

    if (denyOverride) {
      return {
        allowed: false,
        denialReasonCode: "ZONE_ACCESS_EXPLICITLY_DENIED"
      };
    }

    // 2. Check for explicit ALLOW override (time-bounded)
    const allowOverride = await this.prisma.memberAccessOverride.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        action: "allow",
        AND: [
          {
            OR: [{ validFrom: null }, { validFrom: { lte: attemptedAtDate } }]
          },
          {
            OR: [{ validUntil: null }, { validUntil: { gte: attemptedAtDate } }]
          }
        ]
      }
    });

    if (allowOverride) {
      return { allowed: true };
    }

    // 3. Check active MemberAccessGrant to zone (time-bounded)
    const grant = await this.prisma.memberAccessGrant.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        active: true,
        AND: [
          {
            OR: [{ validFrom: null }, { validFrom: { lte: attemptedAtDate } }]
          },
          {
            OR: [{ validUntil: null }, { validUntil: { gte: attemptedAtDate } }]
          }
        ]
      }
    });

    if (grant) {
      return { allowed: true };
    }

    // 4. Get zone to check requiresBooking flag
    const zone = await this.prisma.accessZone.findUnique({
      where: { id: input.accessZoneId }
    });

    if (!zone) {
      return {
        allowed: false,
        denialReasonCode: "ZONE_NOT_FOUND"
      };
    }

    // 5. If zone does not require booking, allow access
    if (!zone.requiresBooking) {
      return { allowed: true };
    }

    // 6. Zone requires booking - check for valid Booking (status reserved or checked_in, time-bounded)
    const booking = await this.prisma.booking.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        status: { in: ["reserved", "checked_in"] },
        startsAt: { lte: attemptedAtDate },
        endsAt: { gte: attemptedAtDate }
      }
    });

    if (booking) {
      return { allowed: true };
    }

    // No booking found for required-booking zone
    return {
      allowed: false,
      denialReasonCode: "ZONE_BOOKING_REQUIRED"
    };
  }
}
