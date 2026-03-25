import { Module } from "@nestjs/common";
import { CleaningController } from "./controllers/cleaning.controller";
import { CleaningService } from "./services/cleaning.service";

@Module({
  controllers: [CleaningController],
  providers: [CleaningService]
})
export class CleaningModule {}
