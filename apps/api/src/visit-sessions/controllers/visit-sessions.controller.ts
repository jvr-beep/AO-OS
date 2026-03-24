import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CheckOutVisitSessionDto } from "../dto/check-out-visit-session.dto";
import { CreateVisitSessionDto } from "../dto/create-visit-session.dto";
import { VisitSessionResponseDto } from "../dto/visit-session.response.dto";
import { VisitSessionsService } from "../services/visit-sessions.service";

@Controller()
export class VisitSessionsController {
  constructor(private readonly visitSessionsService: VisitSessionsService) {}

  @Post("visit-sessions/check-in")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  checkIn(@Body() body: CreateVisitSessionDto): Promise<VisitSessionResponseDto> {
    return this.visitSessionsService.checkIn(body);
  }

  @Post("visit-sessions/check-out")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  checkOut(@Body() body: CheckOutVisitSessionDto): Promise<VisitSessionResponseDto> {
    return this.visitSessionsService.checkOut(body);
  }

  @Get("members/:id/visit-sessions")
  listMemberSessions(@Param("id") id: string): Promise<VisitSessionResponseDto[]> {
    return this.visitSessionsService.listMemberSessions(id);
  }
}
