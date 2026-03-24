import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { StaffRole } from "./decorators/roles.decorator";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login.response.dto";

type StaffUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: StaffRole;
  active: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(input: LoginDto): Promise<LoginResponseDto> {
    const staffUser = await this.validateStaffUser(input.email, input.password);

    const payload = {
      sub: staffUser.id,
      email: staffUser.email,
      role: staffUser.role
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      staffUser: {
        id: staffUser.id,
        email: staffUser.email,
        fullName: staffUser.fullName,
        role: staffUser.role
      }
    };
  }

  private async validateStaffUser(email: string, password: string): Promise<StaffUserRecord> {
    const staffUser = (await (this.prisma as any).staffUser.findUnique({
      where: { email }
    })) as StaffUserRecord | null;

    if (!staffUser || !staffUser.active) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    const validPassword = await bcrypt.compare(password, staffUser.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    return staffUser;
  }

  async seedAdminFromEnv(): Promise<void> {
    const seedEmail = process.env.AUTH_SEED_ADMIN_EMAIL;
    const seedPassword = process.env.AUTH_SEED_ADMIN_PASSWORD;

    if (!seedEmail || !seedPassword) {
      return;
    }

    const existing = await (this.prisma as any).staffUser.findUnique({ where: { email: seedEmail } });
    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash(seedPassword, 10);

    await (this.prisma as any).staffUser.create({
      data: {
        email: seedEmail,
        passwordHash,
        fullName: process.env.AUTH_SEED_ADMIN_NAME ?? "Seed Admin",
        role: "admin",
        active: true
      }
    });
  }
}
