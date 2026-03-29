import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../../email/email.service";
import { WristbandsService } from "../../wristbands/services/wristbands.service";
import { ConvertMemberDto } from "../dto/convert-member.dto";
import { CreateAnonymousMemberDto } from "../dto/create-anonymous-member.dto";
import { CreateRegisteredMemberDto } from "../dto/create-registered-member.dto";
import { MemberIdentityResponseDto } from "../dto/member-identity.response.dto";

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly wristbandsService: WristbandsService
  ) {}

  // ── Anonymous creation ─────────────────────────────────────────────
  async createAnonymous(input: CreateAnonymousMemberDto): Promise<MemberIdentityResponseDto> {
    const member = await this.prisma.member.create({
      data: {
        publicMemberNumber: this._generateMemberNumber(),
        type: "anonymous",
        alias: input.alias ?? null,
        status: "active"
      }
    });

    // Create wristband and assign to member
    const wristbandUid = `WB-${member.id.substring(0, 8)}-ANON`;
    const wristband = await this.wristbandsService.issueCredential({
      uid: wristbandUid,
      memberId: member.id,
      globalAccessFlag: false
    });

    return this._toDto(member, wristband);
  }

  // ── Admin creates registered member (sends invite) ─────────────────
  async createRegistered(
    input: CreateRegisteredMemberDto,
    actorStaffId: string
  ): Promise<MemberIdentityResponseDto> {
    const existing = await this.prisma.member.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException("EMAIL_ALREADY_IN_USE");
    }

    const member = await this.prisma.member.create({
      data: {
        publicMemberNumber: this._generateMemberNumber(),
        type: "registered",
        email: input.email,
        displayName: input.displayName ?? null,
        status: "pending",
        createdByStaffId: actorStaffId
      }
    });

    // Create wristband and assign to member
    const wristbandUid = `WB-${member.id.substring(0, 8)}-REG`;
    const wristband = await this.wristbandsService.issueCredential({
      uid: wristbandUid,
      memberId: member.id,
      globalAccessFlag: false
    });

    const { rawToken } = await this._createAuthToken(member.id, "invite_set_password", 24 * 60);
    await this.emailService.sendInvite(input.email, rawToken);

    return this._toDto(member, wristband);
  }

  // ── Convert anonymous → registered ────────────────────────────────
  async convertToRegistered(
    memberId: string,
    input: ConvertMemberDto
  ): Promise<MemberIdentityResponseDto> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException("MEMBER_NOT_FOUND");
    if (member.type !== "anonymous") throw new BadRequestException("MEMBER_NOT_ANONYMOUS");

    const emailConflict = await this.prisma.member.findUnique({ where: { email: input.email } });
    if (emailConflict) throw new ConflictException("EMAIL_ALREADY_IN_USE");

    const updateData: Record<string, unknown> = {
      type: "registered",
      email: input.email,
      status: "pending"
    };

    if (input.password) {
      const passwordHash = await argon2.hash(input.password);
      await (this.prisma as any).authAccount.upsert({
        where: { memberId },
        create: { id: crypto.randomUUID(), memberId, passwordHash },
        update: { passwordHash, failedAttempts: 0, lockedUntil: null }
      });
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: updateData
    });

    // Check if member already has a wristband
    const existingAssignment = await this.prisma.wristbandAssignment.findFirst({
      where: { memberId, active: true },
      include: { wristband: true }
    });

    let wristband: any = null;
    if (!existingAssignment) {
      // Create wristband only if member doesn't have one
      const wristbandUid = `WB-${memberId.substring(0, 8)}-CONV`;
      wristband = await this.wristbandsService.issueCredential({
        uid: wristbandUid,
        memberId: memberId,
        globalAccessFlag: false
      });
    } else {
      wristband = {
        id: existingAssignment.wristband.id,
        uid: existingAssignment.wristband.uid,
        status: existingAssignment.wristband.status
      };
    }

    const { rawToken } = await this._createAuthToken(memberId, "email_verify", 24 * 60);
    await this.emailService.sendVerification(input.email, rawToken);

    return this._toDto(updated, wristband);
  }

  // ── Admin triggers password reset for member ──────────────────────
  async adminResetPassword(memberId: string): Promise<{ email: string; resetLink: string }> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException("MEMBER_NOT_FOUND");
    if (!member.email) throw new BadRequestException("MEMBER_HAS_NO_EMAIL");

    const { rawToken } = await this._createAuthToken(memberId, "password_reset", 24 * 60);
    await this.emailService.sendPasswordReset(member.email, rawToken);

    return {
      email: member.email,
      resetLink: `${process.env.APP_BASE_URL ?? "https://app.aosanctuary.com"}/auth/reset-password?token=${rawToken}`
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────
  private _generateMemberNumber(): string {
    return `AO-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
  }

  async _createAuthToken(
    memberId: string,
    type: "password_reset" | "email_verify" | "invite_set_password",
    ttlMinutes: number
  ): Promise<{ rawToken: string }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await (this.prisma as any).authToken.create({
      data: {
        id: crypto.randomUUID(),
        memberId,
        type,
        tokenHash,
        expiresAt
      }
    });

    return { rawToken };
  }

  private _toDto(member: any, wristband?: any): MemberIdentityResponseDto {
    const dto: MemberIdentityResponseDto = {
      id: member.id,
      publicMemberNumber: member.publicMemberNumber,
      type: member.type,
      email: member.email ?? null,
      emailVerifiedAt: member.emailVerifiedAt?.toISOString() ?? null,
      alias: member.alias ?? null,
      displayName: member.displayName ?? null,
      firstName: member.firstName ?? null,
      lastName: member.lastName ?? null,
      phone: member.phone ?? null,
      status: member.status,
      createdAt: member.createdAt.toISOString()
    };

    if (wristband) {
      dto.wristband = {
        id: wristband.id,
        uid: wristband.uid,
        status: wristband.status
      };
    }

    return dto;
  }
}
