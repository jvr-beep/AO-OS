import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BookingCheckInDto } from "../dto/booking-check-in.dto";
import { WalkInCheckInDto } from "../dto/walk-in-check-in.dto";
import { CheckoutDto } from "../dto/checkout.dto";
import { FoliosService } from "../../folios/services/folios.service";
import { InventoryService } from "../../inventory/services/inventory.service";

@Injectable()
export class OrchestratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foliosService: FoliosService,
    private readonly inventoryService: InventoryService
  ) {}

  async checkInFromBooking(dto: BookingCheckInDto) {
    if (!dto.booking_id && !dto.booking_code) {
      throw new BadRequestException("booking_id or booking_code is required");
    }

    const booking = dto.booking_id
      ? await this.prisma.guestBooking.findUnique({ where: { id: dto.booking_id } })
      : await this.prisma.guestBooking.findUnique({ where: { bookingCode: dto.booking_code! } });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (!["reserved", "confirmed"].includes(booking.status)) {
      throw new ConflictException(`Booking in status '${booking.status}' cannot be checked in`);
    }

    const visit = await this.prisma.$transaction(async (tx) => {
      const createdVisit = await tx.visit.create({
        data: {
          guestId: booking.guestId,
          bookingId: booking.id,
          sourceType: "booking",
          productType: booking.productType,
          tierId: booking.tierId,
          durationMinutes: booking.durationMinutes,
          status: "paid_pending_assignment",
          paymentStatus: booking.balanceDueCents > 0 ? "unpaid" : "paid",
          checkInChannel: "staff"
        }
      });

      await tx.visitStatusHistory.create({
        data: {
          visitId: createdVisit.id,
          previousStatus: null,
          newStatus: "paid_pending_assignment",
          reasonCode: "booking_checkin_started",
          changedByUserId: dto.changed_by_user_id ?? null
        }
      });

      await tx.folio.create({ data: { visitId: createdVisit.id } });

      const bookingLockResult = await tx.guestBooking.updateMany({
        where: { id: booking.id, version: booking.version },
        data: {
          status: "checked_in",
          version: { increment: 1 }
        }
      });

      if (bookingLockResult.count === 0) {
        throw new ConflictException("Booking was modified concurrently; please retry");
      }

      return createdVisit;
    });

    const hold = await this.inventoryService.createHold({
      visit_id: visit.id,
      tier_id: booking.tierId,
      product_type: booking.productType,
      duration_minutes: booking.durationMinutes,
      hold_scope: "tier_pool"
    });

    await this.inventoryService.finalizeAssignment({
      visit_id: visit.id,
      hold_id: hold.id,
      changed_by_user_id: dto.changed_by_user_id
    });

    const folio = await this.prisma.folio.findUnique({ where: { visitId: visit.id } });
    const refreshedVisit = await this.prisma.visit.findUnique({ where: { id: visit.id } });

    return {
      flow: "booking_check_in",
      booking_id: booking.id,
      visit_id: visit.id,
      folio_id: folio?.id ?? "",
      resource_id: refreshedVisit?.assignedResourceId ?? null,
      status: refreshedVisit?.status ?? "checked_in"
    };
  }

  async walkInCheckIn(dto: WalkInCheckInDto) {
    const guest = await this.prisma.guest.findUnique({ where: { id: dto.guest_id } });
    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

    const tier = await this.prisma.tier.findUnique({ where: { id: dto.tier_id } });
    if (!tier || !tier.active) {
      throw new NotFoundException("Tier not found or inactive");
    }

    const visit = await this.prisma.$transaction(async (tx) => {
      const createdVisit = await tx.visit.create({
        data: {
          guestId: dto.guest_id,
          sourceType: "walk_in",
          productType: dto.product_type,
          tierId: dto.tier_id,
          durationMinutes: dto.duration_minutes,
          status: "awaiting_payment",
          paymentStatus: "unpaid",
          checkInChannel: "staff"
        }
      });

      await tx.visitStatusHistory.create({
        data: {
          visitId: createdVisit.id,
          previousStatus: null,
          newStatus: "awaiting_payment",
          reasonCode: "walk_in_started",
          changedByUserId: dto.changed_by_user_id ?? null
        }
      });

      await tx.folio.create({ data: { visitId: createdVisit.id } });

      return createdVisit;
    });

    const folio = await this.prisma.folio.findUnique({ where: { visitId: visit.id } });
    if (!folio) {
      throw new NotFoundException("Folio not found for walk-in visit");
    }

    await this.foliosService.addLineItem(folio.id, {
      line_type: "base_visit",
      reference_code: tier.code,
      description: `${tier.name} walk-in`,
      quantity: 1,
      unit_amount_cents: dto.quoted_price_cents,
      metadata: {
        tier_id: tier.id,
        duration_minutes: dto.duration_minutes,
        source: "walk_in_orchestrator"
      }
    });

    if (dto.amount_paid_cents > 0) {
      await this.foliosService.recordPayment(folio.id, {
        payment_provider: dto.payment_provider,
        transaction_type: "sale",
        amount_cents: dto.amount_paid_cents,
        status: "succeeded"
      });
    }

    const updatedFolio = await this.prisma.folio.findUnique({ where: { id: folio.id } });
    if (!updatedFolio) {
      throw new NotFoundException("Folio missing after payment processing");
    }

    if (updatedFolio.balanceDueCents > 0) {
      throw new ConflictException("Walk-in payment is incomplete; cannot finalize assignment");
    }

    await this.prisma.$transaction(async (tx) => {
      const visitLockResult = await tx.visit.updateMany({
        where: { id: visit.id, version: visit.version },
        data: {
          status: "paid_pending_assignment",
          paymentStatus: "paid",
          version: { increment: 1 }
        }
      });

      if (visitLockResult.count === 0) {
        throw new ConflictException("Visit was modified concurrently; please retry");
      }

      await tx.visitStatusHistory.create({
        data: {
          visitId: visit.id,
          previousStatus: "awaiting_payment",
          newStatus: "paid_pending_assignment",
          reasonCode: "walk_in_payment_complete",
          changedByUserId: dto.changed_by_user_id ?? null
        }
      });
    });

    const hold = await this.inventoryService.createHold({
      visit_id: visit.id,
      tier_id: dto.tier_id,
      product_type: dto.product_type,
      duration_minutes: dto.duration_minutes,
      hold_scope: "tier_pool"
    });

    await this.inventoryService.finalizeAssignment({
      visit_id: visit.id,
      hold_id: hold.id,
      changed_by_user_id: dto.changed_by_user_id
    });

    const refreshedVisit = await this.prisma.visit.findUnique({ where: { id: visit.id } });

    return {
      flow: "walk_in_check_in",
      booking_id: null,
      visit_id: visit.id,
      folio_id: folio.id,
      resource_id: refreshedVisit?.assignedResourceId ?? null,
      status: refreshedVisit?.status ?? "checked_in"
    };
  }

  async checkout(dto: CheckoutDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    if (["checked_out", "cancelled"].includes(visit.status)) {
      throw new ConflictException(`Visit already in terminal status '${visit.status}'`);
    }

    const folio = await this.prisma.folio.findUnique({ where: { visitId: visit.id } });
    if (!folio) {
      throw new NotFoundException("Folio not found for visit");
    }

    if (folio.balanceDueCents > 0) {
      throw new ConflictException("Outstanding folio balance must be paid before checkout");
    }

    await this.prisma.$transaction(async (tx) => {
      const visitLockResult = await tx.visit.updateMany({
        where: { id: visit.id, version: visit.version },
        data: {
          status: "checked_out",
          actualEndTime: visit.actualEndTime ?? new Date(),
          checkOutChannel: dto.check_out_channel,
          version: { increment: 1 }
        }
      });

      if (visitLockResult.count === 0) {
        throw new ConflictException("Visit was modified concurrently; please retry");
      }

      await tx.visitStatusHistory.create({
        data: {
          visitId: visit.id,
          previousStatus: visit.status,
          newStatus: "checked_out",
          reasonCode: "orchestrated_checkout",
          changedByUserId: dto.changed_by_user_id ?? null
        }
      });

      if (visit.assignedResourceId) {
        const resource = await tx.resource.findUnique({ where: { id: visit.assignedResourceId } });
        if (resource) {
          await tx.resource.update({
            where: { id: resource.id },
            data: {
              status: "cleaning",
              currentVisitId: null
            }
          });

          await tx.resourceStateHistory.create({
            data: {
              resourceId: resource.id,
              previousStatus: resource.status,
              newStatus: "cleaning",
              reasonCode: "visit_checked_out",
              changedByUserId: dto.changed_by_user_id ?? null,
              visitId: visit.id
            }
          });
        }
      }

      if (visit.bookingId) {
        await tx.guestBooking.update({
          where: { id: visit.bookingId },
          data: {
            status: "completed",
            version: { increment: 1 }
          }
        });
      }
    });

    return {
      flow: "checkout",
      booking_id: visit.bookingId ?? null,
      visit_id: visit.id,
      folio_id: folio.id,
      resource_id: visit.assignedResourceId ?? null,
      status: "checked_out"
    };
  }
}
