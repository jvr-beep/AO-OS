import { Module } from "@nestjs/common";
import { CatalogController } from "./controllers/catalog.controller";
import { CatalogService } from "./services/catalog.service";
import { LocationModule } from "../location/location.module";

@Module({
  imports: [LocationModule],
  controllers: [CatalogController],
  providers: [CatalogService]
})
export class CatalogModule {}
