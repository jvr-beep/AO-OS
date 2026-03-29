import { Module } from "@nestjs/common";
import { GuestsController } from "./controllers/guests.controller";
import { GuestsService } from "./services/guests.service";

@Module({
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService]
})
export class GuestsModule {}
