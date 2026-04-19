import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import { StripeService } from "./stripe.service";
import { BillingService } from "./billing.service";

/**
 * Stripe webhook endpoint.
 *
 * Must receive raw request body for signature verification — do NOT add
 * validation pipes or body transformers to this controller.
 *
 * Route: POST /v1/billing/webhook
 * Auth:  Stripe-Signature header (STRIPE_WEBHOOK_SECRET)
 */
@Controller("billing")
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BillingService,
  ) {}

  @Post("webhook")
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") sig: string,
  ): Promise<{ received: boolean }> {
    if (!sig) throw new BadRequestException("Missing Stripe-Signature header");
    if (!req.rawBody) throw new BadRequestException("Raw body not available");

    let event: ReturnType<StripeService["constructWebhookEvent"]>;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody, sig);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook error: ${err.message}`);
    }

    this.logger.log(`Stripe event received: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.billingService.handleSubscriptionEvent(event);
        break;

      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        await this.billingService.handlePaymentIntentEvent(event);
        break;

      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}
