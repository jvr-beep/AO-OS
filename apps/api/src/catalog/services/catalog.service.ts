import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LocationContextService } from "../../location/location-context.service";
import { AddOnResponseDto } from "../dto/add-on.response.dto";
import { ListAddOnsQueryDto } from "../dto/list-add-ons.query.dto";
import { ListTiersQueryDto } from "../dto/list-tiers.query.dto";
import { TierDurationResponseDto } from "../dto/tier-duration.response.dto";
import { TierResponseDto } from "../dto/tier.response.dto";

const DEFAULT_ADD_ONS: AddOnResponseDto[] = [
  { code: "TOWEL", name: "Towel Rental", priceCents: 500, quantityLimit: 4, productType: "both" },
  { code: "AROMA", name: "Aromatherapy Upgrade", priceCents: 1200, quantityLimit: 1, productType: "room" },
  { code: "LOCK", name: "Premium Lock Rental", priceCents: 300, quantityLimit: 1, productType: "locker" }
];

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationContext: LocationContextService,
  ) {}

  async listTiers(query: ListTiersQueryDto): Promise<TierResponseDto[]> {
    const locationId = this.locationContext.locationOrNull?.id ?? null;
    const tiers = await this.prisma.tier.findMany({
      where: {
        active: true,
        ...(locationId ? { locationId } : {}),
        ...(query.product_type ? { productType: query.product_type } : {})
      },
      orderBy: [{ productType: "asc" }, { upgradeRank: "asc" }, { name: "asc" }],
      include: {
        durationOptions: {
          where: { active: true },
          orderBy: { durationMinutes: "asc" },
        },
      },
    });

    return tiers.map((tier) => ({
      id: tier.id,
      productType: tier.productType,
      code: tier.code,
      name: tier.name,
      description: tier.publicDescription,
      publicDescription: tier.publicDescription,
      upgradeRank: tier.upgradeRank,
      basePriceCents: tier.basePriceCents,
      active: tier.active,
      durationOptions: (tier.durationOptions ?? []).map((d) => ({
        id: d.id,
        durationMinutes: d.durationMinutes,
        priceCents: d.priceCents,
      })),
    }));
  }

  async listTierDurations(tierId: string): Promise<TierDurationResponseDto[]> {
    const tier = await this.prisma.tier.findUnique({ where: { id: tierId } });
    if (!tier || !tier.active) {
      throw new NotFoundException("Tier not found");
    }

    const durations = await this.prisma.tierDurationOption.findMany({
      where: { tierId, active: true },
      orderBy: { durationMinutes: "asc" }
    });

    return durations.map((duration) => ({
      id: duration.id,
      tierId: duration.tierId,
      durationMinutes: duration.durationMinutes,
      priceCents: duration.priceCents,
      active: duration.active
    }));
  }

  listAddOns(query: ListAddOnsQueryDto): AddOnResponseDto[] {
    if (!query.product_type) {
      return DEFAULT_ADD_ONS;
    }

    return DEFAULT_ADD_ONS.filter(
      (addOn) => addOn.productType === "both" || addOn.productType === query.product_type
    );
  }

  // ── Admin tier management ─────────────────────────────────────────────────

  async adminCreateTier(dto: {
    code: string;
    productType: string;
    name: string;
    publicDescription?: string | null;
    basePriceCents: number;
    upgradeRank?: number;
  }) {
    const existing = await this.prisma.tier.findUnique({ where: { code: dto.code } });
    if (existing) throw new Error(`Tier code '${dto.code}' already exists`);

    const created = await this.prisma.tier.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        productType: dto.productType as any,
        name: dto.name.trim(),
        publicDescription: dto.publicDescription?.trim() || null,
        basePriceCents: dto.basePriceCents,
        upgradeRank: dto.upgradeRank ?? 0,
        active: true,
      },
      include: { durationOptions: { orderBy: { durationMinutes: 'asc' } } },
    });

    return {
      id: created.id,
      code: created.code,
      productType: created.productType,
      name: created.name,
      publicDescription: created.publicDescription,
      upgradeRank: created.upgradeRank,
      basePriceCents: created.basePriceCents,
      active: created.active,
      durationOptions: [],
    };
  }

  async adminListTiers() {
    const tiers = await this.prisma.tier.findMany({
      orderBy: [{ productType: "asc" }, { upgradeRank: "asc" }, { name: "asc" }],
      include: {
        durationOptions: { orderBy: { durationMinutes: "asc" } },
      },
    });

    return tiers.map((t) => ({
      id: t.id,
      code: t.code,
      productType: t.productType,
      name: t.name,
      publicDescription: t.publicDescription,
      upgradeRank: t.upgradeRank,
      basePriceCents: t.basePriceCents,
      active: t.active,
      durationOptions: t.durationOptions.map((d) => ({
        id: d.id,
        durationMinutes: d.durationMinutes,
        priceCents: d.priceCents,
        active: d.active,
      })),
    }));
  }

  async adminUpdateTier(tierId: string, dto: {
    name?: string;
    publicDescription?: string | null;
    basePriceCents?: number;
    upgradeRank?: number;
    active?: boolean;
  }) {
    const tier = await this.prisma.tier.findUnique({ where: { id: tierId } });
    if (!tier) throw new NotFoundException("Tier not found");

    const updated = await this.prisma.tier.update({
      where: { id: tierId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.publicDescription !== undefined ? { publicDescription: dto.publicDescription?.trim() || null } : {}),
        ...(dto.basePriceCents !== undefined ? { basePriceCents: dto.basePriceCents } : {}),
        ...(dto.upgradeRank !== undefined ? { upgradeRank: dto.upgradeRank } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: { durationOptions: { orderBy: { durationMinutes: "asc" } } },
    });

    return {
      id: updated.id,
      code: updated.code,
      productType: updated.productType,
      name: updated.name,
      publicDescription: updated.publicDescription,
      upgradeRank: updated.upgradeRank,
      basePriceCents: updated.basePriceCents,
      active: updated.active,
      durationOptions: updated.durationOptions.map((d) => ({
        id: d.id,
        durationMinutes: d.durationMinutes,
        priceCents: d.priceCents,
        active: d.active,
      })),
    };
  }

  async adminAddDuration(tierId: string, durationMinutes: number, priceCents: number) {
    const tier = await this.prisma.tier.findUnique({ where: { id: tierId } });
    if (!tier) throw new NotFoundException("Tier not found");

    const created = await this.prisma.tierDurationOption.create({
      data: { tierId, durationMinutes, priceCents, active: true },
    });

    return {
      id: created.id,
      tierId: created.tierId,
      durationMinutes: created.durationMinutes,
      priceCents: created.priceCents,
      active: created.active,
    };
  }

  async adminUpdateDuration(tierId: string, durationId: string, dto: { priceCents?: number; active?: boolean }) {
    const duration = await this.prisma.tierDurationOption.findFirst({
      where: { id: durationId, tierId },
    });
    if (!duration) throw new NotFoundException("Duration option not found");

    const updated = await this.prisma.tierDurationOption.update({
      where: { id: durationId },
      data: {
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    return {
      id: updated.id,
      tierId: updated.tierId,
      durationMinutes: updated.durationMinutes,
      priceCents: updated.priceCents,
      active: updated.active,
    };
  }
}
