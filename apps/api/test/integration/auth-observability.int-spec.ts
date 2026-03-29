import * as argon2 from "argon2";
import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Auth Observability", () => {
  let ctx: IntegrationApp;
  const createdMemberIds: string[] = [];

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Auth Obs Admin",
      role: "admin",
      password: "Passw0rd!"
    });

    await loginFixture(ctx.http, `${ctx.runId}-admin@aosanctuary.test`, "Passw0rd!");
  });

  afterAll(async () => {
    if (createdMemberIds.length > 0) {
      await ctx.prisma.authEvent.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await ctx.prisma.authSession.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await ctx.prisma.authAccount.deleteMany({
        where: { memberId: { in: createdMemberIds } }
      });

      await ctx.prisma.member.deleteMany({
        where: { id: { in: createdMemberIds } }
      });
    }

    await ctx.prisma.authEvent.deleteMany({
      where: {
        attemptedEmail: { startsWith: ctx.runId }
      }
    });

    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  async function createActiveMemberWithPassword(email: string, password: string) {
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

  it("password member login success emits auth.login_succeeded and auth.session_created", async () => {
    const email = `${ctx.runId}-success@aosanctuary.test`;
    const password = "StrongPass123!";
    const member = await createActiveMemberWithPassword(email, password);

    const response = await ctx.http
      .post("/v1/auth/member/login")
      .send({ email, password })
      .expect(201);

    expect(response.body.memberId).toBe(member.id);
    expect(response.body.session?.sessionId).toBeDefined();

    const authEvents = await ctx.prisma.authEvent.findMany({
      where: { memberId: member.id },
      orderBy: { occurredAt: "asc" }
    });

    const eventTypes = authEvents.map((e) => e.eventType);
    expect(eventTypes).toContain("auth.login_succeeded");
    expect(eventTypes).toContain("auth.session_created");

    const sessionCreatedEvent = authEvents.find((e) => e.eventType === "auth.session_created");
    expect(sessionCreatedEvent?.sessionId).toBe(response.body.session.sessionId);
  });

  it("invalid password emits auth.login_failed", async () => {
    const email = `${ctx.runId}-wrong-pass@aosanctuary.test`;
    const password = "StrongPass123!";
    const member = await createActiveMemberWithPassword(email, password);

    const response = await ctx.http
      .post("/v1/auth/member/login")
      .send({ email, password: "WrongPass123!" })
      .expect(401);

    expect(String(response.body?.message ?? "")).toContain("INVALID_CREDENTIALS");

    const failureEvent = await ctx.prisma.authEvent.findFirst({
      where: {
        memberId: member.id,
        eventType: "auth.login_failed",
        failureReasonCode: "INVALID_CREDENTIALS"
      },
      orderBy: { occurredAt: "desc" }
    });

    expect(failureEvent).not.toBeNull();
    expect(failureEvent?.authMethod).toBe("password");
  });

  it("repeated invalid passwords eventually lock account and emit lock failure event", async () => {
    const email = `${ctx.runId}-lockout@aosanctuary.test`;
    const password = "StrongPass123!";
    const member = await createActiveMemberWithPassword(email, password);

    for (let i = 0; i < 5; i++) {
      await ctx.http
        .post("/v1/auth/member/login")
        .send({ email, password: "WrongPass123!" })
        .expect(401);
    }

    const lockedAttempt = await ctx.http
      .post("/v1/auth/member/login")
      .send({ email, password: "WrongPass123!" })
      .expect(401);

    expect(String(lockedAttempt.body?.message ?? "")).toContain("ACCOUNT_LOCKED");

    const lockEvent = await ctx.prisma.authEvent.findFirst({
      where: {
        memberId: member.id,
        eventType: "auth.login_failed",
        failureReasonCode: "ACCOUNT_LOCKED"
      },
      orderBy: { occurredAt: "desc" }
    });

    expect(lockEvent).not.toBeNull();

    const authAccount = await ctx.prisma.authAccount.findUnique({
      where: { memberId: member.id }
    });
    expect(authAccount?.lockedUntil).not.toBeNull();
  });

  it("google callback failure emits auth.login_failed with google method", async () => {
    const response = await ctx.http
      .get("/v1/auth/google/callback?code=fake&state=invalid-state")
      .expect(400);

    expect(String(response.body?.message ?? "")).toContain("INVALID_GOOGLE_AUTH_STATE");

    const failureEvent = await ctx.prisma.authEvent.findFirst({
      where: {
        eventType: "auth.login_failed",
        authMethod: "google",
        failureReasonCode: "INVALID_GOOGLE_AUTH_STATE"
      },
      orderBy: { occurredAt: "desc" }
    });

    expect(failureEvent).not.toBeNull();
  });
});
