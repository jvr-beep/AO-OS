import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtPayload } from "../../auth/strategies/jwt.strategy";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateStaffUserDto } from "../dto/create-staff-user.dto";
import { SetRoleDto } from "../dto/set-role.dto";
import { StaffUserResponseDto } from "../dto/staff-user.response.dto";
import { UpdateStaffPasswordDto } from "../dto/update-staff-password.dto";
import { StaffUsersService } from "../services/staff-users.service";

@Controller("staff-users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class StaffUsersController {
  constructor(private readonly staffUsersService: StaffUsersService) {}

  @Post()
  createStaffUser(@Body() body: CreateStaffUserDto): Promise<StaffUserResponseDto> {
    return this.staffUsersService.createStaffUser(body);
  }

  @Get()
  listStaffUsers(
    @Query("role") role?: string,
    @Query("active") active?: string
  ): Promise<StaffUserResponseDto[]> {
    return this.staffUsersService.listStaffUsers({ role, active });
  }

  @Get(":id")
  getStaffUserById(@Param("id") id: string): Promise<StaffUserResponseDto> {
    return this.staffUsersService.getStaffUserById(id);
  }

  @Patch(":id/role")
  setRole(@Param("id") id: string, @Body() body: SetRoleDto): Promise<StaffUserResponseDto> {
    return this.staffUsersService.setRole(id, body.role);
  }

  @Patch(":id/deactivate")
  deactivate(
    @Param("id") id: string,
    @Req() req: { user: JwtPayload }
  ): Promise<StaffUserResponseDto> {
    return this.staffUsersService.deactivate(id, req.user.sub);
  }

  @Patch(":id/reactivate")
  reactivate(@Param("id") id: string): Promise<StaffUserResponseDto> {
    return this.staffUsersService.reactivate(id);
  }

  @Patch(":id/password")
  updatePassword(
    @Param("id") id: string,
    @Body() body: UpdateStaffPasswordDto
  ): Promise<StaffUserResponseDto> {
    return this.staffUsersService.updatePassword(id, body.password);
  }
}
