import { Module } from "@nestjs/common";
import { StaffAuditModule } from "../staff-audit/staff-audit.module";
import { StaffUsersController } from "./controllers/staff-users.controller";
import { GoogleWorkspaceProvisioningService } from "./services/google-workspace-provisioning.service";
import { StaffUsersService } from "./services/staff-users.service";

@Module({
  imports: [StaffAuditModule],
  controllers: [StaffUsersController],
  providers: [StaffUsersService, GoogleWorkspaceProvisioningService]
})
export class StaffUsersModule {}
