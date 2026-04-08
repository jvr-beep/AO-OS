-- CreateEnum
CREATE TYPE "AccessNodeType" AS ENUM ('entry', 'reader', 'camera', 'service_point');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('door_controller', 'reader', 'camera', 'environmental');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('online', 'offline', 'degraded');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "floorPlanId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "levelIndex" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "floorPlanAreaId" TEXT,
    "roomId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneType" "FloorPlanAreaType" NOT NULL,
    "polygonJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessNode" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "zoneId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodeType" "AccessNodeType" NOT NULL,
    "x" DECIMAL(10,2) NOT NULL,
    "y" DECIMAL(10,2) NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'online',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "zoneId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "x" DECIMAL(10,2) NOT NULL,
    "y" DECIMAL(10,2) NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'online',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facility_code_key" ON "Facility"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_locationId_key" ON "Facility"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_floorPlanId_key" ON "Floor"("floorPlanId");

-- CreateIndex
CREATE INDEX "Floor_facilityId_active_levelIndex_idx" ON "Floor"("facilityId", "active", "levelIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_facilityId_code_key" ON "Floor"("facilityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_floorPlanAreaId_key" ON "Zone"("floorPlanAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_roomId_key" ON "Zone"("roomId");

-- CreateIndex
CREATE INDEX "Zone_floorId_active_idx" ON "Zone"("floorId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_floorId_code_key" ON "Zone"("floorId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessNode_code_key" ON "AccessNode"("code");

-- CreateIndex
CREATE INDEX "AccessNode_floorId_active_idx" ON "AccessNode"("floorId", "active");

-- CreateIndex
CREATE INDEX "AccessNode_zoneId_idx" ON "AccessNode"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");

-- CreateIndex
CREATE INDEX "Device_floorId_active_idx" ON "Device"("floorId", "active");

-- CreateIndex
CREATE INDEX "Device_zoneId_idx" ON "Device"("zoneId");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_floorPlanAreaId_fkey" FOREIGN KEY ("floorPlanAreaId") REFERENCES "FloorPlanArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessNode" ADD CONSTRAINT "AccessNode_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessNode" ADD CONSTRAINT "AccessNode_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
