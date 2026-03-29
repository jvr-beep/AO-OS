import { Type } from "class-transformer";
import { ProductType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min
} from "class-validator";

export class WalkInCheckInDto {
  @IsUUID()
  guest_id: string;

  @IsUUID()
  tier_id: string;

  @IsEnum(ProductType)
  product_type: ProductType;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  duration_minutes: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quoted_price_cents: number;

  @IsString()
  payment_provider: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount_paid_cents: number;

  @IsString()
  @IsOptional()
  changed_by_user_id?: string;
}
