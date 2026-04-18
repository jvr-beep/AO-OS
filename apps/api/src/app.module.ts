import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
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
import { ExternalAuthModule } from "./external-auth/external-auth.module";
import { IdentityModule } from "./identity/identity.module";
import { StaffUsersModule } from "./staff-users/staff-users.module";
import { StaffAuditModule } from "./staff-audit/staff-audit.module";
import { WristbandTransactionsModule } from "./wristband-transactions/wristband-transactions.module";
import { LockersModule } from "./lockers/lockers.module";
import { MemberAccountModule } from "./member-account/member-account.module";
import { FloorPlansModule } from "./floor-plans/floor-plans.module";
import { RoomsModule } from "./rooms/rooms.module";
import { RoomBookingsModule } from "./room-bookings/room-bookings.module";
import { CleaningModule } from "./cleaning/cleaning.module";
import { EventsPollingModule } from "./events-polling/events-polling.module";
import { GuestsModule } from "./guests/guests.module";
import { WaiversModule } from "./waivers/waivers.module";
import { CatalogModule } from "./catalog/catalog.module";
import { InventoryModule } from "./inventory/inventory.module";
import { BookingsModule } from "./bookings/bookings.module";
import { VisitsModule } from "./visits/visits.module";
import { FoliosModule } from "./folios/folios.module";
import { OrchestratorsModule } from "./orchestrators/orchestrators.module";
import { GuestAccessModule } from "./guest-access/guest-access.module";
import { OpsModule } from "./ops/ops.module";
import { VoiceModule } from "./voice/voice.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: "global", ttl: 60_000, limit: 120 },
      { name: "auth", ttl: 60_000, limit: 10 }
    ]),
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
    ExternalAuthModule,
    IdentityModule,
    StaffUsersModule,
    StaffAuditModule,
    WristbandTransactionsModule,
    LockersModule,
    MemberAccountModule,
    FloorPlansModule,
    RoomsModule,
    RoomBookingsModule,
    CleaningModule,
    EventsPollingModule,
    GuestsModule,
    WaiversModule,
    CatalogModule,
    InventoryModule,
    BookingsModule,
    VisitsModule,
    FoliosModule,
    OrchestratorsModule,
    GuestAccessModule,
    OpsModule,
    VoiceModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule {}