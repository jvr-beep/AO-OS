import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { MembersModule } from "./members/members.module";
import { MembershipPlansModule } from "./membership-plans/membership-plans.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { WristbandsModule } from "./wristbands/wristbands.module";
import { AccessControlModule } from "./access-control/access-control.module";
import { AccessAttemptsModule } from "./access-attempts/access-attempts.module";
import { VisitSessionsModule } from "./visit-sessions/visit-sessions.module";
import { PresenceEventsModule } from "./presence-events/presence-events.module";
import { AuthModule } from "./auth/auth.module";
import { StaffUsersModule } from "./staff-users/staff-users.module";
import { StaffAuditModule } from "./staff-audit/staff-audit.module";
import { WristbandTransactionsModule } from "./wristband-transactions/wristband-transactions.module";
import { LockersModule } from "./lockers/lockers.module";
import { MemberAccountModule } from "./member-account/member-account.module";
import { FloorPlansModule } from "./floor-plans/floor-plans.module";
import { RoomsModule } from "./rooms/rooms.module";
import { RoomBookingsModule } from "./room-bookings/room-bookings.module";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    MembersModule,
    MembershipPlansModule,
    SubscriptionsModule,
    WristbandsModule,
    AccessControlModule,
    AccessAttemptsModule,
    VisitSessionsModule,
    PresenceEventsModule,
    AuthModule,
    StaffUsersModule,
    StaffAuditModule,
    WristbandTransactionsModule,
    LockersModule,
    MemberAccountModule,
    FloorPlansModule,
    RoomsModule,
    RoomBookingsModule
  ]
})
export class AppModule {}