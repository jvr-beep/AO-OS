import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVisitDto } from '../dto/create-visit.dto';
import { TransitionVisitStatusDto } from '../dto/transition-visit-status.dto';
import { ListVisitsQueryDto } from '../dto/list-visits.query.dto';
import { GuestVisitStatus } from '@prisma/client';

const VALID_STATUS_TRANSITIONS: Partial<Record<GuestVisitStatus, GuestVisitStatus[]>> = {
  initiated: ['awaiting_identity', 'awaiting_waiver', 'awaiting_payment', 'cancelled'],
  awaiting_identity: ['awaiting_waiver', 'awaiting_payment', 'cancelled'],
  awaiting_waiver: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['ready_for_assignment', 'paid_pending_assignment', 'cancelled'],
  ready_for_assignment: ['paid_pending_assignment', 'cancelled'],
  paid_pending_assignment: ['checked_in', 'cancelled'],
  checked_in: ['active', 'cancelled'],
  active: ['extended', 'checked_out'],
  extended: ['checked_out'],
};

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateVisit(dto: CreateVisitDto) {
    const tier = await this.prisma.tier.findUnique({ where: { id: dto.tier_id } });
    if (!tier || !tier.active) {
      throw new NotFoundException('Tier not found or inactive');
    }

    const guest = await this.prisma.guest.findUnique({ where: { id: dto.guest_id } });
    if (!guest) throw new NotFoundException('Guest not found');

    if (dto.booking_id) {
      const booking = await this.prisma.guestBooking.findUnique({ where: { id: dto.booking_id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (!['reserved', 'confirmed'].includes(booking.status)) {
        throw new ConflictException(
          `Booking is in status '${booking.status}' and cannot be used to initiate a visit`,
        );
      }
    }

    const visit = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.visit.create({
        data: {
          guestId: dto.guest_id,
          bookingId: dto.booking_id ?? null,
          sourceType: dto.source_type,
          productType: dto.product_type,
          tierId: dto.tier_id,
          durationMinutes: dto.duration_minutes,
          status: 'initiated',
          waiverRequired: dto.waiver_required ?? true,
        },
      });

      await tx.visitStatusHistory.create({
        data: {
          visitId: created.id,
          previousStatus: null,
          newStatus: 'initiated',
          reasonCode: 'visit_initiated',
        },
      });

      await tx.folio.create({
        data: {
          visitId: created.id,
        },
      });

      return created;
    });

    return this.toResponse(visit);
  }

  async getVisit(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visit not found');
    return this.toResponse(visit);
  }

  async getVisitStatusHistory(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visit not found');

    const history = await this.prisma.visitStatusHistory.findMany({
      where: { visitId },
      orderBy: { changedAt: 'asc' },
    });

    return history.map((h: any) => ({
      id: h.id,
      visit_id: h.visitId,
      previous_status: h.previousStatus ?? null,
      new_status: h.newStatus,
      reason_code: h.reasonCode ?? null,
      reason_text: h.reasonText ?? null,
      changed_by_user_id: h.changedByUserId ?? null,
      changed_at: h.changedAt.toISOString(),
    }));
  }

  async listGuestVisits(guestId: string, query: ListVisitsQueryDto) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('Guest not found');

    const visits = await this.prisma.visit.findMany({
      where: { guestId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return visits.map((v: any) => this.toResponse(v));
  }

  async transitionVisitStatus(visitId: string, dto: TransitionVisitStatusDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visit not found');

    const allowed = VALID_STATUS_TRANSITIONS[visit.status as GuestVisitStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Cannot transition visit from '${visit.status}' to '${dto.status}'`,
      );
    }

    const updateData: any = {
      status: dto.status,
      version: { increment: 1 },
    };
    if (dto.waiver_completed !== undefined) {
      updateData.waiverCompleted = dto.waiver_completed;
    }
    if (dto.payment_status !== undefined) {
      updateData.paymentStatus = dto.payment_status;
    }
    if (dto.status === 'checked_out' && !visit.actualEndTime) {
      updateData.actualEndTime = new Date();
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const result = await tx.visit.update({
        where: { id: visitId },
        data: updateData,
      });

      await tx.visitStatusHistory.create({
        data: {
          visitId,
          previousStatus: visit.status,
          newStatus: dto.status,
          reasonCode: dto.reason_code ?? null,
          reasonText: dto.reason_text ?? null,
          changedByUserId: dto.changed_by_user_id ?? null,
        },
      });

      return result;
    });

    return this.toResponse(updated);
  }

  private toResponse(visit: any) {
    return {
      id: visit.id,
      guest_id: visit.guestId,
      booking_id: visit.bookingId ?? null,
      source_type: visit.sourceType,
      product_type: visit.productType,
      tier_id: visit.tierId,
      duration_minutes: visit.durationMinutes,
      status: visit.status,
      start_time: visit.startTime?.toISOString() ?? null,
      scheduled_end_time: visit.scheduledEndTime?.toISOString() ?? null,
      actual_end_time: visit.actualEndTime?.toISOString() ?? null,
      assigned_resource_id: visit.assignedResourceId ?? null,
      assigned_band_id: visit.assignedBandId ?? null,
      waiver_required: visit.waiverRequired,
      waiver_completed: visit.waiverCompleted,
      payment_status: visit.paymentStatus,
      check_in_channel: visit.checkInChannel ?? null,
      check_out_channel: visit.checkOutChannel ?? null,
      version: visit.version,
      created_at: visit.createdAt.toISOString(),
      updated_at: visit.updatedAt.toISOString(),
    };
  }
}
