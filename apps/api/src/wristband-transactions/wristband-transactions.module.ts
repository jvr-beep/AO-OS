import { Module } from "@nestjs/common";
import { FoliosModule } from "../folios/folios.module";
import { WristbandTransactionsController } from "./controllers/wristband-transactions.controller";
import { WristbandTransactionsService } from "./services/wristband-transactions.service";

@Module({
  imports: [FoliosModule],
  controllers: [WristbandTransactionsController],
  providers: [WristbandTransactionsService]
})
export class WristbandTransactionsModule {}
