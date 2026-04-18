import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "./stripe.service";
import Stripe from "stripe";
import { randomUUID } from "crypto";

/**
 * Business logic layer for all billing operations.
 *
 * Member subscriptions:   subscribeMember()  → Stripe customer + subscription
 * Guest day passes:       createVisitPaymentIntent() → Stripe PaymentIntent
 * Webhook sync:           handleSubscriptionEvent() / handlePaymentIntentEvent()
 * Credit pack purchase:   purchaseCreditPack()
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  // ── Member Subscriptions ──────────────────────────────────────────────────

  /**
   * Subscribe a member to a plan.
   * Returns the Stripe client_secret so the frontend can confirm the payment method.
   */
  async subscribeMember(params: {
    memberId: string;
    planCode: string;
    stripePriceId: string;
  }): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    const member = await this.prisma.member.findUnique({
      where: { id: params.memberId },
      include: { subscriptions: { where: { status: { in: ["active", "trialing"] } } } },
    });
    if (!member) throw new NotFoundException("Member not found");
    if (member.subscriptions.length > 0) {
      throw new ConflictException("Member already has an active subscription");
    }
    if (!member.email) throw new BadRequestException("Member email required for billing");

    const plan = await this.prisma.membershipPlan.findUnique({ where: { code: params.planCode } });
    if (!plan || !plan.active) throw new NotFoundException("Membership plan not found or inactive");

    // Get or create Stripe customer
    const customer = await this.stripe.getOrCreateCustomer({
      email: member.email,
      name: member.displayName ?? member.firstName ?? member.alias ?? "AO Member",
      memberId: params.memberId,
    });

    // Create Stripe subscription
    const stripeSub = await this.stripe.createSubscription({
      customerId: customer.id,
      priceId: params.stripePriceId,
      memberId: params.memberId,
      planCode: params.planCode,
    });

    // Persist subscription record
    const subscription = await this.prisma.membershipSubscription.create({
      data: {
        memberId: params.memberId,
        membershipPlanId: plan.id,
        billingProvider: "stripe",
        billingProviderCustomerId: customer.id,
        status: stripeSub.status === "active" ? "active" : "trialing",
        cancelAtPeriodEnd: false,
        startDate: new Date(),
      },
    });

    const invoice = stripeSub.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    this.logger.log(`Subscription created for member ${params.memberId} plan ${params.planCode}`);

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
    };
  }

  // ── Guest Day Pass / Visit Payment ────────────────────────────────────────

  /**
   * Creates a Stripe PaymentIntent for a guest visit (one-time day pass or credit pack).
   * Returns client_secret for frontend payment confirmation.
   */
  async createVisitPaymentIntent(params: {
    visitId: string;
    guestId: string;
    tierCode: string;
    amountCents: number;
    currency?: string;
  }): Promise<{ paymentIntentId: string; clientSecret: string }> {
    const visit = await this.prisma.visit.findUnique({
      where: { id: params.visitId },
      include: { folio: true },
    });
    if (!visit) throw new NotFoundException("Visit not found");
    if (!visit.folio) throw new ConflictException("Visit has no folio — cannot create payment");

    const idempotencyKey = `visit_pi_${params.visitId}`;
    const currency = params.currency ?? "cad";

    const intent = await this.stripe.createPaymentIntent({
      amountCents: params.amountCents,
      currency,
      visitId: params.visitId,
      guestId: params.guestId,
      tierCode: params.tierCode,
      idempotencyKey,
    });

    // Record the intent in PaymentTransaction
    await this.prisma.paymentTransaction.create({
      data: {
        folioId: visit.folio.id,
        visitId: params.visitId,
        paymentProvider: "stripe",
        providerPaymentIntentId: intent.id,
        transactionType: "authorize",
        amountCents: params.amountCents,
        status: intent.status,
        idempotencyKey,
      },
    });

    this.logger.log(`PaymentIntent ${intent.id} created for visit ${params.visitId}`);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
    };
  }

  // ── Webhook Handlers ──────────────────────────────────────────────────────

  async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    const stripeSub = event.data.object as Stripe.Subscription;
    const memberId = stripeSub.metadata?.ao_member_id;
    if (!memberId) return;

    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      paused: "paused",
      canceled: "cancelled",
      cancelled: "cancelled",
      unpaid: "past_due",
      incomplete: "trialing",
      incomplete_expired: "cancelled",
    };

    const mappedStatus = statusMap[stripeSub.status] ?? "past_due";

    const existing = await this.prisma.membershipSubscription.findFirst({
      where: { memberId, billingProvider: "stripe" },
    });

    if (!existing) {
      this.logger.warn(`Stripe subscription event for unknown member ${memberId}`);
      return;
    }

    await this.prisma.membershipSubscription.update({
      where: { id: existing.id },
      data: {
        status: mappedStatus as any,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        currentPeriodStart: stripeSub.current_period_start
          ? new Date(stripeSub.current_period_start * 1000)
          : undefined,
        currentPeriodEnd: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000)
          : undefined,
        pausedAt: mappedStatus === "paused" && !existing.pausedAt ? new Date() : undefined,
        resumedAt: mappedStatus === "active" && existing.pausedAt ? new Date() : undefined,
      },
    });

    this.logger.log(`Subscription ${existing.id} synced → ${mappedStatus}`);
  }

  async handlePaymentIntentEvent(event: Stripe.Event): Promise<void> {
    const intent = event.data.object as Stripe.PaymentIntent;

    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { providerPaymentIntentId: intent.id },
      include: { folio: true },
    });
    if (!tx) return;

    const statusMap: Record<string, string> = {
      succeeded: "succeeded",
      payment_failed: "failed",
      canceled: "cancelled",
      processing: "processing",
    };

    const newStatus = event.type === "payment_intent.succeeded"
      ? "succeeded"
      : event.type === "payment_intent.payment_failed"
      ? "failed"
      : intent.status;

    const pm = intent.payment_method as Stripe.PaymentMethod | null;
    const card = typeof pm === "object" && pm?.type === "card" ? pm.card : null;

    await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        status: newStatus,
        transactionType: newStatus === "succeeded" ? "capture" : tx.transactionType,
        cardBrand: card?.brand ?? tx.cardBrand,
        cardLast4: card?.last4 ?? tx.cardLast4,
        providerResponse: intent as any,
      },
    });

    if (newStatus === "succeeded" && tx.folio) {
      await this.prisma.folio.update({
        where: { id: tx.folio.id },
        data: {
          amountPaidCents: { increment: tx.amountCents },
          paymentStatus: "paid",
          balanceDueCents: 0,
        },
      });

      // Advance the visit to awaiting_assignment if currently awaiting_payment
      const visit = await this.prisma.visit.findUnique({ where: { id: tx.visitId } });
      if (visit?.status === "awaiting_payment") {
        await this.prisma.visit.update({
          where: { id: tx.visitId },
          data: {
            status: "ready_for_assignment",
            paymentStatus: "paid",
            version: { increment: 1 },
          },
        });
        await this.prisma.visitStatusHistory.create({
          data: {
            visitId: tx.visitId,
            previousStatus: "awaiting_payment",
            newStatus: "ready_for_assignment",
            reasonCode: "payment_confirmed",
          },
        });
      }
    }

    this.logger.log(`PaymentTransaction ${tx.id} synced → ${newStatus}`);
  }

  // ── Credit Pack Purchase ──────────────────────────────────────────────────

  /**
   * Records a credit pack purchase on the member's account ledger.
   * Called after PaymentIntent for a credit pack succeeds.
   */
  async recordCreditPackPurchase(params: {
    memberId: string;
    packCode: string;
    creditCount: number;
    amountPaidCents: number;
    expiresAt: Date;
  }): Promise<void> {
    const description = `Credit pack: ${params.packCode} (${params.creditCount} credits, expires ${params.expiresAt.toISOString().slice(0, 10)})`;

    await this.prisma.memberAccountEntry.create({
      data: {
        memberId: params.memberId,
        entryType: "credit",
        amount: (params.creditCount * 100).toString(), // stored as unit credits × 100 for decimal precision
        currency: "CAD",
        description,
        status: "posted",
        sourceType: "membership",
        sourceReference: params.packCode,
        occurredAt: new Date(),
      },
    });

    this.logger.log(`Credit pack ${params.packCode} recorded for member ${params.memberId} — ${params.creditCount} credits`);
  }
}
