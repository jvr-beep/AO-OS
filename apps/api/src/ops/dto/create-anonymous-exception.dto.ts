import { ExceptionSeverity } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class CreateAnonymousExceptionDto {
  @IsString()
  exception_type: string;

  @IsEnum(ExceptionSeverity)
  severity: ExceptionSeverity;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
