-- CreateEnum
CREATE TYPE "GuestMembershipStatus" AS ENUM ('none', 'basic', 'premium');

-- CreateEnum
CREATE TYPE "GuestRiskFlagStatus" AS ENUM ('clear', 'flagged', 'banned');

-- CreateEnum
CREATE TYPE "VisitSourceType" AS ENUM ('booking', 'walk_in');

-- CreateEnum
CREATE TYPE "GuestVisitStatus" AS ENUM ('initiated', 'awaiting_identity', 'awaiting_waiver', 'awaiting_payment', 'ready_for_assignment', 'paid_pending_assignment', 'checked_in', 'active', 'extended', 'checked_out', 'cancelled');

-- CreateEnum
CREATE TYPE "GuestBookingStatus" AS ENUM ('reserved', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "GuestBookingChannel" AS ENUM ('web', 'kiosk', 'staff');

-- CreateEnum
CREATE TYPE "CheckInChannel" AS ENUM ('web', 'kiosk', 'staff');

-- CreateEnum
CREATE TYPE "CheckOutChannel" AS ENUM ('kiosk', 'staff', 'system');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('locker', 'room');

-- CreateEnum
CREATE TYPE "ResourceAvailabilityStatus" AS ENUM ('available', 'held', 'occupied', 'cleaning', 'out_of_service');

-- CreateEnum
CREATE TYPE "HoldScope" AS ENUM ('resource', 'tier_pool');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('active', 'released', 'expired', 'converted');

-- CreateEnum
CREATE TYPE "WristbandLinkStatus" AS ENUM ('active', 'inactive', 'revoked');

-- CreateEnum
CREATE TYPE "FolioPaymentStatus" AS ENUM ('unpaid', 'partially_paid', 'paid', 'failed', 'refunded', 'comped');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('authorize', 'capture', 'sale', 'refund', 'void', 'comp');

-- CreateEnum
CREATE TYPE "AccessPermissionStatus" AS ENUM ('granted', 'revoked');

-- CreateEnum
CREATE TYPE "AccessResult" AS ENUM ('granted', 'denied');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('staff', 'kiosk', 'system', 'guest');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- AlterTable
ALTER TABLE "EventPollingCursor" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "date_of_birth" DATE,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "membership_status" "GuestMembershipStatus" NOT NULL DEFAULT 'none',
    "risk_flag_status" "GuestRiskFlagStatus" NOT NULL DEFAULT 'clear',
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_waivers" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "waiver_version" TEXT NOT NULL,
    "accepted_channel" TEXT NOT NULL,
    "signature_text" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_waivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiers" (
    "id" UUID NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "public_description" TEXT,
    "upgrade_rank" INTEGER NOT NULL DEFAULT 0,
    "base_price_cents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_duration_options" (
    "id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tier_duration_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "resource_type" "ProductType" NOT NULL,
    "display_label" TEXT NOT NULL,
    "tier_id" UUID NOT NULL,
    "zone_code" TEXT NOT NULL,
    "status" "ResourceAvailabilityStatus" NOT NULL DEFAULT 'available',
    "cleaning_buffer_minutes" INTEGER NOT NULL DEFAULT 30,
    "current_visit_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_state_history" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason_code" TEXT,
    "reason_text" TEXT,
    "changed_by_user_id" TEXT,
    "visit_id" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_holds" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "visit_id" UUID,
    "hold_scope" "HoldScope" NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "release_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_bookings" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "booking_channel" "GuestBookingChannel" NOT NULL DEFAULT 'web',
    "product_type" "ProductType" NOT NULL,
    "booking_date" DATE NOT NULL,
    "arrival_window_start" TIMESTAMPTZ(6) NOT NULL,
    "arrival_window_end" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "GuestBookingStatus" NOT NULL DEFAULT 'reserved',
    "quoted_price_cents" INTEGER NOT NULL DEFAULT 0,
    "paid_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "balance_due_cents" INTEGER NOT NULL DEFAULT 0,
    "booking_code" TEXT NOT NULL,
    "qr_token" TEXT,
    "expects_existing_band" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guest_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_booking_add_ons" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "add_on_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL DEFAULT 0,
    "total_price_cents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "guest_booking_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "booking_id" UUID,
    "source_type" "VisitSourceType" NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "tier_id" UUID NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "GuestVisitStatus" NOT NULL DEFAULT 'initiated',
    "start_time" TIMESTAMPTZ(6),
    "scheduled_end_time" TIMESTAMPTZ(6),
    "actual_end_time" TIMESTAMPTZ(6),
    "assigned_resource_id" UUID,
    "assigned_band_id" UUID,
    "waiver_required" BOOLEAN NOT NULL DEFAULT true,
    "waiver_completed" BOOLEAN NOT NULL DEFAULT false,
    "payment_status" "FolioPaymentStatus" NOT NULL DEFAULT 'unpaid',
    "check_in_channel" "CheckInChannel",
    "check_out_channel" "CheckOutChannel",
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_status_history" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason_code" TEXT,
    "reason_text" TEXT,
    "changed_by_user_id" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wristband_links" (
    "id" UUID NOT NULL,
    "wristband_id" TEXT NOT NULL,
    "guest_id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "link_status" "WristbandLinkStatus" NOT NULL DEFAULT 'active',
    "reason_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wristband_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folios" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "taxes_cents" INTEGER NOT NULL DEFAULT 0,
    "fees_cents" INTEGER NOT NULL DEFAULT 0,
    "wristband_charge_cents" INTEGER NOT NULL DEFAULT 0,
    "add_on_total_cents" INTEGER NOT NULL DEFAULT 0,
    "discounts_cents" INTEGER NOT NULL DEFAULT 0,
    "total_due_cents" INTEGER NOT NULL DEFAULT 0,
    "amount_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "balance_due_cents" INTEGER NOT NULL DEFAULT 0,
    "payment_status" "FolioPaymentStatus" NOT NULL DEFAULT 'unpaid',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "folios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folio_line_items" (
    "id" UUID NOT NULL,
    "folio_id" UUID NOT NULL,
    "line_type" TEXT NOT NULL,
    "reference_code" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount_cents" INTEGER NOT NULL,
    "total_amount_cents" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folio_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "folio_id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "payment_provider" TEXT NOT NULL,
    "provider_payment_intent_id" TEXT,
    "transaction_type" "PaymentTransactionType" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "idempotency_key" TEXT,
    "provider_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_permissions" (
    "id" UUID NOT NULL,
    "wristband_id" TEXT NOT NULL,
    "visit_id" UUID NOT NULL,
    "zone_code" TEXT NOT NULL,
    "permission_status" "AccessPermissionStatus" NOT NULL DEFAULT 'granted',
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_access_events" (
    "id" UUID NOT NULL,
    "wristband_id" TEXT,
    "visit_id" UUID,
    "reader_id" TEXT NOT NULL,
    "zone_code" TEXT NOT NULL,
    "access_result" "AccessResult" NOT NULL,
    "denial_reason" TEXT,
    "event_time" TIMESTAMPTZ(6) NOT NULL,
    "raw_payload" JSONB,

    CONSTRAINT "guest_access_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_user_id" TEXT,
    "actor_type" "ActorType" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "action" TEXT NOT NULL,
    "reason_code" TEXT,
    "reason_text" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_exceptions" (
    "id" UUID NOT NULL,
    "exception_type" TEXT NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "visit_id" UUID,
    "booking_id" UUID,
    "folio_id" UUID,
    "resource_id" UUID,
    "wristband_id" TEXT,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'open',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "system_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guests_phone_key" ON "guests"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "guests_email_key" ON "guests"("email");

-- CreateIndex
CREATE INDEX "guest_waivers_guest_id_is_current_idx" ON "guest_waivers"("guest_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "tiers_code_key" ON "tiers"("code");

-- CreateIndex
CREATE INDEX "idx_resources_type_status_tier" ON "resources"("resource_type", "status", "tier_id");

-- CreateIndex
CREATE INDEX "idx_resource_state_history_resource_time" ON "resource_state_history"("resource_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_resource_holds_active" ON "resource_holds"("resource_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "guest_bookings_booking_code_key" ON "guest_bookings"("booking_code");

-- CreateIndex
CREATE UNIQUE INDEX "guest_bookings_qr_token_key" ON "guest_bookings"("qr_token");

-- CreateIndex
CREATE INDEX "idx_guest_bookings_guest_status" ON "guest_bookings"("guest_id", "status");

-- CreateIndex
CREATE INDEX "idx_guest_bookings_arrival_status" ON "guest_bookings"("arrival_window_start", "status");

-- CreateIndex
CREATE INDEX "idx_visits_guest_status" ON "visits"("guest_id", "status");

-- CreateIndex
CREATE INDEX "idx_visits_status_created" ON "visits"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_visit_status_history_visit_time" ON "visit_status_history"("visit_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_wristband_links_band_status" ON "wristband_links"("wristband_id", "link_status");

-- CreateIndex
CREATE INDEX "idx_wristband_links_visit_status" ON "wristband_links"("visit_id", "link_status");

-- CreateIndex
CREATE UNIQUE INDEX "folios_visit_id_key" ON "folios"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_payment_idempotency_key" ON "payment_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_access_permissions_band_zone" ON "access_permissions"("wristband_id", "zone_code", "permission_status");

-- CreateIndex
CREATE INDEX "idx_guest_access_events_band_time" ON "guest_access_events"("wristband_id", "event_time" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_log_entity" ON "audit_log"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_system_exceptions_status" ON "system_exceptions"("status", "severity", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "guest_waivers" ADD CONSTRAINT "guest_waivers_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_duration_options" ADD CONSTRAINT "tier_duration_options_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_state_history" ADD CONSTRAINT "resource_state_history_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_holds" ADD CONSTRAINT "resource_holds_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_holds" ADD CONSTRAINT "resource_holds_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_bookings" ADD CONSTRAINT "guest_bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_bookings" ADD CONSTRAINT "guest_bookings_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_booking_add_ons" ADD CONSTRAINT "guest_booking_add_ons_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "guest_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "guest_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_assigned_resource_id_fkey" FOREIGN KEY ("assigned_resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_status_history" ADD CONSTRAINT "visit_status_history_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wristband_links" ADD CONSTRAINT "wristband_links_wristband_id_fkey" FOREIGN KEY ("wristband_id") REFERENCES "Wristband"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wristband_links" ADD CONSTRAINT "wristband_links_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wristband_links" ADD CONSTRAINT "wristband_links_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folios" ADD CONSTRAINT "folios_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_line_items" ADD CONSTRAINT "folio_line_items_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_wristband_id_fkey" FOREIGN KEY ("wristband_id") REFERENCES "Wristband"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_access_events" ADD CONSTRAINT "guest_access_events_wristband_id_fkey" FOREIGN KEY ("wristband_id") REFERENCES "Wristband"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_access_events" ADD CONSTRAINT "guest_access_events_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_exceptions" ADD CONSTRAINT "system_exceptions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_exceptions" ADD CONSTRAINT "system_exceptions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "guest_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_exceptions" ADD CONSTRAINT "system_exceptions_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_exceptions" ADD CONSTRAINT "system_exceptions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_exceptions" ADD CONSTRAINT "system_exceptions_wristband_id_fkey" FOREIGN KEY ("wristband_id") REFERENCES "Wristband"("id") ON DELETE SET NULL ON UPDATE CASCADE;
