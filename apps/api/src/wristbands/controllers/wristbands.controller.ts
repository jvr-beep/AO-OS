import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { ActivateCredentialDto } from "../dto/activate-credential.dto";
import { AssignWristbandDto } from "../dto/assign-wristband.dto";
import { CreateWristbandDto } from "../dto/create-wristband.dto";
import { IssueCredentialDto } from "../dto/issue-credential.dto";
import { ReplaceCredentialDto } from "../dto/replace-credential.dto";
import { SuspendCredentialDto } from "../dto/suspend-credential.dto";
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

  @Post("issue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  issueCredential(@Body() body: IssueCredentialDto): Promise<WristbandResponseDto> {
    return this.wristbandsService.issueCredential(body);
  }

  @Post("activate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  activateCredential(@Body() body: ActivateCredentialDto): Promise<WristbandResponseDto> {
    return this.wristbandsService.activateCredential(body);
  }

  @Post("suspend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  suspendCredential(@Body() body: SuspendCredentialDto): Promise<WristbandResponseDto> {
    return this.wristbandsService.suspendCredential(body);
  }

  @Post("replace")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  replaceCredential(@Body() body: ReplaceCredentialDto): Promise<WristbandResponseDto> {
    return this.wristbandsService.replaceCredential(body);
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
