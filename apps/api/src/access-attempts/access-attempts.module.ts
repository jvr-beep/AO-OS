import { Module } from "@nestjs/common";
import { AccessControlModule } from "../access-control/access-control.module";
import { AccessAttemptsController } from "./controllers/access-attempts.controller";
import { AccessAttemptsService } from "./services/access-attempts.service";

@Module({
  imports: [AccessControlModule],
  controllers: [AccessAttemptsController],
  providers: [AccessAttemptsService]
})
export class AccessAttemptsModule {}
