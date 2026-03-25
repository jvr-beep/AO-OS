import { Module } from "@nestjs/common";
import { FloorPlansController } from "./controllers/floor-plans.controller";
import { FloorPlansService } from "./services/floor-plans.service";

@Module({
  controllers: [FloorPlansController],
  providers: [FloorPlansService]
})
export class FloorPlansModule {}
