import { Module } from "@nestjs/common";
import { AccessAttemptsModule } from "../access-attempts/access-attempts.module";
import { AccessGatewayService } from "./access-gateway.service";

@Module({
  imports: [AccessAttemptsModule],
  providers: [AccessGatewayService],
  exports: [AccessGatewayService]
})
export class AccessGatewayModule {}
