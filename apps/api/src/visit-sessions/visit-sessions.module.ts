import { Module } from "@nestjs/common";
import { VisitSessionsController } from "./controllers/visit-sessions.controller";
import { VisitSessionsService } from "./services/visit-sessions.service";

@Module({
  controllers: [VisitSessionsController],
  providers: [VisitSessionsService]
})
export class VisitSessionsModule {}
