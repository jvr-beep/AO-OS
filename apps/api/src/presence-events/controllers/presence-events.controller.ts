import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreatePresenceEventDto } from "../dto/create-presence-event.dto";
import { PresenceEventResponseDto } from "../dto/presence-event.response.dto";
import { PresenceEventsService } from "../services/presence-events.service";

@Controller()
export class PresenceEventsController {
  constructor(private readonly presenceEventsService: PresenceEventsService) {}

  @Post("presence-events")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createPresenceEvent(@Body() body: CreatePresenceEventDto): Promise<PresenceEventResponseDto> {
    return this.presenceEventsService.createPresenceEvent(body);
  }

  @Get("visit-sessions/:id/presence-events")
  listVisitSessionPresenceEvents(@Param("id") id: string): Promise<PresenceEventResponseDto[]> {
    return this.presenceEventsService.listVisitSessionPresenceEvents(id);
  }

  @Get("members/:id/presence-events")
  listMemberPresenceEvents(@Param("id") id: string): Promise<PresenceEventResponseDto[]> {
    return this.presenceEventsService.listMemberPresenceEvents(id);
  }
}
