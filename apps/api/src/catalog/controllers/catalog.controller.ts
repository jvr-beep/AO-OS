import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AddOnResponseDto } from "../dto/add-on.response.dto";
import { ListAddOnsQueryDto } from "../dto/list-add-ons.query.dto";
import { ListTiersQueryDto } from "../dto/list-tiers.query.dto";
import { TierDurationResponseDto } from "../dto/tier-duration.response.dto";
import { TierResponseDto } from "../dto/tier.response.dto";
import { CatalogService } from "../services/catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("tiers")
  listTiers(@Query() query: ListTiersQueryDto): Promise<TierResponseDto[]> {
    return this.catalogService.listTiers(query);
  }

  @Get("tiers/:tierId/durations")
  listTierDurations(@Param("tierId") tierId: string): Promise<TierDurationResponseDto[]> {
    return this.catalogService.listTierDurations(tierId);
  }

  @Get("add-ons")
  listAddOns(@Query() query: ListAddOnsQueryDto): AddOnResponseDto[] {
    return this.catalogService.listAddOns(query);
  }

  // ── Admin tier management ──────────────────────────────────────────────────

  @Get("admin/tiers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminListTiers() {
    return this.catalogService.adminListTiers();
  }

  @Post("admin/tiers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminCreateTier(
    @Body() body: { code: string; productType: string; name: string; publicDescription?: string; basePriceCents: number; upgradeRank?: number },
  ) {
    if (!body.code?.trim() || !body.productType || !body.name?.trim()) {
      throw new BadRequestException("code, productType, and name are required");
    }
    if (!['locker', 'room'].includes(body.productType)) {
      throw new BadRequestException("productType must be 'locker' or 'room'");
    }
    return this.catalogService.adminCreateTier(body);
  }

  @Patch("admin/tiers/:tierId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminUpdateTier(
    @Param("tierId") tierId: string,
    @Body() body: { name?: string; publicDescription?: string; basePriceCents?: number; upgradeRank?: number; active?: boolean },
  ) {
    return this.catalogService.adminUpdateTier(tierId, body);
  }

  @Post("admin/tiers/:tierId/durations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminAddDuration(
    @Param("tierId") tierId: string,
    @Body() body: { durationMinutes: number; priceCents: number },
  ) {
    return this.catalogService.adminAddDuration(tierId, body.durationMinutes, body.priceCents);
  }

  @Patch("admin/tiers/:tierId/durations/:durationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminUpdateDuration(
    @Param("tierId") tierId: string,
    @Param("durationId") durationId: string,
    @Body() body: { priceCents?: number; active?: boolean },
  ) {
    return this.catalogService.adminUpdateDuration(tierId, durationId, body);
  }
}
