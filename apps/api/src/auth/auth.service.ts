import { Logger } from "@nestjs/common";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { WristbandsService } from "../wristbands/services/wristbands.service";
import { StaffRole } from "./decorators/roles.decorator";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login.response.dto";
import { MemberSignupDto } from "./dto/member-signup.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";

type StaffUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: StaffRole;
  active: boolean;
};

type MemberAuthAccountRecord = {
  memberId: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
};

type MemberAuthRecord = {
  id: string;
  email: string | null;
  type: string;
  status: string;
  emailVerifiedAt: Date | null;
  authAccount?: MemberAuthAccountRecord | null;
};

export type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
  refreshToken?: string;
  expiresAt?: Date;
};

export type AuthMethodType = "password" | "google" | "admin_invite";

export type AuthEventType = "auth.login_succeeded" | "auth.login_failed" | "auth.session_created";

export type MemberAuthResponse = {
  memberId: string;
  session: { sessionId: string; expiresAt: string };
};

type AuthEventRecordInput = {
  memberId?: string;
  sessionId?: string;
  eventType: AuthEventType;
  authMethod?: AuthMethodType;
  outcome: "success" | "failed";
  failureReasonCode?: string;
  attemptedEmail?: string;
  meta?: RequestMeta;
  metadataJson?: Record<string, unknown>;
};

