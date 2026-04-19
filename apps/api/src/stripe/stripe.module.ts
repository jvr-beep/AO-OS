import { Module } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [StripeService, BillingService],
  exports: [StripeService, BillingService],
})
export class StripeModule {}
