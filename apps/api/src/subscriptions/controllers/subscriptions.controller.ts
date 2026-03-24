import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateSubscriptionDto } from "../dto/create-subscription.dto";
import { SubscriptionResponseDto } from "../dto/subscription.response.dto";
import { SubscriptionsService } from "../services/subscriptions.service";

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post("subscriptions")
  createSubscription(@Body() body: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.createSubscription(body);
  }

  @Get("members/:id/subscriptions")
  listMemberSubscriptions(@Param("id") id: string): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionsService.listMemberSubscriptions(id);
  }
}