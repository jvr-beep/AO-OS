import { ExceptionStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ResolveSystemExceptionDto {
  @IsEnum(ExceptionStatus)
  status: ExceptionStatus;
}
