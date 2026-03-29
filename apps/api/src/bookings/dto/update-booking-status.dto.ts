import { IsEnum } from 'class-validator';
import { GuestBookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @IsEnum(GuestBookingStatus)
  status: GuestBookingStatus;
}
