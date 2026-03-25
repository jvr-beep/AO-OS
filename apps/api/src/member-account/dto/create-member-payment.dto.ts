export class CreateMemberPaymentDto {
  amount!: number;
  currency!: string;
  description?: string;
  sourceReference?: string;
  occurredAt!: string;
}