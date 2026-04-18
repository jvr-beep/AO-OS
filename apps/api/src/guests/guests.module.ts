import { Module } from "@nestjs/common";
import { GuestsController } from "./controllers/guests.controller";
import { GuestsService } from "./services/guests.service";
import { LocationModule } from "../location/location.module";

@Module({
  imports: [LocationModule],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService]
})
export class GuestsModule {}