const MAX_MEMBER_LOGIN_ATTEMPTS = 5;
const MEMBER_LOGIN_LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly wristbandsService: WristbandsService
  ) {}

  // ── STAFF AUTH ─────────────────────────────────────────────────────

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

  async memberLogin(input: LoginDto, meta: RequestMeta = {}): Promise<MemberAuthResponse> {
    const member = await this.validateMemberCredentials(input.email, input.password);
    return this.finalizeMemberAuthentication(member.id, "password", meta);
  }

  async finalizeMemberAuthentication(
    memberId: string,
    method: AuthMethodType,
    meta: RequestMeta = {}
  ): Promise<MemberAuthResponse> {
    return this.prisma.$transaction(async (tx) => {
      const session = await this.createAuthSession(memberId, method, meta, tx as any);

      await (tx as any).authEvent.createMany({
        data: [
          this.buildAuthEventRecord({
            memberId,
            sessionId: session.sessionId,
            eventType: "auth.login_succeeded",
            authMethod: method,
            outcome: "success",
            meta
          }),
          this.buildAuthEventRecord({
            memberId,
            sessionId: session.sessionId,
            eventType: "auth.session_created",
            authMethod: method,
            outcome: "success",
            meta,
            metadataJson: {
              expiresAt: session.expiresAt
            }
          })
        ]
      });

      return {
        memberId,
        session
      };
    });
  }

  async recordAuthenticationFailure(input: {
    method: AuthMethodType;
    reasonCode: string;
    attemptedEmail?: string;
    memberId?: string;
    meta?: RequestMeta;
    metadataJson?: Record<string, unknown>;
  }): Promise<void> {
    await (this.prisma as any).authEvent.create({
      data: this.buildAuthEventRecord({
        memberId: input.memberId,
        eventType: "auth.login_failed",
        authMethod: input.method,
        outcome: "failed",
        failureReasonCode: input.reasonCode,
        attemptedEmail: input.attemptedEmail,
        meta: input.meta,
        metadataJson: input.metadataJson
      })
    });
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

  private async validateMemberCredentials(email: string, password: string): Promise<MemberAuthRecord> {
    const trimmedEmail = email.trim();
    const member = (await (this.prisma as any).member.findUnique({
      where: { email: trimmedEmail },
      include: { authAccount: true }
    })) as MemberAuthRecord | null;

    if (!member || !member.authAccount || member.type !== "registered") {
      await this.recordAuthenticationFailure({
        method: "password",
        reasonCode: "INVALID_CREDENTIALS",
        attemptedEmail: trimmedEmail
      });
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (member.status !== "active" || !member.emailVerifiedAt) {
      await this.recordAuthenticationFailure({
        method: "password",
        reasonCode: "MEMBER_NOT_ACTIVE",
        attemptedEmail: trimmedEmail,
        memberId: member.id
      });
      throw new UnauthorizedException("MEMBER_NOT_ACTIVE");
    }

    if (member.authAccount.lockedUntil && member.authAccount.lockedUntil > new Date()) {
      await this.recordAuthenticationFailure({
        method: "password",
        reasonCode: "ACCOUNT_LOCKED",
        attemptedEmail: trimmedEmail,
        memberId: member.id
      });
      throw new UnauthorizedException("ACCOUNT_LOCKED");
    }

    const validPassword = await argon2.verify(member.authAccount.passwordHash, password);
    if (!validPassword) {
      await this.recordFailedMemberLoginAttempt(member);
      await this.recordAuthenticationFailure({
        method: "password",
        reasonCode: "INVALID_CREDENTIALS",
        attemptedEmail: trimmedEmail,
        memberId: member.id
      });
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    await (this.prisma as any).authAccount.update({
      where: { memberId: member.id },
      data: { failedAttempts: 0, lockedUntil: null }
    });

    return member;
  }

  private async recordFailedMemberLoginAttempt(member: MemberAuthRecord): Promise<void> {
    const failedAttempts = member.authAccount?.failedAttempts ?? 0;
    const nextFailedAttempts = failedAttempts + 1;
    const shouldLock = nextFailedAttempts >= MAX_MEMBER_LOGIN_ATTEMPTS;

    await (this.prisma as any).authAccount.update({
      where: { memberId: member.id },
      data: {
        failedAttempts: nextFailedAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + MEMBER_LOGIN_LOCK_MINUTES * 60 * 1000)
          : null
      }
    });
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

  // ── MEMBER AUTH ────────────────────────────────────────────────────

  async memberSignup(input: MemberSignupDto): Promise<{ email: string; wristband: { id: string; uid: string; status: string } }> {
    const existing = await this.prisma.member.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException("EMAIL_ALREADY_IN_USE");

    const passwordHash = await argon2.hash(input.password);

    const memberNumber = `AO-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    const member = await this.prisma.member.create({
      data: {
        publicMemberNumber: memberNumber,
        type: "registered",
        email: input.email,
        status: "pending"
      }
    });

    await (this.prisma as any).authAccount.create({
      data: {
        id: crypto.randomUUID(),
        memberId: member.id,
        passwordHash
      }
    });

    // Create wristband and assign to member
    const wristbandUid = `WB-${member.id.substring(0, 8)}-SELF`;
    const wristband = await this.wristbandsService.issueCredential({
      uid: wristbandUid,
      memberId: member.id,
      globalAccessFlag: false
    });

    const { rawToken } = await this._createAuthToken(member.id, "email_verify", 24 * 60);
    await this.emailService.sendVerification(input.email, rawToken);

    return { email: input.email, wristband: { id: wristband.id, uid: wristband.uid, status: wristband.status } };
  }

  async verifyEmail(rawToken: string): Promise<{ email: string }> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const token = await (this.prisma as any).authToken.findFirst({
      where: { tokenHash, type: "email_verify", consumedAt: null, expiresAt: { gte: new Date() } }
    });

    if (!token) throw new BadRequestException("INVALID_OR_EXPIRED_TOKEN");

    await (this.prisma as any).authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
    const member = await this.prisma.member.update({
      where: { id: token.memberId },
      data: { emailVerifiedAt: new Date(), status: "active" }
    });

    if (!member.email) throw new InternalServerErrorException("MEMBER_EMAIL_NOT_FOUND");
    return { email: member.email };
  }

  async passwordResetRequest(input: PasswordResetRequestDto): Promise<void> {
    try {
      // Check member first
      const member = await this.prisma.member.findUnique({ where: { email: input.email } });
      if (member) {
        await (this.prisma as any).authToken.updateMany({
          where: { memberId: member.id, type: "password_reset", consumedAt: null },
          data: { consumedAt: new Date() }
        });
        const { rawToken } = await this._createAuthToken(member.id, "password_reset", 30);
        try {
          await this.emailService.sendPasswordReset(input.email, rawToken);
        } catch (err) {
          this.logger.error(`Failed to send member password reset email to ${input.email}: ${err}`);
        }
        return;
      }

      // Check staff user
      const staffUser = await (this.prisma as any).staffUser.findUnique({ where: { email: input.email } }) as StaffUserRecord | null;
      if (staffUser && staffUser.active) {
        const payload = { sub: staffUser.id, email: staffUser.email, purpose: "staff_password_reset" };
        const rawToken = await this.jwtService.signAsync(payload, { expiresIn: "30m" });
        try {
          await this.emailService.sendStaffPasswordReset(input.email, rawToken);
        } catch (err) {
          this.logger.error(`Failed to send staff password reset email to ${input.email}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`passwordResetRequest internal error for ${input.email}: ${err}`);
    }
    // Security: always return void — never reveal whether email exists or what failed
  }

  async staffPasswordResetConfirm(input: PasswordResetConfirmDto): Promise<{ email: string }> {
    let payload: { sub: string; email: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(input.token);
    } catch {
      throw new BadRequestException("INVALID_OR_EXPIRED_TOKEN");
    }

    if (payload.purpose !== "staff_password_reset") {
      throw new BadRequestException("INVALID_OR_EXPIRED_TOKEN");
    }

    const staffUser = await (this.prisma as any).staffUser.findUnique({ where: { id: payload.sub } }) as StaffUserRecord | null;
    if (!staffUser || !staffUser.active) {
      throw new BadRequestException("INVALID_OR_EXPIRED_TOKEN");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await (this.prisma as any).staffUser.update({
      where: { id: staffUser.id },
      data: { passwordHash }
    });

    return { email: staffUser.email };
  }

  async passwordResetConfirm(input: PasswordResetConfirmDto): Promise<{ email: string }> {
    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
    const token = await (this.prisma as any).authToken.findFirst({
      where: { tokenHash, type: "password_reset", consumedAt: null, expiresAt: { gte: new Date() } }
    });

    if (!token) throw new BadRequestException("INVALID_OR_EXPIRED_TOKEN");

    const passwordHash = await argon2.hash(input.newPassword);

    await Promise.all([
      (this.prisma as any).authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
      (this.prisma as any).authAccount.update({
        where: { memberId: token.memberId },
        data: { passwordHash, failedAttempts: 0, lockedUntil: null }
      })
    ]);

    const member = await this.prisma.member.findUnique({ where: { id: token.memberId } });
    if (!member) throw new NotFoundException("MEMBER_NOT_FOUND");
    return { email: member.email || "" };
  }

  async createAuthSession(
    memberId: string,
    method: AuthMethodType,
    meta: RequestMeta = {},
    prismaClient: any = this.prisma as any
  ): Promise<{ sessionId: string; expiresAt: string }> {
    const refreshTokenHash = meta.refreshToken
      ? crypto.createHash("sha256").update(meta.refreshToken).digest("hex")
      : null;

    const expiresAt = meta.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const session = await prismaClient.authSession.create({
      data: {
        memberId,
        authMethod: method,
        refreshTokenHash,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        expiresAt
      }
    });

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await (this.prisma as any).authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });
  }

  private buildAuthEventRecord(input: AuthEventRecordInput) {
    return {
      id: crypto.randomUUID(),
      memberId: input.memberId ?? null,
      sessionId: input.sessionId ?? null,
      eventType: input.eventType,
      authMethod: input.authMethod ?? null,
      outcome: input.outcome,
      failureReasonCode: input.failureReasonCode ?? null,
      attemptedEmail: input.attemptedEmail ?? null,
      ipAddress: input.meta?.ipAddress ?? null,
      userAgent: input.meta?.userAgent ?? null,
      metadataJson: input.metadataJson ?? null,
      occurredAt: new Date(),
      createdAt: new Date()
    };
  }

  private async _createAuthToken(
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
}
