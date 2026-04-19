import { Module } from "@nestjs/common";
import { LocationModule } from "../location/location.module";
import { MapStudioController } from "./controllers/map-studio.controller";
import { MapStudioService } from "./services/map-studio.service";

@Module({
  imports: [LocationModule],
  controllers: [MapStudioController],
  providers: [MapStudioService],
})
export class MapStudioModule {}
