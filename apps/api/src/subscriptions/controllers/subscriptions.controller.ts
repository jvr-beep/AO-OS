import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateSubscriptionDto } from "../dto/create-subscription.dto";
import { SubscriptionResponseDto } from "../dto/subscription.response.dto";
import { SubscriptionsService } from "../services/subscriptions.service";

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post("subscriptions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createSubscription(@Body() body: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.createSubscription(body);
  }

  @Get("members/:id/subscriptions")
  listMemberSubscriptions(@Param("id") id: string): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionsService.listMemberSubscriptions(id);
  }
}