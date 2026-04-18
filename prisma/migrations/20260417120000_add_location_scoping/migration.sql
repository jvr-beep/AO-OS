-- AlterTable: StaffUser — add nullable locationId for location scoping
ALTER TABLE "StaffUser" ADD COLUMN "locationId" TEXT;

-- AlterTable: guests — add nullable location_id for location scoping
ALTER TABLE "guests" ADD COLUMN "location_id" TEXT;

-- AlterTable: visits — add nullable location_id for location scoping
ALTER TABLE "visits" ADD COLUMN "location_id" TEXT;

-- AlterTable: resources — add nullable location_id for location scoping
ALTER TABLE "resources" ADD COLUMN "location_id" TEXT;

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
