import { Module } from "@nestjs/common";
import { PresenceEventsController } from "./controllers/presence-events.controller";
import { PresenceEventsService } from "./services/presence-events.service";

@Module({
  controllers: [PresenceEventsController],
  providers: [PresenceEventsService]
})
export class PresenceEventsModule {}
