import { Module } from "@nestjs/common";
import { WaiversController } from "./controllers/waivers.controller";
import { WaiversService } from "./services/waivers.service";

@Module({
  controllers: [WaiversController],
  providers: [WaiversService]
})
export class WaiversModule {}
