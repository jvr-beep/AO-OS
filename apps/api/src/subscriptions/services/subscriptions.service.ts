import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSubscriptionDto } from "../dto/create-subscription.dto";
import { SubscriptionResponseDto } from "../dto/subscription.response.dto";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubscription(input: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const member = await this.prisma.member.findUnique({
      where: { id: input.memberId }
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: input.membershipPlanId }
    });

    if (!plan) {
      throw new NotFoundException("Membership plan not found");
    }

    const created = await this.prisma.membershipSubscription.create({
      data: {
        memberId: input.memberId,
        membershipPlanId: input.membershipPlanId,
        billingProvider: input.billingProvider,
        billingProviderCustomerId: input.billingProviderCustomerId,
        status: input.status,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        startDate: new Date(input.startDate),
        currentPeriodStart: input.currentPeriodStart ? new Date(input.currentPeriodStart) : null,
        currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null
      }
    });

    return {
      id: created.id,
      memberId: created.memberId,
      membershipPlanId: created.membershipPlanId,
      billingProvider: created.billingProvider,
      billingProviderCustomerId: created.billingProviderCustomerId,
      status: created.status,
      cancelAtPeriodEnd: created.cancelAtPeriodEnd,
      startDate: created.startDate.toISOString(),
      currentPeriodStart: created.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: created.currentPeriodEnd?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString()
    };
  }

  async listMemberSubscriptions(memberId: string): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.prisma.membershipSubscription.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" }
    });

    return subscriptions.map((subscription) => ({
      id: subscription.id,
      memberId: subscription.memberId,
      membershipPlanId: subscription.membershipPlanId,
      billingProvider: subscription.billingProvider,
      billingProviderCustomerId: subscription.billingProviderCustomerId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      startDate: subscription.startDate.toISOString(),
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString()
    }));
  }
}