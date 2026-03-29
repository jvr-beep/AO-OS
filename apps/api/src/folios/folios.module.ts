import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { FoliosController } from "./controllers/folios.controller";
import { FoliosService } from "./services/folios.service";

@Module({
  imports: [PrismaModule],
  controllers: [FoliosController],
  providers: [FoliosService],
  exports: [FoliosService]
})
export class FoliosModule {}
