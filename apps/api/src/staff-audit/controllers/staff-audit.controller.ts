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
    @Query("actorStaffUserId") actorStaffUserId?: string,
    @Query("targetStaffUserId") targetStaffUserId?: string,
    @Query("action") action?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit?: string
  ): Promise<StaffAuditEventResponseDto[]> {
    return this.staffAuditService.list({
      actorStaffUserId,
      targetStaffUserId,
      action,
      startDate,
      endDate,
      limit: typeof limit === "string" ? Number(limit) : undefined
    });
  }
}