import { GoogleWorkspaceProvisioningService } from "../../src/staff-users/services/google-workspace-provisioning.service";
import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Staff provisioning", () => {
  let ctx: IntegrationApp;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Provisioning Admin",
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

  it("provisions a workspace-backed staff user and stores normalized AO OS staff data", async () => {
    const workspaceService = ctx.app.get(GoogleWorkspaceProvisioningService);
    const provisionSpy = jest
      .spyOn(workspaceService, "provisionUser")
      .mockResolvedValue(undefined);

    const response = await ctx.http
      .post("/v1/staff-users/provision")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: ` ${ctx.runId}-ops@aosanctuary.com `,
        password: "Passw0rd!",
        givenName: "  Ops ",
        familyName: " Lead  ",
        role: "operations",
        alias: `${ctx.runId}.alias@aosanctuary.com`
      })
      .expect(201);

    expect(response.body.email).toBe(`${ctx.runId}-ops@aosanctuary.com`);
    expect(response.body.fullName).toBe("Ops Lead");
    expect(response.body.role).toBe("operations");
    expect(response.body.active).toBe(true);

    expect(provisionSpy).toHaveBeenCalledWith({
      primaryEmail: `${ctx.runId}-ops@aosanctuary.com`,
      givenName: "Ops",
      familyName: "Lead",
      fullName: "Ops Lead",
      password: "Passw0rd!",
      alias: `${ctx.runId}.alias@aosanctuary.com`
    });

    const storedUser = await (ctx.prisma as any).staffUser.findUnique({
      where: { email: `${ctx.runId}-ops@aosanctuary.com` }
    });

    expect(storedUser).not.toBeNull();
    expect(storedUser.fullName).toBe("Ops Lead");
    expect(storedUser.passwordHash).not.toBe("Passw0rd!");

    const auditEvent = await (ctx.prisma as any).staffAuditEvent.findFirst({
      where: {
        targetStaffUserId: storedUser.id,
        eventType: "STAFF_USER_CREATED"
      },
      orderBy: { occurredAt: "desc" }
    });

    expect(auditEvent).not.toBeNull();
    expect(auditEvent.metadataJson.workspaceProvisioned).toBe(true);

    provisionSpy.mockRestore();
  });

  it("syncs Workspace suspension when deactivating and reactivating managed staff users", async () => {
    const managedUser = await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-managed@aosanctuary.com`,
      fullName: "Managed Staff",
      role: "operations",
      password: "Passw0rd!"
    });

    const workspaceService = ctx.app.get(GoogleWorkspaceProvisioningService);
    const suspendSpy = jest
      .spyOn(workspaceService, "setSuspendedState")
      .mockResolvedValue(undefined);

    await ctx.http
      .patch(`/v1/staff-users/${managedUser.id}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    await ctx.http
      .patch(`/v1/staff-users/${managedUser.id}/reactivate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    expect(suspendSpy).toHaveBeenNthCalledWith(1, {
      primaryEmail: `${ctx.runId}-managed@aosanctuary.com`,
      suspended: true
    });
    expect(suspendSpy).toHaveBeenNthCalledWith(2, {
      primaryEmail: `${ctx.runId}-managed@aosanctuary.com`,
      suspended: false
    });

    const deactivateAudit = await (ctx.prisma as any).staffAuditEvent.findFirst({
      where: {
        targetStaffUserId: managedUser.id,
        eventType: "STAFF_USER_DEACTIVATED"
      },
      orderBy: { occurredAt: "desc" }
    });
    const reactivateAudit = await (ctx.prisma as any).staffAuditEvent.findFirst({
      where: {
        targetStaffUserId: managedUser.id,
        eventType: "STAFF_USER_REACTIVATED"
      },
      orderBy: { occurredAt: "desc" }
    });

    expect(deactivateAudit.metadataJson.workspaceSuspended).toBe(true);
    expect(reactivateAudit.metadataJson.workspaceSuspended).toBe(false);

    suspendSpy.mockRestore();
  });

  it("returns 409 when provisioning a duplicate staff email", async () => {
    const workspaceService = ctx.app.get(GoogleWorkspaceProvisioningService);
    const provisionSpy = jest
      .spyOn(workspaceService, "provisionUser")
      .mockResolvedValue(undefined);

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-duplicate@aosanctuary.com`,
      fullName: "Existing Staff",
      role: "front_desk",
      password: "Passw0rd!"
    });

    const response = await ctx.http
      .post("/v1/staff-users/provision")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: `${ctx.runId}-duplicate@aosanctuary.com`,
        password: "Passw0rd!",
        givenName: "Dup",
        familyName: "User",
        role: "operations"
      })
      .expect(409);

    expect(String(response.body?.message ?? "")).toContain("STAFF_USER_EMAIL_TAKEN");
    expect(provisionSpy).not.toHaveBeenCalled();

    provisionSpy.mockRestore();
  });

  it("rolls back the AO OS staff user when Workspace provisioning fails", async () => {
    const workspaceService = ctx.app.get(GoogleWorkspaceProvisioningService);
    const provisionSpy = jest
      .spyOn(workspaceService, "provisionUser")
      .mockRejectedValue(new Error("GOOGLE_WORKSPACE_PROVISION_FAILED"));

    await ctx.http
      .post("/v1/staff-users/provision")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: `${ctx.runId}-rollback@aosanctuary.com`,
        password: "Passw0rd!",
        givenName: "Rollback",
        familyName: "Target",
        role: "operations"
      })
      .expect(500);

    const storedUser = await (ctx.prisma as any).staffUser.findUnique({
      where: { email: `${ctx.runId}-rollback@aosanctuary.com` }
    });

    expect(storedUser).toBeNull();

    const auditEvent = await (ctx.prisma as any).staffAuditEvent.findFirst({
      where: {
        targetEmailSnapshot: `${ctx.runId}-rollback@aosanctuary.com`,
        eventType: "STAFF_USER_CREATED",
        outcome: "success"
      }
    });

    expect(auditEvent).toBeNull();

    provisionSpy.mockRestore();
  });
});