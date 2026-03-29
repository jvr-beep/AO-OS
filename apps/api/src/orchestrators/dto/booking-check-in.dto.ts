import { IsOptional, IsString, IsUUID } from "class-validator";

export class BookingCheckInDto {
  @IsUUID()
  @IsOptional()
  booking_id?: string;

  @IsString()
  @IsOptional()
  booking_code?: string;

  @IsString()
  @IsOptional()
  changed_by_user_id?: string;
}
