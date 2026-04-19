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

    // Every entrant must present a valid RFID credential — no shared entry
    if (!input.wristbandAssignmentId) return { eligible: false, denialReasonCode: "WRISTBAND_REQUIRED" };

    const wa = await this.prisma.wristbandAssignment.findUnique({
      where: { id: input.wristbandAssignmentId },
      include: { wristband: true }
    });
    if (!wa || !wa.active) return { eligible: false, denialReasonCode: "NO_ACTIVE_WRISTBAND_ASSIGNMENT" };
    if (!["assigned", "active"].includes(wa.wristband.status)) return { eligible: false, denialReasonCode: "WRISTBAND_NOT_ACTIVE" };

    return { eligible: true };
  }

  /**
   * Zone access evaluation order:
   * 1. Explicit deny override → deny
   * 2. Explicit allow override → allow
   * 3. Individual MemberAccessGrant → allow
   * 4. Membership plan ZoneEntitlement → allow/deny by tier
   * 5. Zone booking check (for requiresBooking zones)
   * 6. Default deny
   */
  async evaluateZoneAccess(input: ZoneAccessEligibilityDto): Promise<ZoneAccessDecisionDto> {
    const attemptedAtDate = new Date(input.attemptedAt);
    const AND = [
      { OR: [{ validFrom: null }, { validFrom: { lte: attemptedAtDate } }] },
      { OR: [{ validUntil: null }, { validUntil: { gte: attemptedAtDate } }] }
    ];

    // 1. Explicit deny override — highest precedence
    const denyOverride = await this.prisma.memberAccessOverride.findFirst({
      where: { memberId: input.memberId, accessZoneId: input.accessZoneId, action: "deny", AND }
    });
    if (denyOverride) return { allowed: false, denialReasonCode: "ZONE_ACCESS_EXPLICITLY_DENIED" };

    // 2. Explicit allow override
    const allowOverride = await this.prisma.memberAccessOverride.findFirst({
      where: { memberId: input.memberId, accessZoneId: input.accessZoneId, action: "allow", AND }
    });
    if (allowOverride) return { allowed: true };

    // 3. Individual access grant (e.g. comped access, staff override)
    const grant = await this.prisma.memberAccessGrant.findFirst({
      where: { memberId: input.memberId, accessZoneId: input.accessZoneId, active: true, AND }
    });
    if (grant) return { allowed: true };

    // 4. Membership plan ZoneEntitlement — look up member's active plan and check zone rules
    const zone = await this.prisma.accessZone.findUnique({ where: { id: input.accessZoneId } });
    if (!zone) return { allowed: false, denialReasonCode: "ZONE_NOT_FOUND" };

    const activeSubscription = await this.prisma.membershipSubscription.findFirst({
      where: { memberId: input.memberId, status: { in: ["active", "trialing"] } },
      include: { membershipPlan: true }
    });

    if (activeSubscription) {
      const entitlement = await this.prisma.zoneEntitlement.findUnique({
        where: {
          productCode_productType_zoneCode: {
            productCode: activeSubscription.membershipPlan.code,
            productType: "membership_plan",
            zoneCode: zone.code,
          }
        }
      });

      if (entitlement?.active) return { allowed: true };

      // Member has a subscription but their tier doesn't include this zone
      if (!zone.requiresBooking) {
        return { allowed: false, denialReasonCode: "ZONE_NOT_INCLUDED_IN_PLAN" };
      }
    }

    // 5. Booking check for zones that require it (covers both members and guests)
    if (zone.requiresBooking) {
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

    // 6. Default deny — no rule granted access
    return { allowed: false, denialReasonCode: "ZONE_ACCESS_NOT_GRANTED" };
  }

  /**
   * Stamps AccessPermission records for a new visit based on the tier's ZoneEntitlement.
   * Called by VisitsService.initiateVisit() immediately after visit creation.
   *
   * Every body entering AO is individually verified, individually paid,
   * and individually credentialed — no shared entry, no inherited access.
   */
  async grantVisitZonePermissions(params: {
    visitId: string;
    wristbandId: string;
    tierCode: string;
    validFrom: Date;
    validUntil: Date;
  }): Promise<void> {
    const entitlements = await this.prisma.zoneEntitlement.findMany({
      where: { productCode: params.tierCode, productType: "tier", active: true }
    });

    if (entitlements.length === 0) return;

    await this.prisma.accessPermission.createMany({
      data: entitlements.map((e) => ({
        wristbandId: params.wristbandId,
        visitId: params.visitId,
        zoneCode: e.zoneCode,
        permissionStatus: "granted",
        validFrom: params.validFrom,
        validUntil: params.validUntil,
      })),
      skipDuplicates: true,
    });
  }
}
