import { Module } from "@nestjs/common";
import { LocationContextService } from "./location-context.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [LocationContextService],
  exports: [LocationContextService],
})
export class LocationModule {}
