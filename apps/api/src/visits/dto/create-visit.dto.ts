import {
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsPositive,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ProductType, VisitSourceType } from '@prisma/client';

export class CreateVisitDto {
  @IsUUID()
  guest_id: string;

  @IsEnum(VisitSourceType)
  source_type: VisitSourceType;

  @IsEnum(ProductType)
  product_type: ProductType;

  @IsUUID()
  tier_id: string;

  @IsInt()
  @IsPositive()
  duration_minutes: number;

  @IsUUID()
  @IsOptional()
  booking_id?: string;

  @IsBoolean()
  @IsOptional()
  waiver_required?: boolean;
}
