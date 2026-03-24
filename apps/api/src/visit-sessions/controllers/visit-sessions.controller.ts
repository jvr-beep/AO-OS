import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CheckOutVisitSessionDto } from "../dto/check-out-visit-session.dto";
import { CreateVisitSessionDto } from "../dto/create-visit-session.dto";
import { VisitSessionResponseDto } from "../dto/visit-session.response.dto";
import { VisitSessionsService } from "../services/visit-sessions.service";

@Controller()
export class VisitSessionsController {
  constructor(private readonly visitSessionsService: VisitSessionsService) {}

  @Post("visit-sessions/check-in")
  checkIn(@Body() body: CreateVisitSessionDto): Promise<VisitSessionResponseDto> {
    return this.visitSessionsService.checkIn(body);
  }

  @Post("visit-sessions/check-out")
  checkOut(@Body() body: CheckOutVisitSessionDto): Promise<VisitSessionResponseDto> {
    return this.visitSessionsService.checkOut(body);
  }

  @Get("members/:id/visit-sessions")
  listMemberSessions(@Param("id") id: string): Promise<VisitSessionResponseDto[]> {
    return this.visitSessionsService.listMemberSessions(id);
  }
}
