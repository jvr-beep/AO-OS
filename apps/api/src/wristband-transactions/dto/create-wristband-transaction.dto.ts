export class CreateWristbandTransactionDto {
  memberId!: string;
  wristbandId!: string;
  transactionType!: "purchase" | "adjustment" | "refund";
  merchantType!: string;
  amount!: number;
  currency!: string;
  description?: string;
  sourceReference?: string;
  status?: "pending" | "completed" | "failed";
  occurredAt!: string;
}
