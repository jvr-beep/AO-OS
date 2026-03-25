export class MemberAccountSummaryResponseDto {
  memberId!: string;
  currency!: string;
  balance!: string;
  postedChargeTotal!: string;
  postedCreditTotal!: string;
  postedPaymentTotal!: string;
  postedRefundTotal!: string;
}