import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { WristbandsModule } from "../wristbands/wristbands.module";
import { IdentityController } from "./controllers/identity.controller";
import { AdminMembersController } from "./controllers/identity.controller";
import { IdentityService } from "./services/identity.service";

@Module({
  imports: [PrismaModule, AuthModule, EmailModule, WristbandsModule],
  controllers: [IdentityController, AdminMembersController],
  providers: [IdentityService],
  exports: [IdentityService]
})
export class IdentityModule {}
