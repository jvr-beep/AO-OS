import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMembershipPlanDto } from "../dto/create-membership-plan.dto";
import { MembershipPlanResponseDto } from "../dto/membership-plan.response.dto";

@Injectable()
export class MembershipPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(input: CreateMembershipPlanDto): Promise<MembershipPlanResponseDto> {
    const created = await this.prisma.membershipPlan.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        tierRank: input.tierRank,
        billingInterval: input.billingInterval,
        priceAmount: input.priceAmount,
        currency: input.currency,
        active: input.active ?? true
      }
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description,
      tierRank: created.tierRank,
      billingInterval: created.billingInterval,
      priceAmount: created.priceAmount.toString(),
      currency: created.currency,
      active: created.active,
      createdAt: created.createdAt.toISOString()
    };
  }

  async listPlans(): Promise<MembershipPlanResponseDto[]> {
    const plans = await this.prisma.membershipPlan.findMany({
      orderBy: [{ tierRank: "asc" }, { createdAt: "asc" }]
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      tierRank: plan.tierRank,
      billingInterval: plan.billingInterval,
      priceAmount: plan.priceAmount.toString(),
      currency: plan.currency,
      active: plan.active,
      createdAt: plan.createdAt.toISOString()
    }));
  }
}