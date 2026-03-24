import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreatePresenceEventDto } from "../dto/create-presence-event.dto";
import { PresenceEventResponseDto } from "../dto/presence-event.response.dto";
import { PresenceEventsService } from "../services/presence-events.service";

@Controller()
export class PresenceEventsController {
  constructor(private readonly presenceEventsService: PresenceEventsService) {}

  @Post("presence-events")
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
