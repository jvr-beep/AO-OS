import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { SubscribeMemberDto } from "./dto/subscribe-member.dto";
import { CreateVisitPaymentIntentDto } from "./dto/create-visit-payment-intent.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * Billing API — staff/member-initiated billing operations.
 * Webhook events arrive at StripeWebhookController instead.
 *
 * POST /v1/billing/subscribe       — subscribe a member to a plan
 * POST /v1/billing/visit-payment   — create PaymentIntent for a guest visit
 */
@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("subscribe")
  @HttpCode(201)
  async subscribe(@Body() dto: SubscribeMemberDto) {
    return this.billingService.subscribeMember({
      memberId: dto.memberId,
      planCode: dto.planCode,
      stripePriceId: dto.stripePriceId,
    });
  }

  @Post("visit-payment")
  @HttpCode(201)
  async createVisitPayment(@Body() dto: CreateVisitPaymentIntentDto) {
    return this.billingService.createVisitPaymentIntent({
      visitId: dto.visitId,
      guestId: dto.guestId,
      tierCode: dto.tierCode,
      amountCents: dto.amountCents,
      currency: dto.currency,
    });
  }
}
