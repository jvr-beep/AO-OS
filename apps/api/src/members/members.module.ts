import { Module } from "@nestjs/common";
import { StaffAuditModule } from "../staff-audit/staff-audit.module";
import { MembersController } from "./controllers/members.controller";
import { MembersService } from "./services/members.service";

@Module({
  imports: [StaffAuditModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
