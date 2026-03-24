import { Module } from "@nestjs/common";
import { AccessControlModule } from "../access-control/access-control.module";
import { VisitSessionsController } from "./controllers/visit-sessions.controller";
import { VisitSessionsService } from "./services/visit-sessions.service";

@Module({
  imports: [AccessControlModule],
  controllers: [VisitSessionsController],
  providers: [VisitSessionsService]
})
export class VisitSessionsModule {}
