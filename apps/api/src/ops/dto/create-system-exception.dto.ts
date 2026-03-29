import { ExceptionSeverity } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSystemExceptionDto {
  @IsString()
  exception_type: string;

  @IsEnum(ExceptionSeverity)
  severity: ExceptionSeverity;

  @IsUUID()
  @IsOptional()
  visit_id?: string;

  @IsUUID()
  @IsOptional()
  booking_id?: string;

  @IsUUID()
  @IsOptional()
  folio_id?: string;

  @IsUUID()
  @IsOptional()
  resource_id?: string;

  @IsString()
  @IsOptional()
  wristband_id?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
