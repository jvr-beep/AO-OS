import {
  Member,
  MembershipPlan,
  PrismaClient,
  StaffRole,
  StaffUser,
  SubscriptionStatus,
  VisitSession
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import request from "supertest";

export type AuthLogin = {
  accessToken: string;
  staffUser: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

export async function createStaffUserFixture(
  prisma: PrismaClient,
  input: {
    email: string;
    fullName: string;
    role: StaffRole;
    password: string;
    active?: boolean;
  }
): Promise<StaffUser> {
  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.staffUser.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      active: input.active ?? true
    }
  });
}

export async function loginFixture(
  http: ReturnType<typeof request>,
  email: string,
  password: string
): Promise<AuthLogin> {
  const response = await http.post("/v1/auth/login").send({ email, password }).expect(201);
  return response.body as AuthLogin;
}

export async function createMemberFixture(
  prisma: PrismaClient,
  runId: string,
  status: "pending" | "active" | "suspended" | "banned" = "active"
): Promise<Member> {
  return prisma.member.create({
    data: {
      publicMemberNumber: `${runId}-member-${Math.random().toString(36).slice(2, 8)}`,
      email: `${runId}-member-${Math.random().toString(36).slice(2, 8)}@aosanctuary.test`,
      firstName: "Int",
      lastName: "Member",
      status
    }
  });
}

export async function ensureMembershipPlanFixture(
  prisma: PrismaClient,
  runId: string
): Promise<MembershipPlan> {
  return prisma.membershipPlan.create({
    data: {
      code: `${runId}-plan-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      name: "Integration Plan",
      description: "Integration test plan",
      tierRank: 1,
      billingInterval: "month",
      priceAmount: 19.99,
      currency: "USD",
      active: true
    }
  });
}

export async function createSubscriptionFixture(
  prisma: PrismaClient,
  memberId: string,
  membershipPlanId: string,
  status: SubscriptionStatus = "active"
) {
  return prisma.membershipSubscription.create({
    data: {
      memberId,
      membershipPlanId,
      billingProvider: "manual",
      status,
      startDate: new Date()
    }
  });
}

export async function createBookingRequiredAccessFixture(prisma: PrismaClient, runId: string) {
  const location = await prisma.location.create({
    data: {
      code: `${runId}-loc-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      name: "Integration Location"
    }
  });

  const accessZone = await prisma.accessZone.create({
    data: {
      code: `${runId}-zone-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      name: "Booking Required Zone",
      requiresBooking: true
    }
  });

  const accessPoint = await prisma.accessPoint.create({
    data: {
      locationId: location.id,
      accessZoneId: accessZone.id,
      code: `${runId}-point-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      name: "Booking Zone Scanner"
    }
  });

  return { location, accessZone, accessPoint };
}

export async function createCheckedOutVisitFixture(
  prisma: PrismaClient,
  memberId: string,
  locationId: string
): Promise<VisitSession> {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  return prisma.visitSession.create({
    data: {
      memberId,
      locationId,
      checkInAt: fifteenMinutesAgo,
      checkOutAt: now,
      status: "checked_out"
    }
  });
}

export async function cleanupByRunId(prisma: PrismaClient, runId: string): Promise<void> {
  await prisma.accessAttempt.deleteMany({
    where: {
      OR: [
        { attemptSource: { startsWith: runId } },
        {
          member: {
            email: { startsWith: runId }
          }
        }
      ]
    }
  });

  await prisma.presenceEvent.deleteMany({
    where: {
      member: {
        email: { startsWith: runId }
      }
    }
  });

  await prisma.visitSession.deleteMany({
    where: {
      member: {
        email: { startsWith: runId }
      }
    }
  });

  await prisma.membershipSubscription.deleteMany({
    where: {
      member: {
        email: { startsWith: runId }
      }
    }
  });

  await prisma.member.deleteMany({
    where: {
      email: { startsWith: runId }
    }
  });

  await prisma.accessPoint.deleteMany({
    where: {
      code: { startsWith: runId.toUpperCase() }
    }
  });

  await prisma.accessZone.deleteMany({
    where: {
      code: { startsWith: runId.toUpperCase() }
    }
  });

  await prisma.location.deleteMany({
    where: {
      code: { startsWith: runId.toUpperCase() }
    }
  });

  await prisma.membershipPlan.deleteMany({
    where: {
      code: { startsWith: runId.toUpperCase() }
    }
  });

  await prisma.staffUser.deleteMany({
    where: {
      email: { startsWith: runId }
    }
  });
}
