import { Module } from "@nestjs/common";
import { StaffAuditController } from "./controllers/staff-audit.controller";
import { StaffAuditService } from "./services/staff-audit.service";

@Module({
  controllers: [StaffAuditController],
  providers: [StaffAuditService],
  exports: [StaffAuditService]
})
export class StaffAuditModule {}