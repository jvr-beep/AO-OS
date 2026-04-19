import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Stripe from "stripe";

/**
 * Thin wrapper around the Stripe SDK.
 * All business logic lives in BillingService — this class only knows about Stripe.
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe;

  onModuleInit(): void {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      this.logger.warn("STRIPE_SECRET_KEY not set — Stripe payments will not function");
      return;
    }
    this.client = new Stripe(key, { apiVersion: "2025-03-31.basil" });
    this.logger.log("Stripe client initialised");
  }

  get stripe(): Stripe {
    if (!this.client) throw new Error("Stripe not initialised — STRIPE_SECRET_KEY missing");
    return this.client;
  }

  // ── Customer ──────────────────────────────────────────────────────────────

  async createCustomer(params: { email: string; name: string; memberId: string }): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: { ao_member_id: params.memberId },
    });
  }

  async getOrCreateCustomer(params: { email: string; name: string; memberId: string }): Promise<Stripe.Customer> {
    const existing = await this.stripe.customers.search({
      query: `metadata["ao_member_id"]:"${params.memberId}"`,
      limit: 1,
    });
    if (existing.data.length > 0) return existing.data[0];
    return this.createCustomer(params);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    memberId: string;
    planCode: string;
  }): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { ao_member_id: params.memberId, ao_plan_code: params.planCode },
    });
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  // ── PaymentIntents (guest day passes + credit packs) ──────────────────────

  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    visitId?: string;
    guestId?: string;
    tierCode?: string;
    idempotencyKey?: string;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          ...(params.visitId ? { ao_visit_id: params.visitId } : {}),
          ...(params.guestId ? { ao_guest_id: params.guestId } : {}),
          ...(params.tierCode ? { ao_tier_code: params.tierCode } : {}),
        },
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    );
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
