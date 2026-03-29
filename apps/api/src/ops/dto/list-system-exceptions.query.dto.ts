import { ExceptionSeverity, ExceptionStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ListSystemExceptionsQueryDto {
  @IsEnum(ExceptionStatus)
  @IsOptional()
  status?: ExceptionStatus;

  @IsEnum(ExceptionSeverity)
  @IsOptional()
  severity?: ExceptionSeverity;
}
