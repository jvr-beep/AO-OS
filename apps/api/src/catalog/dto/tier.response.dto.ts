export class TierDurationOptionDto {
  id!: string;
  durationMinutes!: number;
  priceCents!: number;
}

export class TierResponseDto {
  id!: string;
  productType!: string;
  code!: string;
  name!: string;
  description?: string | null;
  publicDescription?: string | null;
  upgradeRank!: number;
  basePriceCents!: number;
  active!: boolean;
  durationOptions!: TierDurationOptionDto[];
}
