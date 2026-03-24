import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStaffUserDto } from "../dto/create-staff-user.dto";
import { StaffUserResponseDto } from "../dto/staff-user.response.dto";

@Injectable()
export class StaffUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createStaffUser(input: CreateStaffUserDto): Promise<StaffUserResponseDto> {
    const existing = await (this.prisma as any).staffUser.findUnique({
      where: { email: input.email }
    });

    if (existing) {
      throw new ConflictException("STAFF_USER_EMAIL_TAKEN");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const created = await (this.prisma as any).staffUser.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        active: true
      }
    });

    return this.toResponse(created);
  }

  async listStaffUsers(): Promise<StaffUserResponseDto[]> {
    const users = await (this.prisma as any).staffUser.findMany({
      orderBy: { createdAt: "asc" }
    });
    return users.map((u: any) => this.toResponse(u));
  }

  async setRole(id: string, role: string): Promise<StaffUserResponseDto> {
    const user = await (this.prisma as any).staffUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("STAFF_USER_NOT_FOUND");

    const updated = await (this.prisma as any).staffUser.update({
      where: { id },
      data: { role }
    });

    return this.toResponse(updated);
  }

  async deactivate(id: string): Promise<StaffUserResponseDto> {
    const user = await (this.prisma as any).staffUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("STAFF_USER_NOT_FOUND");

    const updated = await (this.prisma as any).staffUser.update({
      where: { id },
      data: { active: false }
    });

    return this.toResponse(updated);
  }

  private toResponse(user: any): StaffUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString()
    };
  }
}
