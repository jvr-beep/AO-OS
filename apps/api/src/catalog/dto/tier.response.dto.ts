export class TierResponseDto {
  id!: string;
  productType!: string;
  code!: string;
  name!: string;
  publicDescription?: string | null;
  upgradeRank!: number;
  basePriceCents!: number;
  active!: boolean;
}
