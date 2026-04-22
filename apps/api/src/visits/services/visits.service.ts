import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationContextService } from '../../location/location-context.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationContext: LocationContextService,
  ) {}

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

    const locationId = this.locationContext.locationOrNull?.id ?? null;

    const visit = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.visit.create({
        data: {
          guestId: dto.guest_id,
          bookingId: dto.booking_id ?? null,
          sourceType: dto.source_type,
          productType: dto.product_type,
          tierId: dto.tier_id,
          locationId,
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
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { guest: true, tier: true },
    });
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

  async listVisits(query: ListVisitsQueryDto) {
    const statuses = query.status
      ? Array.isArray(query.status)
        ? query.status
        : [query.status]
      : undefined;

    const locationId = this.locationContext.locationOrNull?.id ?? null;

    const visits = await this.prisma.visit.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: { guest: true, tier: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return visits.map((v: any) => this.toResponse(v));
  }

  async listGuestVisits(guestId: string, query: ListVisitsQueryDto) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('Guest not found');

    const statuses = query.status
      ? Array.isArray(query.status)
        ? query.status
        : [query.status]
      : undefined;

    const visits = await this.prisma.visit.findMany({
      where: { guestId, ...(statuses ? { status: { in: statuses } } : {}) },
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
    if (dto.status === 'active' && !visit.startTime) {
      const now = new Date();
      updateData.startTime = now;
      updateData.scheduledEndTime = new Date(now.getTime() + visit.durationMinutes * 60 * 1000);
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
    const guestName = visit.guest
      ? `${visit.guest.firstName ?? ''} ${visit.guest.lastName ?? ''}`.trim() || null
      : null;

    return {
      id: visit.id,
      guest_id: visit.guestId,
      guest_name: guestName,
      guest_email: visit.guest?.email ?? null,
      tier_name: visit.tier?.name ?? null,
      tier_code: visit.tier?.code ?? null,
      booking_id: visit.bookingId ?? null,
      source_type: visit.sourceType,
      product_type: visit.productType,
      tier_id: visit.tierId,
      visit_mode: visit.visitMode ?? null,
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

  // ── Visit notes ────────────────────────────────────────────────────────────

  async listVisitNotes(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visit not found');

    const notes = await (this.prisma as any).visitNote.findMany({
      where: { visitId },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((n: any) => ({
      id: n.id,
      visitId: n.visitId,
      staffUserId: n.staffUserId ?? null,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }

  async addVisitNote(visitId: string, body: string, staffUserId?: string) {
    if (!body?.trim()) throw new BadRequestException('Note body is required');

    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visit not found');

    const note = await (this.prisma as any).visitNote.create({
      data: { visitId, body: body.trim(), staffUserId: staffUserId ?? null },
    });

    return {
      id: note.id,
      visitId: note.visitId,
      staffUserId: note.staffUserId ?? null,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async updateVisitNote(visitId: string, noteId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Note body is required');

    const note = await (this.prisma as any).visitNote.findFirst({ where: { id: noteId, visitId } });
    if (!note) throw new NotFoundException('Note not found');

    const updated = await (this.prisma as any).visitNote.update({
      where: { id: noteId },
      data: { body: body.trim() },
    });

    return {
      id: updated.id,
      visitId: updated.visitId,
      staffUserId: updated.staffUserId ?? null,
      body: updated.body,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
