import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Member Identity & Creation Flows", () => {
  let ctx: IntegrationApp;
  let staffToken: string;

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-staff@aosanctuary.test`,
      fullName: "Integration Staff",
      role: "admin",
      password: "Passw0rd!"
    });

    const login = await loginFixture(
      ctx.http,
      `${ctx.runId}-staff@aosanctuary.test`,
      "Passw0rd!"
    );
    staffToken = login.accessToken;
  });

  afterAll(async () => {
    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  describe("Anonymous Member Creation (Walk-in)", () => {
    it("creates anonymous member without email", async () => {
      const response = await ctx.http
        .post("/v1/identity/members/anonymous")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ alias: "TestWalkIn" })
        .expect(201);

      expect(response.body).toMatchObject({
        type: "anonymous",
        alias: "TestWalkIn",
        email: null,
        status: "active"
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.publicMemberNumber).toBeDefined();
      expect(response.body.wristband).toBeDefined();
      expect(response.body.wristband.id).toBeDefined();
      expect(response.body.wristband.uid).toBeDefined();
      expect(response.body.wristband.status).toBe("pending_activation");
    });

    it("creates anonymous member without alias", async () => {
      const response = await ctx.http
        .post("/v1/identity/members/anonymous")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        type: "anonymous",
        email: null,
        status: "active"
      });
      expect(response.body.alias).toBeNull();
    });

    it("verifies wristband assignment", async () => {
      const createResponse = await ctx.http
        .post("/v1/identity/members/anonymous")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ alias: "WristbandTest" })
        .expect(201);

      const memberId = createResponse.body.id;
      const wristbandId = createResponse.body.wristband.id;

      // Verify wristband exists in database
      const wristband = await ctx.prisma.wristband.findUnique({
        where: { id: wristbandId }
      });

      expect(wristband).toBeDefined();
      expect(wristband?.status).toBe("pending_activation");

      // Verify assignment exists
      const assignment = await ctx.prisma.wristbandAssignment.findFirst({
        where: { wristbandId, memberId }
      });

      expect(assignment).toBeDefined();
      expect(assignment?.active).toBe(true);
    });
  });

  describe("Admin-Created Registered Member", () => {
    it("creates registered member and sends invite", async () => {
      const email = `${ctx.runId}-registered@aosanctuary.test`;
      const response = await ctx.http
        .post("/v1/identity/members/registered")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email,
          displayName: "Test User"
        })
        .expect(201);

      expect(response.body).toMatchObject({
        type: "registered",
        email,
        displayName: "Test User",
        status: "pending"
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.wristband).toBeDefined();
      expect(response.body.wristband.status).toBe("pending_activation");
    });

    it("rejects duplicate email", async () => {
      const email = `${ctx.runId}-duplicate@aosanctuary.test`;

      // Create first member
      await ctx.http
        .post("/v1/identity/members/registered")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ email })
        .expect(201);

      // Try to create another with same email
      await ctx.http
        .post("/v1/identity/members/registered")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ email })
        .expect(409);
    });

    it("requires staff authorization", async () => {
      await ctx.http
        .post("/v1/identity/members/registered")
        .send({
          email: `${ctx.runId}-noauth@aosanctuary.test`,
          displayName: "No Auth"
        })
        .expect(401);
    });
  });

  describe("Member Conversion (Anonymous → Registered)", () => {
    it("converts anonymous member to registered", async () => {
      // Create anonymous member
      const anonResponse = await ctx.http
        .post("/v1/identity/members/anonymous")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ alias: "ConvertMe" })
        .expect(201);

      const memberId = anonResponse.body.id;
      const email = `${ctx.runId}-converted@aosanctuary.test`;

      // Convert to registered
      const convertResponse = await ctx.http
        .post(`/v1/identity/members/${memberId}/convert`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email,
          password: "SecurePassword123!"
        })
        .expect(201);

      expect(convertResponse.body).toMatchObject({
        id: memberId,
        type: "registered",
        email,
        status: "pending"
      });

      // Verify AuthAccount was created
      const authAccount = await ctx.prisma.authAccount.findUnique({
        where: { memberId }
      });
      expect(authAccount).toBeDefined();
    });

    it("requires member to be anonymous", async () => {
      // Create registered member
      const email = `${ctx.runId}-already-reg@aosanctuary.test`;
      const regResponse = await ctx.http
        .post("/v1/identity/members/registered")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ email })
        .expect(201);

      // Try to convert registered member
      await ctx.http
        .post(`/v1/identity/members/${regResponse.body.id}/convert`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email: `${ctx.runId}-other@aosanctuary.test`,
          password: "Another123!"
        })
        .expect(400);
    });

    it("preserves existing wristband on conversion", async () => {
      // Create anonymous member
      const anonResponse = await ctx.http
        .post("/v1/identity/members/anonymous")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ alias: "PreserveWB" })
        .expect(201);

      const originalWristbandId = anonResponse.body.wristband.id;
      const memberId = anonResponse.body.id;

      // Convert to registered
      const convertResponse = await ctx.http
        .post(`/v1/identity/members/${memberId}/convert`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          email: `${ctx.runId}-preserve@aosanctuary.test`
        })
        .expect(201);

      // Wristband should be included and unchanged
      expect(convertResponse.body.wristband.id).toBe(originalWristbandId);
    });
  });

  describe("Self-Serve Signup", () => {
    it("creates registered member via self-serve signup", async () => {
      const email = `${ctx.runId}-signup@aosanctuary.test`;
      const response = await ctx.http
        .post("/v1/auth/signup")
        .send({
          email,
          password: "SignupPassword123!"
        })
        .expect(201);

      expect(response.body).toMatchObject({ email });

      // Verify member was created in database
      const member = await ctx.prisma.member.findUnique({ where: { email } });
      expect(member).toBeDefined();
      expect(member?.type).toBe("registered");
      expect(member?.status).toBe("pending");

      // Verify AuthAccount exists
      const authAccount = await ctx.prisma.authAccount.findUnique({
        where: { memberId: member!.id }
      });
      expect(authAccount).toBeDefined();

      // Verify wristband was created
      const assignment = await ctx.prisma.wristbandAssignment.findFirst({
        where: { memberId: member!.id }
      });
      expect(assignment).toBeDefined();
    });

    it("rejects duplicate email on signup", async () => {
      const email = `${ctx.runId}-dup-signup@aosanctuary.test`;

      // First signup
      await ctx.http
        .post("/v1/auth/signup")
        .send({
          email,
          password: "FirstPassword123!"
        })
        .expect(201);

      // Second signup with same email
      await ctx.http
        .post("/v1/auth/signup")
        .send({
          email,
          password: "SecondPassword123!"
        })
        .expect(409);
    });
  });

  describe("Admin Password Reset", () => {
    it("generates password reset link for member", async () => {
      // Create a registered member first
      const email = `${ctx.runId}-reset@aosanctuary.test`;
      const createResponse = await ctx.http
        .post("/v1/identity/members/registered")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ email })
        .expect(201);

      const memberId = createResponse.body.id;

      // Trigger admin password reset
      const resetResponse = await ctx.http
        .post(`/v1/admin/members/${memberId}/password-reset`)
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(201);

      expect(resetResponse.body).toMatchObject({
        email,
        resetLink: expect.stringContaining("reset-password?token=")
      });
    });

    it("requires member to have email for reset", async () => {
      // Create anonymous member (no email)
      const anonResponse = await ctx.http
        .post("/v1/identity/members/anonymous")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ alias: "NoEmail" })
        .expect(201);

      // Try to reset password
      await ctx.http
        .post(`/v1/admin/members/${anonResponse.body.id}/password-reset`)
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(400);
    });
  });

  describe("Wristband Integration", () => {
    it("all member creation flows include wristband", async () => {
      const flows = [
        {
          name: "anonymous",
          fn: () =>
            ctx.http
              .post("/v1/identity/members/anonymous")
              .set("Authorization", `Bearer ${staffToken}`)
              .send({ alias: "WB-Test" })
        },
        {
          name: "registered",
          fn: () =>
            ctx.http
              .post("/v1/identity/members/registered")
              .set("Authorization", `Bearer ${staffToken}`)
              .send({ email: `${ctx.runId}-wb-reg@aosanctuary.test` })
        },
        {
          name: "signup",
          fn: () =>
            ctx.http
              .post("/v1/auth/signup")
              .send({ email: `${ctx.runId}-wb-signup@aosanctuary.test`, password: "Pwd123!" })
        }
      ];

      for (const flow of flows) {
        const response = await flow.fn().expect(201);
        expect(response.body.wristband).toBeDefined(); // ${flow.name} should include wristband
        expect(response.body.wristband.id).toBeDefined();
        expect(response.body.wristband.uid).toBeDefined();
        expect(response.body.wristband.status).toBe("pending_activation");
      }
    });
  });
});
