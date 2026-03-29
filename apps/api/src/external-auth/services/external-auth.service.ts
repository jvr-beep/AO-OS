import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type VerifiedGoogleProfile = {
  sub: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

export type ResolveGoogleContext = {
  mode?: "login" | "link" | "convert";
  currentMemberId?: string;
  memberIdToConvert?: string;
};

@Injectable()
export class ExternalAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderSubject(provider: "google", providerSubject: string): Promise<any | null> {
    return (this.prisma as any).externalAuthIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject
        }
      },
      include: {
        member: true
      }
    });
  }

  async linkGoogleToMember(memberId: string, profile: VerifiedGoogleProfile): Promise<any> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }

    const existingExternal = await this.findByProviderSubject("google", profile.sub);
    if (existingExternal && existingExternal.memberId !== memberId) {
      throw new ConflictException("GOOGLE_ACCOUNT_ALREADY_LINKED");
    }

    if (profile.email && member.email && profile.email !== member.email) {
      throw new ConflictException("GOOGLE_EMAIL_DOES_NOT_MATCH_MEMBER_EMAIL");
    }

    await (this.prisma as any).externalAuthIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: profile.sub
        }
      },
      create: {
        memberId,
        provider: "google",
        providerSubject: profile.sub,
        emailAtProvider: profile.email ?? null,
        profileJson: profile
      },
      update: {
        emailAtProvider: profile.email ?? null,
        profileJson: profile
      }
    });

    const updateData: Record<string, unknown> = {};
    if (profile.email && !member.email) {
      updateData.email = profile.email;
    }
    if (profile.displayName && !member.displayName) {
      updateData.displayName = profile.displayName;
    }
    if (profile.emailVerified && !member.emailVerifiedAt) {
      updateData.emailVerifiedAt = new Date();
      updateData.status = "active";
    }
    if (member.type === "anonymous") {
      updateData.type = "registered";
    }

    return Object.keys(updateData).length > 0
      ? this.prisma.member.update({ where: { id: memberId }, data: updateData })
      : member;
  }

  async resolveMemberFromGoogle(
    profile: VerifiedGoogleProfile,
    context: ResolveGoogleContext = {}
  ): Promise<any> {
    const existingExternal = await this.findByProviderSubject("google", profile.sub);
    if (existingExternal) {
      return existingExternal.member;
    }

    if (context.mode === "link" && context.currentMemberId) {
      return this.linkGoogleToMember(context.currentMemberId, profile);
    }

    if (context.mode === "convert" && context.memberIdToConvert) {
      return this.convertAnonymousMemberWithGoogle(context.memberIdToConvert, profile);
    }

    if (profile.email && profile.emailVerified) {
      const existingMember = await this.prisma.member.findUnique({
        where: { email: profile.email }
      });

      if (existingMember) {
        if (existingMember.type !== "registered") {
          throw new ConflictException("EXISTING_MEMBER_REQUIRES_EXPLICIT_CONVERSION");
        }
        return this.linkGoogleToMember(existingMember.id, profile);
      }
    }

    return this.createRegisteredMemberFromGoogle(profile);
  }

  async unlinkExternalIdentity(memberId: string, externalAuthId: string): Promise<void> {
    const externalIdentity = await (this.prisma as any).externalAuthIdentity.findUnique({
      where: { id: externalAuthId }
    });

    if (!externalIdentity || externalIdentity.memberId !== memberId) {
      throw new NotFoundException("EXTERNAL_IDENTITY_NOT_FOUND");
    }

    const member = await (this.prisma as any).member.findUnique({
      where: { id: memberId },
      include: {
        authAccount: true,
        externalAuths: true
      }
    });

    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }

    const remainingExternalAuths = (member.externalAuths as Array<{ id: string }>).filter(
      (identity) => identity.id !== externalAuthId
    );
    if (!member.authAccount && remainingExternalAuths.length === 0) {
      throw new BadRequestException("CANNOT_REMOVE_LAST_LOGIN_METHOD");
    }

    await (this.prisma as any).externalAuthIdentity.delete({
      where: { id: externalAuthId }
    });
  }

  async convertAnonymousMemberWithGoogle(memberId: string, profile: VerifiedGoogleProfile): Promise<any> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException("MEMBER_NOT_FOUND");
    }
    if (member.type !== "anonymous") {
      throw new BadRequestException("MEMBER_NOT_ANONYMOUS");
    }

    if (profile.email) {
      const emailConflict = await this.prisma.member.findUnique({ where: { email: profile.email } });
      if (emailConflict && emailConflict.id !== memberId) {
        throw new ConflictException("EMAIL_ALREADY_IN_USE");
      }
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: {
        type: "registered",
        email: profile.email ?? null,
        displayName: profile.displayName ?? member.displayName,
        emailVerifiedAt: profile.emailVerified ? new Date() : member.emailVerifiedAt,
        status: profile.emailVerified ? "active" : "pending"
      }
    });

    await this.linkGoogleToMember(memberId, profile);
    return updated;
  }

  private async createRegisteredMemberFromGoogle(profile: VerifiedGoogleProfile): Promise<any> {
    const member = await this.prisma.member.create({
      data: {
        publicMemberNumber: `AO-${Date.now()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`,
        type: "registered",
        email: profile.email ?? null,
        displayName: profile.displayName ?? null,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        status: profile.emailVerified ? "active" : "pending"
      }
    });

    await (this.prisma as any).externalAuthIdentity.create({
      data: {
        memberId: member.id,
        provider: "google",
        providerSubject: profile.sub,
        emailAtProvider: profile.email ?? null,
        profileJson: profile
      }
    });

    return member;
  }
}
