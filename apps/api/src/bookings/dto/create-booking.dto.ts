import {
  IsString,
  IsUUID,
  IsEnum,
  IsISO8601,
  IsInt,
  IsPositive,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuestBookingChannel, ProductType } from '@prisma/client';

export class CreateBookingAddOnDto {
  @IsString()
  add_on_code: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  unit_price_cents: number;
}

export class CreateBookingDto {
  @IsUUID()
  guest_id: string;

  @IsUUID()
  tier_id: string;

  @IsEnum(ProductType)
  product_type: ProductType;

  @IsEnum(GuestBookingChannel)
  booking_channel: GuestBookingChannel;

  @IsISO8601()
  booking_date: string;

  @IsISO8601()
  arrival_window_start: string;

  @IsISO8601()
  arrival_window_end: string;

  @IsInt()
  @IsPositive()
  duration_minutes: number;

  @IsInt()
  @Min(0)
  quoted_price_cents: number;

  @IsBoolean()
  @IsOptional()
  expects_existing_band?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingAddOnDto)
  add_ons?: CreateBookingAddOnDto[];
}
