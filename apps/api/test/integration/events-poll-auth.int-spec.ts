import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Events Poll Auth", () => {
  let ctx: IntegrationApp;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Events Poll Admin",
      role: "admin",
      password: "Passw0rd!"
    });

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-ops@aosanctuary.test`,
      fullName: "Events Poll Ops",
      role: "operations",
      password: "Passw0rd!"
    });

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-frontdesk@aosanctuary.test`,
      fullName: "Events Poll Front Desk",
      role: "front_desk",
      password: "Passw0rd!"
    });

    await ensureEventPollingCursors();
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  async function ensureEventPollingCursors() {
    const eventTypes = [
      "LockerAccessEvent",
      "LockerPolicyDecisionEvent",
      "AccessAttempt",
      "PresenceEvent",
      "RoomAccessEvent",
      "StaffAuditEvent",
      "CleaningTask",
      "RoomBooking",
      "GuestAccessEvent",
      "SystemException",
      "AuthEvent"
    ] as const;

    const now = new Date();

    for (const eventType of eventTypes) {
      await (ctx.prisma as any).eventPollingCursor.upsert({
        where: { eventType },
        update: { lastPolledAt: now },
        create: {
          id: `${ctx.runId}-${eventType}`,
          eventType,
          lastPolledAt: now
        }
      });
    }
  }

  it("returns 401 when token is missing", async () => {
    await ctx.http.get("/v1/events/poll").expect(401);
  });

  it("returns 401 for invalid token", async () => {
    await ctx.http
      .get("/v1/events/poll")
      .set("Authorization", "Bearer invalid.token.value")
      .expect(401);
  });

  it("returns 403 for front_desk role", async () => {
    const frontDesk = await loginFixture(ctx.http, `${ctx.runId}-frontdesk@aosanctuary.test`, "Passw0rd!");

    await ctx.http
      .get("/v1/events/poll")
      .set("Authorization", `Bearer ${frontDesk.accessToken}`)
      .expect(403);
  });

  it("returns 200 for admin role", async () => {
    const admin = await loginFixture(ctx.http, `${ctx.runId}-admin@aosanctuary.test`, "Passw0rd!");

    const response = await ctx.http
      .get("/v1/events/poll")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.lastPolledAt).toBeDefined();
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(response.body.eventCounts).toBeDefined();
    expect(response.body.eventCounts.AuthEvent).toEqual(expect.any(Number));
  });

  it("returns 200 for operations role", async () => {
    const operations = await loginFixture(ctx.http, `${ctx.runId}-ops@aosanctuary.test`, "Passw0rd!");

    const response = await ctx.http
      .get("/v1/events/poll")
      .set("Authorization", `Bearer ${operations.accessToken}`)
      .expect(200);

    expect(response.body.lastPolledAt).toBeDefined();
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(response.body.eventCounts).toBeDefined();
    expect(response.body.eventCounts.AuthEvent).toEqual(expect.any(Number));
  });
});
