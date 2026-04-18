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
}
