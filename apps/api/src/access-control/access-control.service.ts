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

    // 3. Member has an active subscription
    const activeSubscription = await this.prisma.membershipSubscription.findFirst({
      where: {
        memberId: input.memberId,
        status: "active"
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

    // 5. If wristbandAssignmentId provided, must be active
    if (input.wristbandAssignmentId) {
      const wristbandAssignment = await this.prisma.wristbandAssignment.findUnique({
        where: { id: input.wristbandAssignmentId }
      });

      if (!wristbandAssignment || !wristbandAssignment.active) {
        return {
          eligible: false,
          denialReasonCode: "NO_ACTIVE_WRISTBAND_ASSIGNMENT"
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

    // 1. Check active MemberAccessGrant to zone (time-bounded)
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

    // 2. Check active MemberAccessOverride to zone (time-bounded)
    const override = await this.prisma.memberAccessOverride.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
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

    if (override) {
      return { allowed: true };
    }

    // 3. Get zone to check requiresBooking flag
    const zone = await this.prisma.accessZone.findUnique({
      where: { id: input.accessZoneId }
    });

    if (!zone) {
      return {
        allowed: false,
        denialReasonCode: "ZONE_NOT_FOUND"
      };
    }

    // 4. If zone does not require booking, allow access
    if (!zone.requiresBooking) {
      return { allowed: true };
    }

    // 5. Zone requires booking - check for valid Booking (time-bounded)
    const booking = await this.prisma.booking.findFirst({
      where: {
        memberId: input.memberId,
        accessZoneId: input.accessZoneId,
        status: "confirmed",
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
