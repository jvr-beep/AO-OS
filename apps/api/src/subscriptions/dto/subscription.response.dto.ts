export class SubscriptionResponseDto {
  id!: string;
  memberId!: string;
  membershipPlanId!: string;
  billingProvider!: string;
  billingProviderCustomerId?: string | null;
  status!: string;
  cancelAtPeriodEnd!: boolean;
  startDate!: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt!: string;
}