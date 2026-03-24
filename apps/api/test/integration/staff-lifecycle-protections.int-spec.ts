import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Staff lifecycle protections", () => {
  let ctx: IntegrationApp;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Lifecycle Admin",
      role: "admin",
      password: "Passw0rd!"
    });

    const login = await loginFixture(ctx.http, `${ctx.runId}-admin@aosanctuary.test`, "Passw0rd!");
    adminToken = login.accessToken;
    adminId = login.staffUser.id;
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  it("returns 409 when admin tries to deactivate self", async () => {
    const response = await ctx.http
      .patch(`/v1/staff-users/${adminId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(409);

    expect(String(response.body?.message ?? "")).toContain("CANNOT_DEACTIVATE_SELF");
  });

  it("returns 409 when attempting to remove the last active admin", async () => {
    const otherAdmins = await (ctx.prisma as any).staffUser.findMany({
      where: {
        role: "admin",
        id: { not: adminId }
      }
    });

    const previousStates: Array<{ id: string; active: boolean }> = [];

    for (const otherAdmin of otherAdmins) {
      previousStates.push({ id: otherAdmin.id, active: !!otherAdmin.active });
      if (otherAdmin.active) {
        await (ctx.prisma as any).staffUser.update({
          where: { id: otherAdmin.id },
          data: { active: false }
        });
      }
    }

    try {
      const response = await ctx.http
        .patch(`/v1/staff-users/${adminId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "operations" })
        .expect(409);

      expect(String(response.body?.message ?? "")).toContain("CANNOT_REMOVE_LAST_ACTIVE_ADMIN");
    } finally {
      for (const state of previousStates) {
        await (ctx.prisma as any).staffUser.update({
          where: { id: state.id },
          data: { active: state.active }
        });
      }
    }
  });
});
