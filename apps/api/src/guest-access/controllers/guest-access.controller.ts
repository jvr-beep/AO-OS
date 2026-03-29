import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { GrantAccessPermissionDto } from "../dto/grant-access-permission.dto";
import { LogGuestAccessEventDto } from "../dto/log-guest-access-event.dto";
import { GuestAccessService } from "../services/guest-access.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("guest-access")
export class GuestAccessController {
  constructor(private readonly guestAccessService: GuestAccessService) {}

  @Post("permissions")
  @Roles("front_desk", "operations", "admin")
  grantPermission(@Body() dto: GrantAccessPermissionDto) {
    return this.guestAccessService.grantPermission(dto);
  }

  @Post("permissions/:permissionId/revoke")
  @Roles("operations", "admin")
  revokePermission(@Param("permissionId", ParseUUIDPipe) permissionId: string) {
    return this.guestAccessService.revokePermission(permissionId);
  }

  @Get("visits/:visitId/permissions")
  @Roles("front_desk", "operations", "admin")
  listVisitPermissions(@Param("visitId", ParseUUIDPipe) visitId: string) {
    return this.guestAccessService.listVisitPermissions(visitId);
  }

  @Post("events")
  @Roles("front_desk", "operations", "admin")
  logAccessEvent(@Body() dto: LogGuestAccessEventDto) {
    return this.guestAccessService.logAccessEvent(dto);
  }

  @Get("visits/:visitId/events")
  @Roles("front_desk", "operations", "admin")
  listVisitAccessEvents(@Param("visitId", ParseUUIDPipe) visitId: string) {
    return this.guestAccessService.listVisitAccessEvents(visitId);
  }
}
