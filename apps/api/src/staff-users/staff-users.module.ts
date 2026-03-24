import { Module } from "@nestjs/common";
import { StaffAuditModule } from "../staff-audit/staff-audit.module";
import { StaffUsersController } from "./controllers/staff-users.controller";
import { StaffUsersService } from "./services/staff-users.service";

@Module({
  imports: [StaffAuditModule],
  controllers: [StaffUsersController],
  providers: [StaffUsersService]
})
export class StaffUsersModule {}
