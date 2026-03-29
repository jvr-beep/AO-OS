import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GuestAccessController } from "./controllers/guest-access.controller";
import { GuestAccessService } from "./services/guest-access.service";

@Module({
  imports: [PrismaModule],
  controllers: [GuestAccessController],
  providers: [GuestAccessService],
  exports: [GuestAccessService]
})
export class GuestAccessModule {}
