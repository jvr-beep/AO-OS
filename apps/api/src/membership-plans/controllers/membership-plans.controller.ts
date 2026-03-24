import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateMembershipPlanDto } from "../dto/create-membership-plan.dto";
import { MembershipPlanResponseDto } from "../dto/membership-plan.response.dto";
import { MembershipPlansService } from "../services/membership-plans.service";

@Controller("membership-plans")
export class MembershipPlansController {
  constructor(private readonly membershipPlansService: MembershipPlansService) {}

  @Post()
  createPlan(@Body() body: CreateMembershipPlanDto): Promise<MembershipPlanResponseDto> {
    return this.membershipPlansService.createPlan(body);
  }

  @Get()
  listPlans(): Promise<MembershipPlanResponseDto[]> {
    return this.membershipPlansService.listPlans();
  }
}