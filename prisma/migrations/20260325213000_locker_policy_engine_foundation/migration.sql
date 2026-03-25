-- CreateEnum
CREATE TYPE "LockerAssignmentMode" AS ENUM ('day_use_shared', 'assigned', 'premium', 'staff_override');

-- CreateEnum
CREATE TYPE "LockerPolicyDecision" AS ENUM ('allow', 'deny');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LockerStatus" ADD VALUE 'reserved';
ALTER TYPE "LockerStatus" ADD VALUE 'occupied';
ALTER TYPE "LockerStatus" ADD VALUE 'cleaning';
ALTER TYPE "LockerStatus" ADD VALUE 'maintenance';
ALTER TYPE "LockerStatus" ADD VALUE 'offline';
ALTER TYPE "LockerStatus" ADD VALUE 'forced_open';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WristbandStatus" ADD VALUE 'unassigned';
ALTER TYPE "WristbandStatus" ADD VALUE 'pending_activation';
ALTER TYPE "WristbandStatus" ADD VALUE 'suspended';
ALTER TYPE "WristbandStatus" ADD VALUE 'replaced';

-- AlterTable
ALTER TABLE "Locker" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bankId" TEXT,
ADD COLUMN     "hasPower" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAccessible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWetAreaRated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockerLabel" TEXT,
ADD COLUMN     "lockerSize" TEXT,
ADD COLUMN     "lockerType" TEXT,
ADD COLUMN     "supportsAssignedUse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supportsDayUse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tierClass" TEXT,
ADD COLUMN     "vendorLockId" TEXT,
ADD COLUMN     "wallId" TEXT,
ADD COLUMN     "zoneId" TEXT;

-- AlterTable
ALTER TABLE "LockerAccessEvent" ADD COLUMN     "rawPayloadJson" JSONB;

-- AlterTable
ALTER TABLE "LockerAssignment" ADD COLUMN     "assignmentMode" "LockerAssignmentMode" NOT NULL DEFAULT 'assigned',
ADD COLUMN     "policySnapshot" JSONB,
ADD COLUMN     "visitSessionId" TEXT;

-- AlterTable
ALTER TABLE "Wristband" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "globalAccessFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeLocationId" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenLocationId" TEXT,
ADD COLUMN     "replacedFromWristbandId" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LockerPolicyDecisionEvent" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "lockerId" TEXT,
    "visitSessionId" TEXT,
    "staffUserId" TEXT,
    "siteId" TEXT,
    "requestedZoneId" TEXT,
    "requestedLockerId" TEXT,
    "assignmentMode" "LockerAssignmentMode" NOT NULL,
    "decision" "LockerPolicyDecision" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "eligibleLockerIds" TEXT[],
    "chosenLockerId" TEXT,
    "inputSnapshotJson" JSONB NOT NULL,
    "outputSnapshotJson" JSONB NOT NULL,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockerPolicyDecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LockerPolicyDecisionEvent_memberId_createdAt_idx" ON "LockerPolicyDecisionEvent"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "LockerPolicyDecisionEvent_lockerId_createdAt_idx" ON "LockerPolicyDecisionEvent"("lockerId", "createdAt");

-- CreateIndex
CREATE INDEX "LockerPolicyDecisionEvent_visitSessionId_createdAt_idx" ON "LockerPolicyDecisionEvent"("visitSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "LockerPolicyDecisionEvent_siteId_createdAt_idx" ON "LockerPolicyDecisionEvent"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "LockerAssignment" ADD CONSTRAINT "LockerAssignment_visitSessionId_fkey" FOREIGN KEY ("visitSessionId") REFERENCES "VisitSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerPolicyDecisionEvent" ADD CONSTRAINT "LockerPolicyDecisionEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerPolicyDecisionEvent" ADD CONSTRAINT "LockerPolicyDecisionEvent_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerPolicyDecisionEvent" ADD CONSTRAINT "LockerPolicyDecisionEvent_visitSessionId_fkey" FOREIGN KEY ("visitSessionId") REFERENCES "VisitSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

