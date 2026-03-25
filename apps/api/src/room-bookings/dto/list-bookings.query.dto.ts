export class ListBookingsQueryDto {
  memberId?: string;
  roomId?: string;
  status?: string;
  bookingType?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
}
