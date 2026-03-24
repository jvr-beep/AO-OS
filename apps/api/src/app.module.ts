import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { MembersModule } from "./members/members.module";
import { MembershipPlansModule } from "./membership-plans/membership-plans.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { WristbandsModule } from "./wristbands/wristbands.module";
import { AccessAttemptsModule } from "./access-attempts/access-attempts.module";

@Module({
  imports: [PrismaModule, HealthModule, MembersModule, MembershipPlansModule, SubscriptionsModule, WristbandsModule, AccessAttemptsModule]
})
export class AppModule {}