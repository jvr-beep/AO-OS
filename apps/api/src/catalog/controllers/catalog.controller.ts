import { Controller, Get, Param, Query } from "@nestjs/common";
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
}
