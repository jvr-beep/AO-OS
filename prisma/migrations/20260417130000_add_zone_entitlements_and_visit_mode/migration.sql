-- CreateEnum
CREATE TYPE "ZoneEntitlementProductType" AS ENUM ('tier', 'membership_plan');

-- AlterTable: visits — add visit_mode (Restore / Release / Retreat)
ALTER TABLE "visits" ADD COLUMN "visit_mode" "RoomBookingType";

-- CreateTable: zone_entitlements — maps product (tier or membership plan) to allowed zones
CREATE TABLE "zone_entitlements" (
    "id"           TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_type" "ZoneEntitlementProductType" NOT NULL,
    "zone_code"    TEXT NOT NULL,
    "active"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_entitlements_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one entitlement row per product + zone
CREATE UNIQUE INDEX "uq_zone_entitlement_product_zone"
    ON "zone_entitlements"("product_code", "product_type", "zone_code");

-- Lookup index
CREATE INDEX "idx_zone_entitlements_product"
    ON "zone_entitlements"("product_code", "product_type", "active");

-- AddForeignKey: zone_code → AccessZone.code
ALTER TABLE "zone_entitlements"
    ADD CONSTRAINT "zone_entitlements_zone_code_fkey"
    FOREIGN KEY ("zone_code") REFERENCES "AccessZone"("code")
    ON DELETE CASCADE ON UPDATE CASCADE;
