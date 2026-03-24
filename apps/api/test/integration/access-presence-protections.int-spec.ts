import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import {
  cleanupByRunId,
  createBookingRequiredAccessFixture,
  createCheckedOutVisitFixture,
  createMemberFixture,
  createStaffUserFixture,
  createSubscriptionFixture,
  ensureMembershipPlanFixture,
  loginFixture
} from "../helpers/fixtures";

describe("Integration - Access and presence protections", () => {
  let ctx: IntegrationApp;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Access Admin",
      role: "admin",
      password: "Passw0rd!"
    });

    const adminLogin = await loginFixture(ctx.http, `${ctx.runId}-admin@aosanctuary.test`, "Passw0rd!");
    adminToken = adminLogin.accessToken;
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  it("denies access attempt when zone requires booking and no valid booking exists", async () => {
    const member = await createMemberFixture(ctx.prisma, ctx.runId, "active");
    const plan = await ensureMembershipPlanFixture(ctx.prisma, ctx.runId);
    await createSubscriptionFixture(ctx.prisma, member.id, plan.id, "trialing");

    const { accessPoint, accessZone } = await createBookingRequiredAccessFixture(ctx.prisma, ctx.runId);

    const response = await ctx.http
      .post("/v1/access-attempts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        memberId: member.id,
        accessPointId: accessPoint.id,
        accessZoneId: accessZone.id,
        attemptSource: `${ctx.runId}-booking-deny`,
        occurredAt: new Date().toISOString()
      })
      .expect(201);

    expect(response.body.decision).toBe("denied");
    expect(response.body.denialReasonCode).toBe("ZONE_BOOKING_REQUIRED");
  });

  it("returns 403 when creating presence event on a closed visit session", async () => {
    const member = await createMemberFixture(ctx.prisma, ctx.runId, "active");
    const { location, accessZone } = await createBookingRequiredAccessFixture(ctx.prisma, ctx.runId);
    const closedSession = await createCheckedOutVisitFixture(ctx.prisma, member.id, location.id);

    const response = await ctx.http
      .post("/v1/presence-events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        visitSessionId: closedSession.id,
        memberId: member.id,
        accessZoneId: accessZone.id,
        eventType: "zone_entered",
        sourceType: "integration-test",
        occurredAt: new Date().toISOString()
      })
      .expect(403);

    expect(String(response.body?.message ?? "")).toContain("VISIT_SESSION_CLOSED");
  });
});
