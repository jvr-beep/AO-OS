import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ResourceAvailabilityStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { LocationContextService } from "../../location/location-context.service";
import { AvailabilitySearchResponseDto } from "../dto/availability-search.response.dto";
import { CreateHoldDto } from "../dto/create-hold.dto";
import { FinalizeAssignmentResponseDto } from "../dto/finalize-assignment.response.dto";
import { FinalizeAssignmentDto } from "../dto/finalize-assignment.dto";
import { ResourceHoldResponseDto } from "../dto/resource-hold.response.dto";
import { SearchAvailabilityQueryDto } from "../dto/search-availability.query.dto";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationContext: LocationContextService,
  ) {}

  async searchAvailability(query: SearchAvailabilityQueryDto): Promise<AvailabilitySearchResponseDto> {
    if (!query.product_type) {
      throw new BadRequestException("product_type is required");
    }

    const locationId = this.locationContext.locationOrNull?.id ?? null;

    const resources = await this.prisma.resource.findMany({
      where: {
        resourceType: query.product_type,
        status: "available",
        ...(locationId ? { locationId } : {}),
        ...(query.tier_id ? { tierId: query.tier_id } : {})
      },
      include: { tier: true }
    });

    const byTier = new Map<string, { tierId: string; displayName: string; fromPriceCents: number; availableNow: boolean }>();

    for (const resource of resources) {
      if (!byTier.has(resource.tierId)) {
        byTier.set(resource.tierId, {
          tierId: resource.tierId,
          displayName: resource.tier.name,
          fromPriceCents: resource.tier.basePriceCents,
          availableNow: true
        });
      }
    }

    return {
      productType: query.product_type,
      availableTiers: Array.from(byTier.values())
    };
  }

  async createHold(dto: CreateHoldDto): Promise<ResourceHoldResponseDto> {
    if (!dto.visit_id || !dto.tier_id || !dto.product_type || !dto.hold_scope) {
      throw new BadRequestException("visit_id, product_type, tier_id, and hold_scope are required");
    }

    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const locationId = this.locationContext.locationOrNull?.id ?? null;

    const resource = await this.prisma.resource.findFirst({
      where: {
        resourceType: dto.product_type,
        tierId: dto.tier_id,
        status: "available",
        ...(locationId ? { locationId } : {}),
      },
      orderBy: { updatedAt: "asc" }
    });

    if (!resource) {
      throw new ConflictException("No resource available");
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const hold = await this.prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id: resource.id },
        data: { status: "held" }
      });

      return tx.resourceHold.create({
        data: {
          resourceId: resource.id,
          visitId: dto.visit_id,
          holdScope: dto.hold_scope,
          status: "active",
          expiresAt
        }
      });
    });

    return this.toHoldResponse(hold);
  }

  async releaseHold(holdId: string): Promise<void> {
    const hold = await this.prisma.resourceHold.findUnique({ where: { id: holdId } });
    if (!hold) {
      throw new NotFoundException("Hold not found");
    }

    if (hold.status !== "active") {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.resourceHold.update({
        where: { id: holdId },
        data: {
          status: "released",
          releasedAt: new Date(),
          releaseReason: "manual_release"
        }
      });

      await tx.resource.update({
        where: { id: hold.resourceId },
        data: { status: "available" }
      });
    });
  }

  async finalizeAssignment(dto: FinalizeAssignmentDto): Promise<FinalizeAssignmentResponseDto> {
    if (!dto.visit_id || !dto.hold_id) {
      throw new BadRequestException("visit_id and hold_id are required");
    }

    const hold = await this.prisma.resourceHold.findUnique({
      where: { id: dto.hold_id },
      include: { resource: true }
    });

    if (!hold || hold.visitId !== dto.visit_id) {
      throw new NotFoundException("Hold not found");
    }

    if (hold.status !== "active") {
      throw new ConflictException("Hold is not active");
    }

    if (hold.expiresAt <= new Date()) {
      throw new ConflictException("Hold expired");
    }

    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    const previousResourceStatus = hold.resource.status as ResourceAvailabilityStatus;

    await this.prisma.$transaction(async (tx) => {
      await tx.resourceHold.update({
        where: { id: hold.id },
        data: {
          status: "converted",
          releasedAt: new Date(),
          releaseReason: "assignment_finalized"
        }
      });

      await tx.resource.update({
        where: { id: hold.resourceId },
        data: {
          status: "occupied",
          currentVisitId: dto.visit_id
        }
      });

      await tx.visit.update({
        where: { id: dto.visit_id },
        data: {
          assignedResourceId: hold.resourceId,
          status: visit.status === "paid_pending_assignment" ? "checked_in" : visit.status,
          startTime: visit.startTime ?? new Date()
        }
      });

      await tx.resourceStateHistory.create({
        data: {
          resourceId: hold.resourceId,
          previousStatus: previousResourceStatus,
          newStatus: "occupied",
          reasonCode: "assignment_finalized",
          changedByUserId: dto.changed_by_user_id ?? null,
          visitId: dto.visit_id
        }
      });
    });

    return {
      visitId: dto.visit_id,
      resourceId: hold.resourceId
    };
  }

  async listResources(productType?: string) {
    const resources = await this.prisma.resource.findMany({
      where: productType ? { resourceType: productType as any } : {},
      include: { tier: { select: { name: true, code: true } } },
      orderBy: [{ resourceType: 'asc' }, { zoneCode: 'asc' }, { displayLabel: 'asc' }],
    });

    return resources.map((r) => ({
      id: r.id,
      displayLabel: r.displayLabel,
      resourceType: r.resourceType,
      zoneCode: r.zoneCode,
      status: r.status,
      tierId: r.tierId,
      tierName: r.tier.name,
      tierCode: r.tier.code,
    }));
  }

  async setResourceStatus(resourceId: string, status: ResourceAvailabilityStatus, reason?: string, staffUserId?: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException("Resource not found");

    if (resource.status === "occupied" && status !== "occupied") {
      throw new ConflictException("Cannot change status of an occupied resource. Check out the active visit first.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.resource.update({
        where: { id: resourceId },
        data: { status, version: { increment: 1 } },
      });
      await tx.resourceStateHistory.create({
        data: {
          resourceId,
          previousStatus: resource.status,
          newStatus: status,
          reasonText: reason ?? null,
          changedByUserId: staffUserId ?? null,
        },
      });
      return r;
    });

    return {
      id: updated.id,
      displayLabel: updated.displayLabel,
      resourceType: updated.resourceType,
      status: updated.status,
      zoneCode: updated.zoneCode,
    };
  }

  private toHoldResponse(hold: {
    id: string;
    visitId: string | null;
    resourceId: string;
    status: string;
    holdScope: string;
    expiresAt: Date;
  }): ResourceHoldResponseDto {
    return {
      id: hold.id,
      visitId: hold.visitId,
      resourceId: hold.resourceId,
      status: hold.status,
      holdScope: hold.holdScope,
      expiresAt: hold.expiresAt.toISOString()
    };
  }
}
