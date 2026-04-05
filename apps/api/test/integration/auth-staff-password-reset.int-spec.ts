import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Staff auth: email normalisation and password reset", () => {
  let ctx: IntegrationApp;
  let staffId: string;
  const initialPassword = "Passw0rd!";
  const resetPassword = "R3set-Passw0rd!";

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    const adminFixture = await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-norm-admin@aosanctuary.test`,
      fullName: "Normalisation Admin",
      role: "admin",
      password: initialPassword
    });

    staffId = adminFixture.id;
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  it("logs in with mixed-case email variant", async () => {
    const mixedCaseEmail = `${ctx.runId}-NORM-ADMIN@aosanctuary.test`.toUpperCase();
    const login = await loginFixture(ctx.http, mixedCaseEmail, initialPassword);
    expect(login.accessToken).toBeTruthy();
    expect(login.staffUser.id).toBe(staffId);
  });

  it("resets the staff password via the admin API", async () => {
    const adminLogin = await loginFixture(
      ctx.http,
      `${ctx.runId}-norm-admin@aosanctuary.test`,
      initialPassword
    );

    await ctx.http
      .patch(`/v1/staff-users/${staffId}/password`)
      .set("Authorization", `Bearer ${adminLogin.accessToken}`)
      .send({ password: resetPassword })
      .expect(200);
  });

  it("logs in with mixed-case email after password reset", async () => {
    const mixedCaseEmail = `${ctx.runId}-Norm-Admin@aosanctuary.test`;
    const login = await loginFixture(ctx.http, mixedCaseEmail, resetPassword);
    expect(login.accessToken).toBeTruthy();
    expect(login.staffUser.id).toBe(staffId);
  });
});
