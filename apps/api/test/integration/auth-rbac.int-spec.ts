import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Auth and RBAC", () => {
  let ctx: IntegrationApp;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Integration Admin",
      role: "admin",
      password: "Passw0rd!"
    });

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-frontdesk@aosanctuary.test`,
      fullName: "Integration Front Desk",
      role: "front_desk",
      password: "Passw0rd!"
    });
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  it("returns 401 for invalid token", async () => {
    await ctx.http
      .post("/v1/visit-sessions/check-in")
      .set("Authorization", "Bearer invalid.token.value")
      .send({
        memberId: "invalid-member-id",
        locationId: "invalid-location-id",
        checkInAt: new Date().toISOString()
      })
      .expect(401);
  });

  it("returns 401 when token is missing", async () => {
    await ctx.http
      .post("/v1/visit-sessions/check-in")
      .send({
        memberId: "invalid-member-id",
        locationId: "invalid-location-id",
        checkInAt: new Date().toISOString()
      })
      .expect(401);
  });

  it("returns 403 for wrong role on operations/admin endpoint", async () => {
    const frontDeskLogin = await loginFixture(
      ctx.http,
      `${ctx.runId}-frontdesk@aosanctuary.test`,
      "Passw0rd!"
    );

    await ctx.http
      .post("/v1/membership-plans")
      .set("Authorization", `Bearer ${frontDeskLogin.accessToken}`)
      .send({
        code: `${ctx.runId}-RBAC-PLAN`.toUpperCase(),
        name: "RBAC Forbidden Plan",
        description: "Role guard test",
        tierRank: 99,
        billingInterval: "month",
        priceAmount: 9.99,
        currency: "USD",
        active: true
      })
      .expect(403);
  });
});
