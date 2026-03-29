import { Module } from "@nestjs/common";
import { FoliosModule } from "../folios/folios.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PrismaModule } from "../prisma/prisma.module";
import { OrchestratorsController } from "./controllers/orchestrators.controller";
import { OrchestratorsService } from "./services/orchestrators.service";

@Module({
  imports: [PrismaModule, FoliosModule, InventoryModule],
  controllers: [OrchestratorsController],
  providers: [OrchestratorsService]
})
export class OrchestratorsModule {}
