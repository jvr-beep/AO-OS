-- CreateEnum
CREATE TYPE "FloorPlanAreaType" AS ENUM ('room', 'corridor', 'entry', 'service', 'bath', 'lounge', 'locker_bank');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('private', 'premium_private', 'retreat', 'ritual', 'accessible', 'couples_reserved_future');

-- CreateEnum
CREATE TYPE "RoomPrivacyLevel" AS ENUM ('standard', 'high', 'premium');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('available', 'booked', 'occupied', 'cleaning', 'out_of_service');

-- CreateEnum
CREATE TYPE "RoomBookingType" AS ENUM ('restore', 'release', 'retreat');

-- CreateEnum
CREATE TYPE "RoomBookingStatus" AS ENUM ('reserved', 'checked_in', 'checked_out', 'expired', 'cancelled', 'no_show', 'waitlisted');

-- CreateEnum
CREATE TYPE "RoomBookingSourceType" AS ENUM ('membership_credit', 'upgrade_credit', 'one_time_purchase', 'manual_staff', 'package_credit');

-- CreateEnum
CREATE TYPE "RoomAccessDecision" AS ENUM ('allowed', 'denied', 'error');

-- CreateEnum
CREATE TYPE "RoomAccessEventType" AS ENUM ('unlock', 'lock', 'open', 'close', 'check_in_gate', 'check_out_gate');

-- CreateEnum
CREATE TYPE "RoomAccessSourceType" AS ENUM ('wristband_reader', 'staff_console', 'system');

-- CreateEnum
CREATE TYPE "CleaningTaskType" AS ENUM ('turnover', 'deep_clean', 'inspection');

-- CreateEnum
CREATE TYPE "CleaningTaskStatus" AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorPlanArea" (
    "id" TEXT NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaType" "FloorPlanAreaType" NOT NULL,
    "x" DECIMAL(10,2) NOT NULL,
    "y" DECIMAL(10,2) NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "height" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorPlanArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "floorPlanAreaId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "privacyLevel" "RoomPrivacyLevel" NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'available',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "cleaningRequired" BOOLEAN NOT NULL DEFAULT false,
    "lastTurnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBooking" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bookingType" "RoomBookingType" NOT NULL,
    "status" "RoomBookingStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "RoomBookingSourceType" NOT NULL,
    "sourceReference" TEXT,
    "waitlistPriority" INTEGER NOT NULL DEFAULT 0,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAccessEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "roomId" TEXT NOT NULL,
    "memberId" TEXT,
    "wristbandId" TEXT,
    "decision" "RoomAccessDecision" NOT NULL,
    "denialReasonCode" TEXT,
    "eventType" "RoomAccessEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "RoomAccessSourceType" NOT NULL,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningTask" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bookingId" TEXT,
    "taskType" "CleaningTaskType" NOT NULL,
    "status" "CleaningTaskStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToStaffUserId" TEXT,
    "notes" TEXT,

    CONSTRAINT "CleaningTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FloorPlan_locationId_active_idx" ON "FloorPlan"("locationId", "active");

-- CreateIndex
CREATE INDEX "FloorPlanArea_floorPlanId_active_idx" ON "FloorPlanArea"("floorPlanId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlanArea_floorPlanId_code_key" ON "FloorPlanArea"("floorPlanId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Room_floorPlanAreaId_key" ON "Room"("floorPlanAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_locationId_status_idx" ON "Room"("locationId", "status");

-- CreateIndex
CREATE INDEX "Room_roomType_privacyLevel_idx" ON "Room"("roomType", "privacyLevel");

-- CreateIndex
CREATE INDEX "RoomBooking_roomId_startsAt_idx" ON "RoomBooking"("roomId", "startsAt");

-- CreateIndex
CREATE INDEX "RoomBooking_memberId_startsAt_idx" ON "RoomBooking"("memberId", "startsAt");

-- CreateIndex
CREATE INDEX "RoomBooking_status_startsAt_idx" ON "RoomBooking"("status", "startsAt");

-- CreateIndex
CREATE INDEX "RoomAccessEvent_roomId_occurredAt_idx" ON "RoomAccessEvent"("roomId", "occurredAt");

-- CreateIndex
CREATE INDEX "RoomAccessEvent_memberId_occurredAt_idx" ON "RoomAccessEvent"("memberId", "occurredAt");

-- CreateIndex
CREATE INDEX "CleaningTask_roomId_status_idx" ON "CleaningTask"("roomId", "status");

-- CreateIndex
CREATE INDEX "CleaningTask_status_createdAt_idx" ON "CleaningTask"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "FloorPlan" ADD CONSTRAINT "FloorPlan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorPlanArea" ADD CONSTRAINT "FloorPlanArea_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floorPlanAreaId_fkey" FOREIGN KEY ("floorPlanAreaId") REFERENCES "FloorPlanArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAccessEvent" ADD CONSTRAINT "RoomAccessEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "RoomBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAccessEvent" ADD CONSTRAINT "RoomAccessEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAccessEvent" ADD CONSTRAINT "RoomAccessEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAccessEvent" ADD CONSTRAINT "RoomAccessEvent_wristbandId_fkey" FOREIGN KEY ("wristbandId") REFERENCES "Wristband"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "RoomBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_assignedToStaffUserId_fkey" FOREIGN KEY ("assignedToStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

