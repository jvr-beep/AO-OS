import { AvailabilityTierResponseDto } from "./availability-tier.response.dto";

export class AvailabilitySearchResponseDto {
  productType!: string;
  availableTiers!: AvailabilityTierResponseDto[];
}
