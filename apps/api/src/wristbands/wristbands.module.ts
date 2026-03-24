import { Module } from "@nestjs/common";
import { WristbandsController } from "./controllers/wristbands.controller";
import { WristbandsService } from "./services/wristbands.service";

@Module({
  controllers: [WristbandsController],
  providers: [WristbandsService]
})
export class WristbandsModule {}
