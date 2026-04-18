-- Add location_id to AccessZone (zones are location-specific)
ALTER TABLE "AccessZone" ADD COLUMN "location_id" TEXT;
ALTER TABLE "AccessZone" ADD CONSTRAINT "AccessZone_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AccessZone_location_id_idx" ON "AccessZone"("location_id");

-- Add location_id to tiers (tiers are priced per-location)
ALTER TABLE "tiers" ADD COLUMN "location_id" TEXT;
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "tiers_location_id_idx" ON "tiers"("location_id");

-- Add location_id to guest_bookings (bookings belong to a location)
ALTER TABLE "guest_bookings" ADD COLUMN "location_id" TEXT;
ALTER TABLE "guest_bookings" ADD CONSTRAINT "guest_bookings_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "guest_bookings_location_id_idx" ON "guest_bookings"("location_id");
