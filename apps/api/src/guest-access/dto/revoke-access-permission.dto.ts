import { IsOptional, IsString } from "class-validator";

export class RevokeAccessPermissionDto {
  @IsString()
  @IsOptional()
  reason_code?: string;
}
