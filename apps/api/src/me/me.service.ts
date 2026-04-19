import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Self-service data layer for the member portal.
 * All methods scope to the authenticated memberId — no cross-member access possible.
 */
@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        profile: true,
        subscriptions: {
          where: { status: { in: ["active", "trialing", "past_due"] } },
          include: { membershipPlan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!member) throw new NotFoundException("Member not found");

    const subscription = member.subscriptions[0] ?? null;

    return {
      id: member.id,
      publicMemberNumber: member.publicMemberNumber,
      displayName: member.displayName ?? member.firstName ?? member.alias ?? null,
      firstName: member.firstName ?? null,
      lastName: member.lastName ?? null,
      email: member.email ?? null,
      status: member.status,
      preferredName: member.profile?.preferredName ?? null,
      pronouns: member.profile?.pronouns ?? null,
      subscription: subscription
        ? {
            id: subscription.id,
            planCode: subscription.membershipPlan.code,
            planName: subscription.membershipPlan.name,
            tierRank: subscription.membershipPlan.tierRank,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  async getActiveVisit(memberId: string) {
    // Find the most recent active visit for this member via guest linkage
    const visit = await this.prisma.visit.findFirst({
      where: {
        guest: { visits: { some: {} } }, // guard — joins via guest
        status: { in: ["checked_in", "active", "extended"] },
      },
      include: { tier: true, folio: true },
      orderBy: { createdAt: "desc" },
    });

    // Fallback: use member's linked wristband to find active visit
    const wristbandAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: { memberId, active: true },
      include: {
        wristband: {
          include: {
            wristbandLinks: {
              where: { linkStatus: "active" },
              include: { visit: { include: { tier: true } } },
              take: 1,
            },
          },
        },
      },
    });

    const linkedVisit = wristbandAssignment?.wristband?.wristbandLinks?.[0]?.visit ?? null;

    if (!linkedVisit) return null;

    return {
      id: linkedVisit.id,
      status: linkedVisit.status,
      tierName: linkedVisit.tier.name,
      startTime: linkedVisit.startTime?.toISOString() ?? null,
      scheduledEndTime: linkedVisit.scheduledEndTime?.toISOString() ?? null,
      durationMinutes: linkedVisit.durationMinutes,
      visitMode: (linkedVisit as any).visitMode ?? null,
    };
  }

  async getVisitHistory(memberId: string, limit = 20) {
    const wristbandAssignments = await this.prisma.wristbandAssignment.findMany({
      where: { memberId },
      select: { wristbandId: true },
    });

    if (wristbandAssignments.length === 0) return [];

    const wristbandIds = wristbandAssignments.map((w) => w.wristbandId);

    const links = await this.prisma.wristbandLink.findMany({
      where: { wristbandId: { in: wristbandIds } },
      include: {
        visit: {
          include: { tier: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return links
      .filter((l) => l.visit)
      .map((l) => ({
        id: l.visit!.id,
        status: l.visit!.status,
        tierName: l.visit!.tier.name,
        visitMode: (l.visit as any).visitMode ?? null,
        startTime: l.visit!.startTime?.toISOString() ?? null,
        actualEndTime: l.visit!.actualEndTime?.toISOString() ?? null,
        durationMinutes: l.visit!.durationMinutes,
        createdAt: l.visit!.createdAt.toISOString(),
      }));
  }

  async getSubscription(memberId: string) {
    const subscription = await this.prisma.membershipSubscription.findFirst({
      where: { memberId },
      include: { membershipPlan: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (!subscription) return null;

    return {
      id: subscription.id,
      planCode: subscription.membershipPlan.code,
      planName: subscription.membershipPlan.name,
      description: subscription.membershipPlan.description,
      tierRank: subscription.membershipPlan.tierRank,
      priceAmount: subscription.membershipPlan.priceAmount.toString(),
      currency: subscription.membershipPlan.currency,
      billingInterval: subscription.membershipPlan.billingInterval,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async updateProfile(memberId: string, dto: { preferredName?: string; pronouns?: string; marketingOptInEmail?: boolean }) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException("Member not found");

    await this.prisma.memberProfile.upsert({
      where: { memberId },
      update: {
        ...(dto.preferredName !== undefined ? { preferredName: dto.preferredName } : {}),
        ...(dto.pronouns !== undefined ? { pronouns: dto.pronouns } : {}),
        ...(dto.marketingOptInEmail !== undefined ? { marketingOptInEmail: dto.marketingOptInEmail } : {}),
      },
      create: {
        memberId,
        preferredName: dto.preferredName ?? null,
        pronouns: dto.pronouns ?? null,
        marketingOptInEmail: dto.marketingOptInEmail ?? false,
      },
    });

    return { success: true };
  }
}
