import { Module } from "@nestjs/common";
import { StaffAuditModule } from "../staff-audit/staff-audit.module";
import { MembersController } from "./controllers/members.controller";
import { MemberSelfController } from "./controllers/member-self.controller";
import { MembersService } from "./services/members.service";
import { QrTokenService } from "../kiosk/qr-token.service";

@Module({
  imports: [StaffAuditModule],
  controllers: [MembersController, MemberSelfController],
  providers: [MembersService, QrTokenService],
})
export class MembersModule {}
