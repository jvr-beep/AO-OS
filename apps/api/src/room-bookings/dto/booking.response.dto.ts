export class BookingResponseDto {
  id!: string;
  memberId!: string;
  roomId!: string;
  bookingType!: "restore" | "release" | "retreat";
  status!: "reserved" | "checked_in" | "checked_out" | "expired" | "cancelled" | "no_show" | "waitlisted";
  startsAt!: string;
  endsAt!: string;
  sourceType!: "membership_credit" | "upgrade_credit" | "one_time_purchase" | "manual_staff" | "package_credit";
  sourceReference?: string;
  waitlistPriority!: number;
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt!: string;
  updatedAt!: string;
}
