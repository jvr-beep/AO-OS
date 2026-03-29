/// <reference types="jest" />
import * as argon2 from "argon2";
import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { ExternalAuthService, VerifiedGoogleProfile } from "../../src/external-auth/services/external-auth.service";

describe("Integration - Identity Convergence", () => {
  let ctx: IntegrationApp;
  let externalAuthService: ExternalAuthService;
  const createdMemberIds: string[] = [];

  beforeAll(async () => {
    ctx = await createIntegrationApp();
    externalAuthService = ctx.app.get(ExternalAuthService);
  });

  afterAll(async () => {
    if (createdMemberIds.length > 0) {
      await ctx.prisma.authEvent.deleteMany({
        where: {
          OR: [
            { memberId: { in: createdMemberIds } },
            { attemptedEmail: { startsWith: ctx.runId } }
          ]
        }
      });

      await ctx.prisma.authSession.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await ctx.prisma.authToken.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await ctx.prisma.authAccount.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await (ctx.prisma as any).externalAuthIdentity.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await ctx.prisma.member.deleteMany({
        where: { id: { in: createdMemberIds } }
      });
    }

    await closeIntegrationApp(ctx);
  });

  async function createRegisteredMemberWithPassword(email: string, password: string) {
    const passwordHash = await argon2.hash(password);

    const member = await ctx.prisma.member.create({
      data: {
        publicMemberNumber: `${ctx.runId}-member-${Math.random().toString(36).slice(2, 8)}`,
        type: "registered",
        email,
        status: "active",
        emailVerifiedAt: new Date(),
        authAccount: {
          create: {
            passwordHash
          }
        }
      }
    });

    createdMemberIds.push(member.id);
    return member;
  }

  async function createAnonymousMember() {
    const member = await ctx.prisma.member.create({
      data: {
        publicMemberNumber: `${ctx.runId}-anon-${Math.random().toString(36).slice(2, 8)}`,
        type: "anonymous",
        status: "active"
      }
    });

    createdMemberIds.push(member.id);
    return member;
  }

  function googleProfile(input: {
    sub: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
  }): VerifiedGoogleProfile {
    return {
      sub: input.sub,
      email: input.email,
      emailVerified: input.emailVerified ?? true,
      displayName: input.displayName ?? "Integration Google User"
    };
  }

  it("converges password member and google identity to one member record", async () => {
    const email = `${ctx.runId}-converge@aosanctuary.test`;
    const passwordMember = await createRegisteredMemberWithPassword(email, "StrongPass123!");

    const resolved = await externalAuthService.resolveMemberFromGoogle(
      googleProfile({
        sub: `${ctx.runId}-google-sub-converge`,
        email,
        emailVerified: true,
        displayName: "Converged Member"
      })
    );

    expect(resolved.id).toBe(passwordMember.id);

    const linkedIdentity = await (ctx.prisma as any).externalAuthIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: `${ctx.runId}-google-sub-converge`
        }
      }
    });

    expect(linkedIdentity).not.toBeNull();
    expect(linkedIdentity.memberId).toBe(passwordMember.id);

    const sameEmailCount = await ctx.prisma.member.count({ where: { email } });
    expect(sameEmailCount).toBe(1);
  });

  it("preserves memberId when converting anonymous member with google", async () => {
    const anonymousMember = await createAnonymousMember();

    const resolved = await externalAuthService.resolveMemberFromGoogle(
      googleProfile({
        sub: `${ctx.runId}-google-sub-convert`,
        email: `${ctx.runId}-converted-google@aosanctuary.test`,
        emailVerified: true,
        displayName: "Converted Anonymous"
      }),
      {
        mode: "convert",
        memberIdToConvert: anonymousMember.id
      }
    );

    expect(resolved.id).toBe(anonymousMember.id);

    const reloaded = await ctx.prisma.member.findUnique({ where: { id: anonymousMember.id } });
    expect(reloaded?.type).toBe("registered");
    expect(reloaded?.email).toBe(`${ctx.runId}-converted-google@aosanctuary.test`);

    const linkedIdentity = await (ctx.prisma as any).externalAuthIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: `${ctx.runId}-google-sub-convert`
        }
      }
    });

    expect(linkedIdentity).not.toBeNull();
    expect(linkedIdentity.memberId).toBe(anonymousMember.id);
  });

  it("rejects linking the same google identity to a second member", async () => {
    const firstMember = await createRegisteredMemberWithPassword(
      `${ctx.runId}-first-link@aosanctuary.test`,
      "StrongPass123!"
    );
    const secondMember = await createRegisteredMemberWithPassword(
      `${ctx.runId}-second-link@aosanctuary.test`,
      "StrongPass123!"
    );

    const sharedGoogle = googleProfile({
      sub: `${ctx.runId}-google-sub-shared`,
      email: `${ctx.runId}-first-link@aosanctuary.test`
    });

    await externalAuthService.linkGoogleToMember(firstMember.id, sharedGoogle);

    await expect(
      externalAuthService.linkGoogleToMember(secondMember.id, {
        ...sharedGoogle,
        email: `${ctx.runId}-second-link@aosanctuary.test`
      })
    ).rejects.toThrow("GOOGLE_ACCOUNT_ALREADY_LINKED");
  });

  it("blocks unlink when external identity is the last login method", async () => {
    const member = await ctx.prisma.member.create({
      data: {
        publicMemberNumber: `${ctx.runId}-last-method-${Math.random().toString(36).slice(2, 8)}`,
        type: "registered",
        email: `${ctx.runId}-last-method@aosanctuary.test`,
        status: "active",
        emailVerifiedAt: new Date()
      }
    });
    createdMemberIds.push(member.id);

    const profile = googleProfile({
      sub: `${ctx.runId}-google-sub-last-method`,
      email: member.email ?? undefined
    });

    await externalAuthService.linkGoogleToMember(member.id, profile);

    const linked = await (ctx.prisma as any).externalAuthIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: `${ctx.runId}-google-sub-last-method`
        }
      }
    });

    await expect(
      externalAuthService.unlinkExternalIdentity(member.id, linked.id)
    ).rejects.toThrow("CANNOT_REMOVE_LAST_LOGIN_METHOD");
  });

  it("allows unlink when password auth remains available", async () => {
    const member = await createRegisteredMemberWithPassword(
      `${ctx.runId}-unlink-safe@aosanctuary.test`,
      "StrongPass123!"
    );

    const profile = googleProfile({
      sub: `${ctx.runId}-google-sub-unlink-safe`,
      email: member.email ?? undefined
    });

    await externalAuthService.linkGoogleToMember(member.id, profile);

    const linked = await (ctx.prisma as any).externalAuthIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: `${ctx.runId}-google-sub-unlink-safe`
        }
      }
    });

    await externalAuthService.unlinkExternalIdentity(member.id, linked.id);

    const deleted = await (ctx.prisma as any).externalAuthIdentity.findUnique({
      where: { id: linked.id }
    });
    expect(deleted).toBeNull();

    const remainingAuthAccount = await ctx.prisma.authAccount.findUnique({
      where: { memberId: member.id }
    });
    expect(remainingAuthAccount).not.toBeNull();
  });
});
