export class CreateMembershipPlanDto {
  code!: string;
  name!: string;
  description?: string;
  tierRank!: number;
  billingInterval!: "day" | "week" | "month" | "year";
  priceAmount!: number;
  currency!: string;
  active?: boolean;
}