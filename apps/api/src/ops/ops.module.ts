import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OpsController } from "./controllers/ops.controller";
import { OpsMonitorController } from "./controllers/ops-monitor.controller";
import { OpsService } from "./services/ops.service";

@Module({
  imports: [PrismaModule],
  controllers: [OpsController, OpsMonitorController],
  providers: [OpsService],
  exports: [OpsService]
})
export class OpsModule {}
