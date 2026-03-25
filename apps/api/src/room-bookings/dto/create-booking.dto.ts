export class CreateBookingDto {
  memberId!: string;
  roomId!: string;
  bookingType!: "restore" | "release" | "retreat";
  startsAt!: string;
  endsAt!: string;
  sourceType!: "membership_credit" | "upgrade_credit" | "one_time_purchase" | "manual_staff" | "package_credit";
  sourceReference?: string;
  waitlistPriority?: number;
}
