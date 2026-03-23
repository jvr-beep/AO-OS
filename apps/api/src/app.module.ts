import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { MembersModule } from "./members/members.module";

@Module({
  imports: [PrismaModule, HealthModule, MembersModule]
})
export class AppModule {}