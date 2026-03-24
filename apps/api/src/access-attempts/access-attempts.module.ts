import { Module } from "@nestjs/common";
import { AccessAttemptsController } from "./controllers/access-attempts.controller";
import { AccessAttemptsService } from "./services/access-attempts.service";

@Module({
  controllers: [AccessAttemptsController],
  providers: [AccessAttemptsService]
})
export class AccessAttemptsModule {}
