import { Module } from "@nestjs/common";
import { AccessControlService } from "../access-control/access-control.service";
import { VisitSessionsController } from "./controllers/visit-sessions.controller";
import { VisitSessionsService } from "./services/visit-sessions.service";

@Module({
  controllers: [VisitSessionsController],
  providers: [VisitSessionsService, AccessControlService]
})
export class VisitSessionsModule {}
