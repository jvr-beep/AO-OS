import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OpsController } from "./controllers/ops.controller";
import { OpsService } from "./services/ops.service";

@Module({
  imports: [PrismaModule],
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService]
})
export class OpsModule {}
