-- CreateEnum
CREATE TYPE "WristbandTransactionType" AS ENUM ('purchase', 'adjustment', 'refund');

-- CreateEnum
CREATE TYPE "WristbandTransactionStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "LockerStatus" AS ENUM ('available', 'assigned', 'out_of_service');

-- CreateEnum
CREATE TYPE "LockerAccessDecision" AS ENUM ('allowed', 'denied');

-- CreateEnum
CREATE TYPE "LockerAccessEventType" AS ENUM ('unlock', 'lock', 'open', 'close');

-- CreateTable
CREATE TABLE "WristbandTransaction" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "wristbandId" TEXT NOT NULL,
    "transactionType" "WristbandTransactionType" NOT NULL,
    "merchantType" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "sourceReference" TEXT,
    "status" "WristbandTransactionStatus" NOT NULL DEFAULT 'completed',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WristbandTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locker" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationId" TEXT,
    "status" "LockerStatus" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LockerAssignment" (
    "id" TEXT NOT NULL,
    "lockerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "wristbandAssignmentId" TEXT,
    "assignedByStaffUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "unassignedReason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LockerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LockerAccessEvent" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "lockerId" TEXT NOT NULL,
    "wristbandId" TEXT,
    "lockerAssignmentId" TEXT,
    "decision" "LockerAccessDecision" NOT NULL,
    "denialReasonCode" TEXT,
    "eventType" "LockerAccessEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockerAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WristbandTransaction_occurredAt_idx" ON "WristbandTransaction"("occurredAt");

-- CreateIndex
CREATE INDEX "WristbandTransaction_memberId_idx" ON "WristbandTransaction"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Locker_code_key" ON "Locker"("code");

-- CreateIndex
CREATE INDEX "LockerAssignment_lockerId_active_idx" ON "LockerAssignment"("lockerId", "active");

-- CreateIndex
CREATE INDEX "LockerAssignment_memberId_idx" ON "LockerAssignment"("memberId");

-- CreateIndex
CREATE INDEX "LockerAccessEvent_occurredAt_idx" ON "LockerAccessEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "LockerAccessEvent_memberId_idx" ON "LockerAccessEvent"("memberId");

-- AddForeignKey
ALTER TABLE "WristbandTransaction" ADD CONSTRAINT "WristbandTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WristbandTransaction" ADD CONSTRAINT "WristbandTransaction_wristbandId_fkey" FOREIGN KEY ("wristbandId") REFERENCES "Wristband"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locker" ADD CONSTRAINT "Locker_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAssignment" ADD CONSTRAINT "LockerAssignment_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAssignment" ADD CONSTRAINT "LockerAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAssignment" ADD CONSTRAINT "LockerAssignment_wristbandAssignmentId_fkey" FOREIGN KEY ("wristbandAssignmentId") REFERENCES "WristbandAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAccessEvent" ADD CONSTRAINT "LockerAccessEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAccessEvent" ADD CONSTRAINT "LockerAccessEvent_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAccessEvent" ADD CONSTRAINT "LockerAccessEvent_wristbandId_fkey" FOREIGN KEY ("wristbandId") REFERENCES "Wristband"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LockerAccessEvent" ADD CONSTRAINT "LockerAccessEvent_lockerAssignmentId_fkey" FOREIGN KEY ("lockerAssignmentId") REFERENCES "LockerAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


