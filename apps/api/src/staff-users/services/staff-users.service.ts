import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { StaffRole } from "../../auth/decorators/roles.decorator";
import { JwtPayload } from "../../auth/strategies/jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";
import { StaffAuditService } from "../../staff-audit/services/staff-audit.service";
import { CreateStaffUserDto } from "../dto/create-staff-user.dto";
import { StaffUserResponseDto } from "../dto/staff-user.response.dto";

const STAFF_ROLES: StaffRole[] = ["admin", "operations", "front_desk"];

type StaffUserListFilters = {
  role?: string;
  active?: string;
};

@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuditService: StaffAuditService
  ) {}

  async createStaffUser(input: CreateStaffUserDto, actor: JwtPayload): Promise<StaffUserResponseDto> {
    this.ensureValidRole(input.role);
    this.ensureValidPassword(input.password);

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

    await this.staffAuditService.write({
      eventType: "STAFF_USER_CREATED",
      actor: this.toAuditActor(actor),
      targetStaffUserId: created.id,
      targetEmailSnapshot: created.email,
      outcome: "success",
      metadataJson: {
        createdRole: created.role,
        createdActive: created.active
      }
    });

    return this.toResponse(created);
  }

  async listStaffUsers(filters: StaffUserListFilters = {}): Promise<StaffUserResponseDto[]> {
    const where: Record<string, unknown> = {};

    if (typeof filters.role === "string") {
      this.ensureValidRole(filters.role);
      where.role = filters.role;
    }

    if (typeof filters.active === "string") {
      if (filters.active !== "true" && filters.active !== "false") {
        throw new BadRequestException("INVALID_ACTIVE_FILTER");
      }
      where.active = filters.active === "true";
    }

    const users = await (this.prisma as any).staffUser.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
    return users.map((u: any) => this.toResponse(u));
  }

  async getStaffUserById(id: string): Promise<StaffUserResponseDto> {
    const user = await this.findStaffUserOrThrow(id);
    return this.toResponse(user);
  }

  async setRole(id: string, role: string, actor: JwtPayload): Promise<StaffUserResponseDto> {
    this.ensureValidRole(role);

    const user = await this.findStaffUserOrThrow(id);

    if (await this.wouldRemoveLastActiveAdmin(user, role as StaffRole, user.active)) {
      await this.staffAuditService.write({
        eventType: "STAFF_USER_ROLE_CHANGED",
        actor: this.toAuditActor(actor),
        targetStaffUserId: user.id,
        targetEmailSnapshot: user.email,
        outcome: "blocked",
        reasonCode: "CANNOT_REMOVE_LAST_ACTIVE_ADMIN",
        metadataJson: {
          roleFrom: user.role,
          roleTo: role
        }
      });
      throw new ConflictException("CANNOT_REMOVE_LAST_ACTIVE_ADMIN");
    }

    const updated = await (this.prisma as any).staffUser.update({
      where: { id },
      data: { role }
    });

    await this.staffAuditService.write({
      eventType: "STAFF_USER_ROLE_CHANGED",
      actor: this.toAuditActor(actor),
      targetStaffUserId: updated.id,
      targetEmailSnapshot: updated.email,
      outcome: "success",
      metadataJson: {
        roleFrom: user.role,
        roleTo: updated.role
      }
    });

    return this.toResponse(updated);
  }

  async deactivate(id: string, actor: JwtPayload): Promise<StaffUserResponseDto> {
    const user = await this.findStaffUserOrThrow(id);

    if (user.id === actor.sub) {
      await this.staffAuditService.write({
        eventType: "STAFF_USER_DEACTIVATED",
        actor: this.toAuditActor(actor),
        targetStaffUserId: user.id,
        targetEmailSnapshot: user.email,
        outcome: "blocked",
        reasonCode: "CANNOT_DEACTIVATE_SELF"
      });
      throw new ConflictException("CANNOT_DEACTIVATE_SELF");
    }

    if (await this.wouldRemoveLastActiveAdmin(user, user.role, false)) {
      await this.staffAuditService.write({
        eventType: "STAFF_USER_DEACTIVATED",
        actor: this.toAuditActor(actor),
        targetStaffUserId: user.id,
        targetEmailSnapshot: user.email,
        outcome: "blocked",
        reasonCode: "CANNOT_REMOVE_LAST_ACTIVE_ADMIN"
      });
      throw new ConflictException("CANNOT_REMOVE_LAST_ACTIVE_ADMIN");
    }

    const updated = await (this.prisma as any).staffUser.update({
      where: { id },
      data: { active: false }
    });

    await this.staffAuditService.write({
      eventType: "STAFF_USER_DEACTIVATED",
      actor: this.toAuditActor(actor),
      targetStaffUserId: updated.id,
      targetEmailSnapshot: updated.email,
      outcome: "success",
      metadataJson: {
        activeFrom: user.active,
        activeTo: updated.active
      }
    });

    return this.toResponse(updated);
  }

  async reactivate(id: string, actor: JwtPayload): Promise<StaffUserResponseDto> {
    const user = await this.findStaffUserOrThrow(id);

    const updated = await (this.prisma as any).staffUser.update({
      where: { id: user.id },
      data: { active: true }
    });

    await this.staffAuditService.write({
      eventType: "STAFF_USER_REACTIVATED",
      actor: this.toAuditActor(actor),
      targetStaffUserId: updated.id,
      targetEmailSnapshot: updated.email,
      outcome: "success",
      metadataJson: {
        activeFrom: user.active,
        activeTo: updated.active
      }
    });

    return this.toResponse(updated);
  }

  async updatePassword(id: string, password: string, actor: JwtPayload): Promise<StaffUserResponseDto> {
    this.ensureValidPassword(password);

    const user = await this.findStaffUserOrThrow(id);
    const passwordHash = await bcrypt.hash(password, 10);

    const updated = await (this.prisma as any).staffUser.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await this.staffAuditService.write({
      eventType: "STAFF_USER_PASSWORD_RESET",
      actor: this.toAuditActor(actor),
      targetStaffUserId: updated.id,
      targetEmailSnapshot: updated.email,
      outcome: "success",
      metadataJson: {
        passwordReset: true
      }
    });

    return this.toResponse(updated);
  }

  private async findStaffUserOrThrow(id: string): Promise<any> {
    const user = await (this.prisma as any).staffUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("STAFF_USER_NOT_FOUND");
    }
    return user;
  }

  private async wouldRemoveLastActiveAdmin(
    user: any,
    nextRole: StaffRole,
    nextActive: boolean
  ): Promise<boolean> {
    const removesActiveAdmin = user.role === "admin" && user.active && (!nextActive || nextRole !== "admin");

    if (!removesActiveAdmin) {
      return false;
    }

    const activeAdminCount = await (this.prisma as any).staffUser.count({
      where: {
        role: "admin",
        active: true
      }
    });

    return activeAdminCount <= 1;
  }

  private toAuditActor(actor: JwtPayload): { id: string; email: string; role: string } {
    return {
      id: actor.sub,
      email: actor.email,
      role: actor.role
    };
  }

  private ensureValidRole(role: string): void {
    if (!STAFF_ROLES.includes(role as StaffRole)) {
      throw new BadRequestException("INVALID_ROLE");
    }
  }

  private ensureValidPassword(password: string): void {
    if (typeof password !== "string" || password.trim().length === 0) {
      throw new BadRequestException("INVALID_PASSWORD_INPUT");
    }
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
