import { Module } from "@nestjs/common";
import { SubscriptionsController } from "./controllers/subscriptions.controller";
import { SubscriptionsService } from "./services/subscriptions.service";

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService]
})
export class SubscriptionsModule {}