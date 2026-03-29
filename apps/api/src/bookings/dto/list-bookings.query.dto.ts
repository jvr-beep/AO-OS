import { IsEnum, IsOptional } from 'class-validator';
import { GuestBookingStatus } from '@prisma/client';

export class ListBookingsQueryDto {
  @IsEnum(GuestBookingStatus)
  @IsOptional()
  status?: GuestBookingStatus;
}
