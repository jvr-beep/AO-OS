import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { MembersModule } from "./members/members.module";
import { MembershipPlansModule } from "./membership-plans/membership-plans.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { WristbandsModule } from "./wristbands/wristbands.module";

@Module({
  imports: [PrismaModule, HealthModule, MembersModule, MembershipPlansModule, SubscriptionsModule, WristbandsModule]
})
export class AppModule {}