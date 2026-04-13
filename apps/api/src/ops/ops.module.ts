import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OpsController } from "./controllers/ops.controller";
import { OpsMonitorController } from "./controllers/ops-monitor.controller";
import { IntegrationHealthController } from "./controllers/integration-health.controller";
import { OpsService } from "./services/ops.service";
import { StaleHoldService } from "./services/stale-hold.service";

@Module({
  imports: [PrismaModule],
  controllers: [OpsController, OpsMonitorController, IntegrationHealthController],
  providers: [OpsService, StaleHoldService],
  exports: [OpsService]
})
export class OpsModule {}
