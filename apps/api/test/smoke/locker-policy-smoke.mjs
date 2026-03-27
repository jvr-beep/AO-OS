/**
 * AO-OS Permanent Smoke Harness — Locker Policy Engine + Credential Lifecycle
 *
 * Validates core operational workflows:
 * - Credential lifecycle (issue → activate → suspend → replace)
 * - Locker policy evaluation and assignment
 * - Hard-blocked status denial and override handling
 * - Member access event logging
 *
 * Requirements:
 * - Running API server (AO_SMOKE_BASE_URL env var, default: http://localhost:4000/v1)
 * - Valid admin credentials (admin@ao-os.dev / AdminPass123!)
 * - At least one Location row in database
 * - All migrations applied (up to locker policy engine)
 *
 * Run:
 *   pnpm smoke:locker-policy
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.AO_SMOKE_BASE_URL ?? "http://localhost:4000/v1";
const TS = Date.now();

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, body: json };
}

const post = (path, body, token) => request("POST", path, body, token);
const get = (path, token) => request("GET", path, null, token);

const cases = [];

function record(name, req, res, notes) {
  const pass = res.status >= 200 && res.status < 300;
  cases.push({ name, req, res, notes, pass });

  const icon = pass ? "OK" : "FAIL";
  console.log(`\n${icon} [${res.status}] ${name}`);
  if (!pass) {
    console.log("  BODY:", JSON.stringify(res.body, null, 2));
  }
  if (notes) {
    console.log("  NOTE:", notes);
  }
}

async function resolveSiteId() {
  const explicitSiteId = process.env.AO_SMOKE_LOCATION_ID;

  if (explicitSiteId) {
    const location = await prisma.location.findUnique({ where: { id: explicitSiteId } });
    if (!location) {
      throw new Error(
        `AO_SMOKE_LOCATION_ID was provided but not found in Location table: ${explicitSiteId}`
      );
    }

    return location.id;
  }

  const location = await prisma.location.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true }
  });

  if (!location) {
    throw new Error(
      "No Location rows found. Create at least one Location first, then re-run smoke."
    );
  }

  console.log(`Using location ${location.id} (${location.code} / ${location.name})`);
  return location.id;
}

async function main() {
  console.log("=== AO-OS Smoke Pass — Locker Policy Engine + Credential Lifecycle ===\n");

  const siteId = await resolveSiteId();

  const loginRes = await post("/auth/login", {
    email: "admin@ao-os.dev",
    password: "AdminPass123!"
  });

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error("FATAL: Login failed", loginRes);
    process.exit(1);
  }

  const token = loginRes.body.accessToken;
  console.log("Authenticated as admin\n");

  const planRes = await post(
    "/membership-plans",
    {
      code: `STANDARD-${TS}`,
      name: "Standard",
      tierRank: 1,
      billingInterval: "month",
      priceAmount: 4999,
      currency: "USD",
      active: true
    },
    token
  );
  if (planRes.status !== 201) {
    console.error("Setup failed: plan create", planRes.body);
    process.exit(1);
  }
  const planId = planRes.body.id;

  const memberRes = await post(
    "/members",
    {
      email: `smoke-${TS}@ao-os.test`,
      firstName: "Smoke",
      lastName: "Tester"
    },
    token
  );
  if (memberRes.status !== 201) {
    console.error("Setup failed: member create", memberRes.body);
    process.exit(1);
  }
  const memberId = memberRes.body.id;

  const subRes = await post(
    "/subscriptions",
    {
      memberId,
      membershipPlanId: planId,
      billingProvider: "manual",
      status: "active",
      startDate: new Date().toISOString()
    },
    token
  );
  if (subRes.status !== 201) {
    console.error("Setup failed: subscription create", subRes.body);
    process.exit(1);
  }

  const lockerRes = await post(
    "/lockers",
    {
      code: `LK-SMOKE-${TS}`,
      locationId: siteId,
      status: "available",
      supportsDayUse: true,
      supportsAssignedUse: true,
      active: true
    },
    token
  );
  if (lockerRes.status !== 201) {
    console.error("Setup failed: locker create", lockerRes.body);
    process.exit(1);
  }
  const lockerId = lockerRes.body.id;

  const hardBlockedStatuses = ["maintenance", "offline", "forced_open", "out_of_service"];
  const hardBlockedLockers = [];

  for (const status of hardBlockedStatuses) {
    const createRes = await post(
      "/lockers",
      {
        code: `LK-${status.toUpperCase().replaceAll("_", "-")}-${TS}`,
        locationId: siteId,
        status,
        supportsDayUse: true,
        supportsAssignedUse: true,
        active: true
      },
      token
    );

    if (createRes.status !== 201) {
      console.error(`Setup failed: ${status} locker create`, createRes.body);
      process.exit(1);
    }

    hardBlockedLockers.push({ status, id: createRes.body.id });
  }

  const issueRes = await post("/wristbands/issue", { uid: `WB-SMOKE-${TS}`, memberId }, token);
  record("CASE 1 — Issue Credential", { memberId }, issueRes, `status: ${issueRes.body?.status}`);
  if (!issueRes.body?.id) process.exit(1);

  const credentialId = issueRes.body.id;

  const activateRes = await post("/wristbands/activate", { credentialId }, token);
  record("CASE 2 — Activate Credential", { credentialId }, activateRes, `status: ${activateRes.body?.status}`);

  const suspendRes = await post("/wristbands/suspend", { credentialId }, token);
  record("CASE 3 — Suspend Credential", { credentialId }, suspendRes, `status: ${suspendRes.body?.status}`);

  const replaceRes = await post(
    "/wristbands/replace",
    { oldCredentialId: credentialId, newCredentialUid: `WB-SMOKE-R-${TS}` },
    token
  );
  record("CASE 4 — Replace Credential", { oldCredentialId: credentialId }, replaceRes, `status: ${replaceRes.body?.status}`);
  if (!replaceRes.body?.id) process.exit(1);

  const newCredentialId = replaceRes.body.id;
  await post("/wristbands/activate", { credentialId: newCredentialId }, token);

  const checkInRes = await post(
    "/visit-sessions/check-in",
    { memberId, locationId: siteId, checkInAt: new Date().toISOString() },
    token
  );
  if (checkInRes.status !== 201) {
    console.error("Setup failed: check-in", checkInRes.body);
    process.exit(1);
  }
  const sessionId = checkInRes.body.id;

  const evalRes = await post(
    "/lockers/policy/evaluate",
    {
      memberId,
      credentialId: newCredentialId,
      siteId,
      sessionId,
      requestMode: "day_use_shared"
    },
    token
  );
  record("CASE 5 — Evaluate Locker Policy", { memberId, sessionId }, evalRes, `decision: ${evalRes.body?.decision}`);

  const assignRes = await post(
    "/lockers/assign",
    {
      lockerId,
      memberId,
      siteId,
      visitSessionId: sessionId,
      assignmentMode: "day_use_shared"
    },
    token
  );
  record("CASE 6 — Assign Locker", { lockerId, memberId }, assignRes, `assignmentMode: ${assignRes.body?.assignmentMode}`);

  const unassignRes = await post(
    "/lockers/unassign",
    { lockerId, unassignedReason: "visit_complete" },
    token
  );
  record("CASE 7 — Release Locker", { lockerId }, unassignRes, `active: ${unassignRes.body?.active}`);

  const eventsRes = await get(`/members/${memberId}/locker-policy-events`, token);
  record("CASE 8 — Member Locker Policy Event History", { memberId }, eventsRes, `count: ${Array.isArray(eventsRes.body) ? eventsRes.body.length : "N/A"}`);

  for (const { status, id } of hardBlockedLockers) {
    const evalOverrideRes = await post(
      "/lockers/policy/evaluate",
      {
        memberId,
        credentialId: newCredentialId,
        siteId,
        sessionId,
        requestMode: "staff_override",
        requestedLockerId: id,
        staffOverride: true,
        staffOverrideReason: `Smoke override hard-block check (${status})`
      },
      token
    );

    const evalPass =
      (evalOverrideRes.status === 200 || evalOverrideRes.status === 201) &&
      evalOverrideRes.body?.decision === "deny" &&
      evalOverrideRes.body?.reasonCode === "LOCKER_HARD_BLOCKED_STATUS";

    record(
      `CASE 9-${status} — Override Evaluate Denied (${status})`,
      { lockerId: id, status },
      {
        status: evalPass ? 200 : evalOverrideRes.status,
        body: evalOverrideRes.body
      },
      `decision=${evalOverrideRes.body?.decision}, reasonCode=${evalOverrideRes.body?.reasonCode}`
    );

    const assignOverrideRes = await post(
      "/lockers/assign",
      {
        lockerId: id,
        memberId,
        siteId,
        visitSessionId: sessionId,
        assignmentMode: "staff_override",
        staffOverrideReason: `Smoke assign hard-block check (${status})`
      },
      token
    );

    const assignPass =
      assignOverrideRes.status === 409 &&
      (assignOverrideRes.body?.message === "LOCKER_OUT_OF_SERVICE" ||
        (Array.isArray(assignOverrideRes.body?.message) &&
          assignOverrideRes.body.message.includes("LOCKER_OUT_OF_SERVICE")));

    record(
      `CASE 10-${status} — Override Assign Hard-Blocked (${status})`,
      { lockerId: id, status },
      {
        status: assignPass ? 200 : assignOverrideRes.status,
        body: assignOverrideRes.body
      },
      `http=${assignOverrideRes.status}, message=${JSON.stringify(assignOverrideRes.body?.message)}`
    );
  }

  console.log("\n============================================================");
  console.log("SMOKE PASS SUMMARY");
  console.log("============================================================");
  const passed = cases.filter((c) => c.pass).length;
  const failed = cases.length - passed;
  console.log(`PASS: ${passed}  FAIL: ${failed}  TOTAL: ${cases.length}`);

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
