import { Module } from "@nestjs/common";
import { EventsPollingController } from "./controllers/events-polling.controller";
import { EventsPollingService } from "./services/events-polling.service";

@Module({
  controllers: [EventsPollingController],
  providers: [EventsPollingService],
  exports: [EventsPollingService]
})
export class EventsPollingModule {}
