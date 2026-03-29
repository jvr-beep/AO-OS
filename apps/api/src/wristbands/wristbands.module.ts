import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { WristbandsController } from "./controllers/wristbands.controller";
import { WristbandsService } from "./services/wristbands.service";

@Module({
  imports: [PrismaModule],
  controllers: [WristbandsController],
  providers: [WristbandsService],
  exports: [WristbandsService]
})
export class WristbandsModule {}
