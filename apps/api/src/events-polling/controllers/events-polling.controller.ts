import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { EventsPollingService, PolledEventsResponse } from "../services/events-polling.service";

@Controller("events")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "operations")
export class EventsPollingController {
  constructor(private readonly eventsPollingService: EventsPollingService) {}

  @Get("poll")
  async poll(
    @Query("since") since?: string
  ): Promise<PolledEventsResponse> {
    return this.eventsPollingService.pollEvents(since);
  }
}
