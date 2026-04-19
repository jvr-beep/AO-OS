import { closeIntegrationApp, createIntegrationApp, IntegrationApp } from "../helpers/test-app";
import { cleanupByRunId, createStaffUserFixture, loginFixture } from "../helpers/fixtures";

describe("Integration - Guest Visit Orchestration", () => {
  let ctx: IntegrationApp;
  let adminToken: string;

  // Domain fixture IDs (new guest-visit domain)
  let guestId: string;
  let tierId: string;
  const resourceIds: string[] = [];
  let wristbandId: string;

  // Collected IDs for afterAll cleanup
  const visitIds: string[] = [];
  const bookingIds: string[] = [];

  beforeAll(async () => {
    ctx = await createIntegrationApp();

    await createStaffUserFixture(ctx.prisma, {
      email: `${ctx.runId}-admin@aosanctuary.test`,
      fullName: "Orch Admin",
      role: "admin",
      password: "Passw0rd!"
    });

    const login = await loginFixture(
      ctx.http,
      `${ctx.runId}-admin@aosanctuary.test`,
      "Passw0rd!"
    );
    adminToken = login.accessToken;

    // Resolve the seeded default location so inventory queries (which filter by
    // locationId when LocationMiddleware resolves one) can find our test resources.
    const defaultLocation = await ctx.prisma.location.findUnique({
      where: { code: "AO_TORONTO" }
    });
    const locationId = defaultLocation?.id ?? null;

    // Guest
    const guest = await ctx.prisma.guest.create({
      data: { firstName: "Orch", lastName: "Test", locationId }
    });
    guestId = guest.id;

    // Tier
    const tier = await ctx.prisma.tier.create({
      data: {
        productType: "locker",
        code: `${ctx.runId.slice(0, 12).toUpperCase()}-LK`,
        name: "Standard Locker",
        basePriceCents: 2500,
        locationId
      }
    });
    tierId = tier.id;

    // Two resources so walk-in and booking tests each get their own
    for (const label of ["L-001", "L-002", "L-003"]) {
      const r = await ctx.prisma.resource.create({
        data: {
          resourceType: "locker",
          displayLabel: label,
          tierId,
          locationId,
          zoneCode: "ZONE-A",
          status: "available"
        }
      });
      resourceIds.push(r.id);
    }

    // Wristband for access-event tests
    const wristband = await ctx.prisma.wristband.create({
      data: { uid: `UID-${ctx.runId}` }
    });
    wristbandId = wristband.id;
  });

  afterAll(async () => {
    // Collect any orphaned visits created by the orchestrator that were never
    // captured in visitIds (e.g. when a test failed before pushing the id)
    if (guestId && tierId) {
      const orphaned = await ctx.prisma.visit.findMany({
        where: { guestId, tierId, id: { notIn: visitIds.length ? visitIds : ["_none_"] } },
        select: { id: true }
      });
      orphaned.forEach((v) => visitIds.push(v.id));
    }

    // Delete in dependency order (FK-safe)
    if (visitIds.length) {
      await ctx.prisma.systemException.deleteMany({
        where: { visitId: { in: visitIds } }
      });
      await ctx.prisma.guestAccessEvent.deleteMany({
        where: { visitId: { in: visitIds } }
      });
      await ctx.prisma.accessPermission.deleteMany({
        where: { visitId: { in: visitIds } }
      });
      await ctx.prisma.paymentTransaction.deleteMany({
        where: { visitId: { in: visitIds } }
      });
      // ResourceHolds reference both visitId and resourceId
      await ctx.prisma.resourceHold.deleteMany({
        where: {
          OR: [
            { visitId: { in: visitIds } },
            { resourceId: { in: resourceIds } }
          ]
        }
      });
      // Folio cascades FolioLineItems
      await ctx.prisma.folio.deleteMany({
        where: { visitId: { in: visitIds } }
      });
      await ctx.prisma.visitStatusHistory.deleteMany({
        where: { visitId: { in: visitIds } }
      });
    }

    if (resourceIds.length) {
      await ctx.prisma.resourceStateHistory.deleteMany({
        where: { resourceId: { in: resourceIds } }
      });
    }

    if (visitIds.length) {
      await ctx.prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
    }
    if (bookingIds.length) {
      await ctx.prisma.guestBooking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    if (resourceIds.length) {
      await ctx.prisma.resource.deleteMany({ where: { id: { in: resourceIds } } });
    }
    if (tierId) {
      await ctx.prisma.tier.deleteMany({ where: { id: tierId } });
    }
    if (guestId) {
      await ctx.prisma.guest.deleteMany({ where: { id: guestId } });
    }
    if (wristbandId) {
      await ctx.prisma.wristband.deleteMany({ where: { id: wristbandId } });
    }

    await cleanupByRunId(ctx.prisma, ctx.runId);
    await closeIntegrationApp(ctx);
  });

  // ── Walk-in ──────────────────────────────────────────────────────────────

  it("walk-in check-in creates visit, folio, and assigns a resource", async () => {
    const res = await ctx.http
      .post("/v1/orchestrators/check-in/walk-in")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        guest_id: guestId,
        tier_id: tierId,
        product_type: "locker",
        duration_minutes: 90,
        quoted_price_cents: 2500,
        amount_paid_cents: 2500,
        payment_provider: "stripe"
      })
      .expect(201);

    expect(res.body.flow).toBe("walk_in_check_in");
    expect(res.body.visit_id).toBeDefined();
    expect(res.body.folio_id).toBeDefined();
    expect(res.body.resource_id).toBeDefined();
    expect(res.body.status).toBe("checked_in");

    visitIds.push(res.body.visit_id);
  });

  it("checkout succeeds for a paid walk-in visit with zero balance", async () => {
    // Create a fresh guest+visit via walk-in so this test is self-contained
    const walkinRes = await ctx.http
      .post("/v1/orchestrators/check-in/walk-in")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        guest_id: guestId,
        tier_id: tierId,
        product_type: "locker",
        duration_minutes: 60,
        quoted_price_cents: 2500,
        amount_paid_cents: 2500,
        payment_provider: "cash"
      })
      .expect(201);

    const visitId = walkinRes.body.visit_id;
    visitIds.push(visitId);

    const checkoutRes = await ctx.http
      .post("/v1/orchestrators/checkout")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ visit_id: visitId, check_out_channel: "staff" })
      .expect(201);

    expect(checkoutRes.body.flow).toBe("checkout");
    expect(checkoutRes.body.status).toBe("checked_out");
    expect(checkoutRes.body.visit_id).toBe(visitId);
  });

  it("checkout returns 409 when visit has an outstanding folio balance", async () => {
    // Create a visit + folio with outstanding balance directly via Prisma
    const bareVisit = await ctx.prisma.visit.create({
      data: {
        guestId,
        tierId,
        sourceType: "walk_in",
        productType: "locker",
        durationMinutes: 60,
        status: "active",
        paymentStatus: "unpaid"
      }
    });
    visitIds.push(bareVisit.id);

    await ctx.prisma.folio.create({
      data: {
        visitId: bareVisit.id,
        subtotalCents: 2500,
        totalDueCents: 2500,
        balanceDueCents: 2500,
        paymentStatus: "unpaid"
      }
    });

    const res = await ctx.http
      .post("/v1/orchestrators/checkout")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ visit_id: bareVisit.id, check_out_channel: "kiosk" })
      .expect(409);

    expect(String(res.body?.message ?? "")).toContain("Outstanding folio balance");
  });

  it("checkout returns 409 when visit is already in a terminal status", async () => {
    // Use the visit that was just checked out in the previous checkout test
    // We need a checked-out visit — create one directly
    const doneVisit = await ctx.prisma.visit.create({
      data: {
        guestId,
        tierId,
        sourceType: "walk_in",
        productType: "locker",
        durationMinutes: 60,
        status: "checked_out",
        paymentStatus: "paid"
      }
    });
    visitIds.push(doneVisit.id);

    await ctx.prisma.folio.create({
      data: { visitId: doneVisit.id }
    });

    const res = await ctx.http
      .post("/v1/orchestrators/checkout")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ visit_id: doneVisit.id, check_out_channel: "staff" })
      .expect(409);

    expect(String(res.body?.message ?? "")).toContain("not eligible for checkout");
  });

  // ── Booking check-in ─────────────────────────────────────────────────────

  it("booking check-in creates visit and folio, marks booking checked_in", async () => {
    const booking = await ctx.prisma.guestBooking.create({
      data: {
        guestId,
        tierId,
        productType: "locker",
        bookingDate: new Date(),
        arrivalWindowStart: new Date(),
        arrivalWindowEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
        durationMinutes: 90,
        status: "reserved",
        bookingCode: `AO-${ctx.runId.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase()}`
      }
    });
    bookingIds.push(booking.id);

    const res = await ctx.http
      .post("/v1/orchestrators/check-in/booking")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ booking_id: booking.id })
      .expect(201);

    expect(res.body.flow).toBe("booking_check_in");
    expect(res.body.booking_id).toBe(booking.id);
    expect(res.body.visit_id).toBeDefined();
    expect(res.body.folio_id).toBeDefined();

    visitIds.push(res.body.visit_id);

    // Booking status should now be checked_in
    const updatedBooking = await ctx.prisma.guestBooking.findUnique({
      where: { id: booking.id }
    });
    expect(updatedBooking?.status).toBe("checked_in");
  });

  it("booking check-in returns 409 when booking is already checked_in", async () => {
    const booking = await ctx.prisma.guestBooking.create({
      data: {
        guestId,
        tierId,
        productType: "locker",
        bookingDate: new Date(),
        arrivalWindowStart: new Date(),
        arrivalWindowEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
        durationMinutes: 60,
        status: "checked_in",
        bookingCode: `AO-${ctx.runId.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}X2`
      }
    });
    bookingIds.push(booking.id);

    const res = await ctx.http
      .post("/v1/orchestrators/check-in/booking")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ booking_id: booking.id })
      .expect(409);

    expect(String(res.body?.message ?? "")).toContain("checked_in");
  });

  // ── Guest Access ──────────────────────────────────────────────────────────

  it("denied access event auto-creates a system exception", async () => {
    // Create a visit to associate with the event
    const visit = await ctx.prisma.visit.create({
      data: {
        guestId,
        tierId,
        sourceType: "walk_in",
        productType: "locker",
        durationMinutes: 60,
        status: "active",
        paymentStatus: "paid"
      }
    });
    visitIds.push(visit.id);

    const evtRes = await ctx.http
      .post("/v1/guest-access/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        wristband_id: wristbandId,
        visit_id: visit.id,
        reader_id: "READER-01",
        zone_code: "SPA-A",
        access_result: "denied",
        denial_reason: "permission_expired",
        event_time: new Date().toISOString()
      })
      .expect(201);

    expect(evtRes.body.access_result).toBe("denied");

    // A system exception should have been auto-created
    const exception = await ctx.prisma.systemException.findFirst({
      where: { visitId: visit.id, exceptionType: "guest_access_denied" }
    });
    expect(exception).not.toBeNull();
    expect(exception?.severity).toBe("warning");
    expect(exception?.status).toBe("open");
  });

  it("granted access event does NOT create a system exception", async () => {
    const visit = await ctx.prisma.visit.create({
      data: {
        guestId,
        tierId,
        sourceType: "walk_in",
        productType: "locker",
        durationMinutes: 60,
        status: "active",
        paymentStatus: "paid"
      }
    });
    visitIds.push(visit.id);

    await ctx.http
      .post("/v1/guest-access/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        wristband_id: wristbandId,
        visit_id: visit.id,
        reader_id: "READER-02",
        zone_code: "POOL-B",
        access_result: "granted",
        event_time: new Date().toISOString()
      })
      .expect(201);

    const count = await ctx.prisma.systemException.count({
      where: { visitId: visit.id }
    });
    expect(count).toBe(0);
  });

  // ── Ops ───────────────────────────────────────────────────────────────────

  it("ops snapshot returns counts including active visits", async () => {
    const res = await ctx.http
      .get("/v1/ops/snapshot")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(typeof res.body.open_exceptions).toBe("number");
    expect(typeof res.body.active_visits).toBe("number");
    expect(typeof res.body.held_resources).toBe("number");
    expect(typeof res.body.occupied_resources).toBe("number");
    expect(res.body.active_visits).toBeGreaterThan(0);
  });

  it("creates and resolves a system exception", async () => {
    const createRes = await ctx.http
      .post("/v1/ops/exceptions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        exception_type: "integration_test_exception",
        severity: "info",
        payload: { source: "integration-test", runId: ctx.runId }
      })
      .expect(201);

    expect(createRes.body.exception_type).toBe("integration_test_exception");
    expect(createRes.body.status).toBe("open");

    const exceptionId = createRes.body.id;

    const resolveRes = await ctx.http
      .patch(`/v1/ops/exceptions/${exceptionId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "resolved", resolution_note: "Fixed in integration test" })
      .expect(200);

    expect(resolveRes.body.status).toBe("resolved");
    expect(resolveRes.body.resolved_at).toBeDefined();

    // Clean up the exception we just created
    await ctx.prisma.systemException.deleteMany({ where: { id: exceptionId } });
  });
});
