import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { StaffAuditEventResponseDto } from "../dto/staff-audit-event.response.dto";
import { StaffAuditService } from "../services/staff-audit.service";

@Controller("staff-audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class StaffAuditController {
  constructor(private readonly staffAuditService: StaffAuditService) {}

  @Get()
  list(
    @Query("targetStaffUserId") targetStaffUserId?: string,
    @Query("eventType") eventType?: string,
    @Query("limit") limit?: string
  ): Promise<StaffAuditEventResponseDto[]> {
    return this.staffAuditService.list({
      targetStaffUserId,
      eventType,
      limit: typeof limit === "string" ? Number(limit) : undefined
    });
  }
}