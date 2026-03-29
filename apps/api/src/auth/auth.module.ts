import { Module, OnModuleInit } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { WristbandsModule } from "../wristbands/wristbands.module";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./guards/roles.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    WristbandsModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET ?? "dev-only-secret-change-me",
      signOptions: {
        expiresIn: (process.env.AUTH_JWT_EXPIRES_IN ?? "1h") as any
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, PassportModule, JwtModule, RolesGuard, EmailModule]
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit(): Promise<void> {
    await this.authService.seedAdminFromEnv();
  }
}
