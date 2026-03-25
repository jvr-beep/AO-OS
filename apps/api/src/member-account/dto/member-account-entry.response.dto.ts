export class MemberAccountEntryResponseDto {
  id!: string;
  memberId!: string;
  entryType!: "charge" | "credit" | "refund" | "payment";
  amount!: string;
  currency!: string;
  description?: string;
  status!: "posted" | "voided";
  sourceType!:
    | "wristband_transaction"
    | "manual_adjustment"
    | "manual_payment"
    | "refund"
    | "membership"
    | "locker_fee";
  sourceReference?: string;
  occurredAt!: string;
  createdAt!: string;
}