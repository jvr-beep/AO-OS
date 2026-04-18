import { Module } from "@nestjs/common";
import { InventoryController } from "./controllers/inventory.controller";
import { InventoryService } from "./services/inventory.service";
import { LocationModule } from "../location/location.module";

@Module({
  imports: [LocationModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService]
})
export class InventoryModule {}
