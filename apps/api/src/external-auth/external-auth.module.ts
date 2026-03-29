import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ExternalAuthController } from "./controllers/external-auth.controller";
import { ExternalAuthService } from "./services/external-auth.service";
import { GoogleAuthService } from "./services/google-auth.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExternalAuthController],
  providers: [ExternalAuthService, GoogleAuthService],
  exports: [ExternalAuthService, GoogleAuthService]
})
export class ExternalAuthModule {}
