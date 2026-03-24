import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CheckInEligibilityDto } from "./dto/check-in-eligibility.dto";
import { EligibilityDecisionDto } from "./dto/eligibility-decision.dto";

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
}
