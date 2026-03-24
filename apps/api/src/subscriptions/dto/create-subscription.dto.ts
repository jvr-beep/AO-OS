export class CreateSubscriptionDto {
  memberId!: string;
  membershipPlanId!: string;
  billingProvider!: string;
  billingProviderCustomerId?: string;
  status!: "trialing" | "active" | "past_due" | "paused" | "cancelled";
  startDate!: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}