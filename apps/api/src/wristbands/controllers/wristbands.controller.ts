import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { AssignWristbandDto } from "../dto/assign-wristband.dto";
import { CreateWristbandDto } from "../dto/create-wristband.dto";
import { UnassignWristbandDto } from "../dto/unassign-wristband.dto";
import { WristbandAssignmentResponseDto } from "../dto/wristband-assignment.response.dto";
import { WristbandResponseDto } from "../dto/wristband.response.dto";
import { WristbandsService } from "../services/wristbands.service";

@Controller("wristbands")
export class WristbandsController {
  constructor(private readonly wristbandsService: WristbandsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  createWristband(@Body() body: CreateWristbandDto): Promise<WristbandResponseDto> {
    return this.wristbandsService.createWristband(body);
  }

  @Post("assign")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  assignWristband(@Body() body: AssignWristbandDto): Promise<WristbandAssignmentResponseDto> {
    return this.wristbandsService.assignWristband(body);
  }

  @Post("unassign")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  unassignWristband(@Body() body: UnassignWristbandDto): Promise<WristbandAssignmentResponseDto> {
    return this.wristbandsService.unassignWristband(body);
  }

  @Get(":id")
  getWristbandById(@Param("id") id: string): Promise<WristbandResponseDto> {
    return this.wristbandsService.getWristbandById(id);
  }

  @Get()
  listWristbands(): Promise<WristbandResponseDto[]> {
    return this.wristbandsService.listWristbands();
  }
}
