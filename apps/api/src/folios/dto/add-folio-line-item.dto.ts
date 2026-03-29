import { Type } from "class-transformer";
import { IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class AddFolioLineItemDto {
  @IsString()
  line_type: string;

  @IsString()
  @IsOptional()
  reference_code?: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsInt()
  unit_amount_cents: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
