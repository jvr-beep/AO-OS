import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DeveloperController } from "./controllers/developer.controller";
import { DeveloperService } from "./services/developer.service";

@Module({
  imports: [PrismaModule],
  controllers: [DeveloperController],
  providers: [DeveloperService]
})
export class DeveloperModule {}
