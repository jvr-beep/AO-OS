import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { StaffAuditModule } from "../staff-audit/staff-audit.module";
import { MembersController } from "./controllers/members.controller";
import { MemberSelfController } from "./controllers/member-self.controller";
import { MembersService } from "./services/members.service";
import { QrTokenService } from "../kiosk/qr-token.service";

@Module({
  imports: [StaffAuditModule, BookingsModule],
  controllers: [MembersController, MemberSelfController],
  providers: [MembersService, QrTokenService],
})
export class MembersModule {}
