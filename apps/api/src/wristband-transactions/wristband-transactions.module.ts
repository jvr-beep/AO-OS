import { Module } from "@nestjs/common";
import { WristbandTransactionsController } from "./controllers/wristband-transactions.controller";
import { WristbandTransactionsService } from "./services/wristband-transactions.service";

@Module({
  controllers: [WristbandTransactionsController],
  providers: [WristbandTransactionsService]
})
export class WristbandTransactionsModule {}
