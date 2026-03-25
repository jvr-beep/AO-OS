import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { AssignLockerDto } from "../dto/assign-locker.dto";
import { CreateLockerAccessDto } from "../dto/create-locker-access.dto";
import { CreateLockerDto } from "../dto/create-locker.dto";
import { EvaluateLockerPolicyDto } from "../dto/evaluate-locker-policy.dto";
import { ListLockerAccessEventsQueryDto } from "../dto/list-locker-access-events.query.dto";
import { ListLockerPolicyEventsQueryDto } from "../dto/list-locker-policy-events.query.dto";
import { ListLockersQueryDto } from "../dto/list-lockers.query.dto";
import { LockerAccessEventResponseDto } from "../dto/locker-access-event.response.dto";
import { LockerAssignmentResponseDto } from "../dto/locker-assignment.response.dto";
import { LockerPolicyEventResponseDto } from "../dto/locker-policy-event.response.dto";
import { LockerPolicyDecisionResponseDto } from "../dto/locker-policy-decision.response.dto";
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
  @Roles("front_desk", "operations", "admin")
  listLockers(@Query() query: ListLockersQueryDto): Promise<LockerResponseDto[]> {
    return this.lockersService.listLockers(query);
  }

  @Get("lockers/:id/access-events")
  @Roles("front_desk", "operations", "admin")
  listLockerAccessEvents(
    @Param("id") lockerId: string,
    @Query() query: ListLockerAccessEventsQueryDto
  ): Promise<LockerAccessEventResponseDto[]> {
    return this.lockersService.listLockerAccessEvents(lockerId, query);
  }

  @Post("lockers/assign")
  @Roles("front_desk", "operations", "admin")
  assignLocker(@Body() body: AssignLockerDto): Promise<LockerAssignmentResponseDto> {
    return this.lockersService.assignLocker(body);
  }

  @Post("lockers/policy/evaluate")
  @Roles("operations", "admin")
  evaluateLockerPolicy(@Body() body: EvaluateLockerPolicyDto): Promise<LockerPolicyDecisionResponseDto> {
    return this.lockersService.evaluateLockerPolicy(body);
  }

  @Get("lockers/policy/events")
  @Roles("operations", "admin")
  listLockerPolicyEvents(@Query() query: ListLockerPolicyEventsQueryDto): Promise<LockerPolicyEventResponseDto[]> {
    return this.lockersService.listLockerPolicyEvents(query);
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
  listMemberLockerAccessEvents(
    @Param("id") memberId: string,
    @Query() query: ListLockerAccessEventsQueryDto
  ): Promise<LockerAccessEventResponseDto[]> {
    return this.lockersService.listMemberLockerAccessEvents(memberId, query);
  }

  @Get("members/:id/locker-policy-events")
  @Roles("front_desk", "operations", "admin")
  listMemberLockerPolicyEvents(@Param("id") memberId: string): Promise<LockerPolicyEventResponseDto[]> {
    return this.lockersService.listLockerPolicyEvents({ memberId });
  }
}
