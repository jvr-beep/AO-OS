import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateMembershipPlanDto } from "../dto/create-membership-plan.dto";
import { MembershipPlanResponseDto } from "../dto/membership-plan.response.dto";
import { MembershipPlansService } from "../services/membership-plans.service";

@Controller("membership-plans")
export class MembershipPlansController {
  constructor(private readonly membershipPlansService: MembershipPlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  createPlan(@Body() body: CreateMembershipPlanDto): Promise<MembershipPlanResponseDto> {
    return this.membershipPlansService.createPlan(body);
  }

  @Get()
  listPlans(): Promise<MembershipPlanResponseDto[]> {
    return this.membershipPlansService.listPlans();
  }
}