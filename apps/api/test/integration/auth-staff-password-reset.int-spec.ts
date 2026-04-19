import { EmailService } from "../../src/email/email.service";
import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

const successfulDelivery = {
  provider: "dry-run" as const,
  accepted: true,
  deliveryId: "test-delivery-id"
};

describe("Integration - Staff password reset", () => {
  let ctx: IntegrationApp;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-staff@aosanctuary.test`,
      fullName: "Resettable Staff",
      role: "operations",
      password: "Passw0rd!"
    });
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  it("issues a reset token by email and allows one successful password reset", async () => {
    const emailService = ctx.app.get(EmailService);
    const sendSpy = jest
      .spyOn(emailService, "sendStaffPasswordReset")
      .mockResolvedValue(successfulDelivery);

    await ctx.http
      .post("/v1/auth/staff-password-reset/request")
      .send({ email: `${ctx.runId}-staff@aosanctuary.test` })
      .expect(201);

    expect(sendSpy).toHaveBeenCalledTimes(1);

    const [, resetToken] = sendSpy.mock.calls[0];
    expect(typeof resetToken).toBe("string");
    expect(resetToken.length).toBeGreaterThan(20);

    await ctx.http
      .post("/v1/auth/staff-password-reset/confirm")
      .send({ token: resetToken, newPassword: "N3wPassw0rd!" })
      .expect(201);

    await ctx.http
      .post("/v1/auth/login")
      .send({ email: `${ctx.runId}-staff@aosanctuary.test`, password: "Passw0rd!" })
      .expect(401);

    const loginResponse = await loginFixture(ctx.http, `${ctx.runId}-staff@aosanctuary.test`, "N3wPassw0rd!");
    expect(loginResponse.staffUser.email).toBe(`${ctx.runId}-staff@aosanctuary.test`);

    await ctx.http
      .post("/v1/auth/staff-password-reset/confirm")
      .send({ token: resetToken, newPassword: "An0therPassw0rd!" })
      .expect(400);

    sendSpy.mockRestore();
  });

  it("accepts mixed-case staff emails before and after an admin password reset", async () => {
    const adminUser = await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Admin Staff",
      role: "admin",
      password: "Adm1nPassw0rd!"
    });

    const targetUser = await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-target@aosanctuary.test`,
      fullName: "Mixed Case Staff",
      role: "operations",
      password: "StartPassw0rd!"
    });

    const adminLogin = await loginFixture(
      ctx.http,
      `${ctx.runId}-admin@aosanctuary.test`,
      "Adm1nPassw0rd!"
    );

    const mixedCaseEmail = `${ctx.runId}-Target@AOSanctuary.Test`;

    const initialLogin = await loginFixture(ctx.http, mixedCaseEmail, "StartPassw0rd!");
    expect(initialLogin.staffUser.email).toBe(targetUser.email);

    await ctx.http
      .patch(`/v1/staff-users/${targetUser.id}/password`)
      .set("Authorization", `Bearer ${adminLogin.accessToken}`)
      .send({ password: "ResetPassw0rd!" })
      .expect(200);

    const postResetLogin = await loginFixture(ctx.http, mixedCaseEmail, "ResetPassw0rd!");
    expect(postResetLogin.staffUser.email).toBe(targetUser.email);
    expect(postResetLogin.staffUser.id).toBe(targetUser.id);
  });

  it("does not send reset email for an inactive staff user", async () => {
    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-inactive@aosanctuary.test`,
      fullName: "Inactive Staff",
      role: "front_desk",
      password: "Passw0rd!",
      active: false
    });

    const emailService = ctx.app.get(EmailService);
    const sendSpy = jest
      .spyOn(emailService, "sendStaffPasswordReset")
      .mockResolvedValue(successfulDelivery);

    await ctx.http
      .post("/v1/auth/staff-password-reset/request")
      .send({ email: `${ctx.runId}-inactive@aosanctuary.test` })
      .expect(201);

    expect(sendSpy).not.toHaveBeenCalled();

    sendSpy.mockRestore();
  });
});