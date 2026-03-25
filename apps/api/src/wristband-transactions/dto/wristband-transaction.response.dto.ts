export class WristbandTransactionResponseDto {
  id!: string;
  memberId!: string;
  wristbandId!: string;
  transactionType!: "purchase" | "adjustment" | "refund";
  merchantType!: string;
  amount!: string;
  currency!: string;
  description?: string;
  sourceReference?: string;
  status!: "pending" | "completed" | "failed";
  occurredAt!: string;
  createdAt!: string;
}
