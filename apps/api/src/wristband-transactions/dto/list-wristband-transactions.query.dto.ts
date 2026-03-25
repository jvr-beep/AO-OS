export class ListWristbandTransactionsQueryDto {
  memberId?: string;
  wristbandId?: string;
  transactionType?: string;
  merchantType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
}