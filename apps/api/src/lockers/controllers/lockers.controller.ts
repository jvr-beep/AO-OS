import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { AssignLockerDto } from "../dto/assign-locker.dto";
import { CreateLockerAccessDto } from "../dto/create-locker-access.dto";
import { CreateLockerDto } from "../dto/create-locker.dto";
import { LockerAccessEventResponseDto } from "../dto/locker-access-event.response.dto";
import { LockerAssignmentResponseDto } from "../dto/locker-assignment.response.dto";
import { LockerResponseDto } from "../dto/locker.response.dto";
import { UnassignLockerDto } from "../dto/unassign-locker.dto";
import { LockersService } from "../services/lockers.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Post("lockers")
  @Roles("operations", "admin")
  createLocker(@Body() body: CreateLockerDto): Promise<LockerResponseDto> {
    return this.lockersService.createLocker(body);
  }

  @Get("lockers")
  @Roles("operations", "admin")
  listLockers(): Promise<LockerResponseDto[]> {
    return this.lockersService.listLockers();
  }

  @Post("lockers/assign")
  @Roles("front_desk", "operations", "admin")
  assignLocker(@Body() body: AssignLockerDto): Promise<LockerAssignmentResponseDto> {
    return this.lockersService.assignLocker(body);
  }

  @Post("lockers/unassign")
  @Roles("front_desk", "operations", "admin")
  unassignLocker(@Body() body: UnassignLockerDto): Promise<LockerAssignmentResponseDto> {
    return this.lockersService.unassignLocker(body);
  }

  @Post("lockers/access")
  @Roles("front_desk", "operations", "admin")
  accessLocker(@Body() body: CreateLockerAccessDto): Promise<LockerAccessEventResponseDto> {
    return this.lockersService.accessLocker(body);
  }

  @Get("members/:id/locker-access-events")
  @Roles("front_desk", "operations", "admin")
  listMemberLockerAccessEvents(@Param("id") memberId: string): Promise<LockerAccessEventResponseDto[]> {
    return this.lockersService.listMemberLockerAccessEvents(memberId);
  }
}
