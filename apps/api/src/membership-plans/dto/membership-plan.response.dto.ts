export class MembershipPlanResponseDto {
  id!: string;
  code!: string;
  name!: string;
  description?: string | null;
  tierRank!: number;
  billingInterval!: string;
  priceAmount!: string;
  currency!: string;
  active!: boolean;
  createdAt!: string;
}