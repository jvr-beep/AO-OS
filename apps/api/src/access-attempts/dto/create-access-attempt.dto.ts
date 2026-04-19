import { IsISO8601, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAccessAttemptDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  wristbandId?: string;

  @IsString()
  @MinLength(1)
  accessPointId!: string;

  @IsString()
  @MinLength(1)
  accessZoneId!: string;

  @IsOptional()
  @IsString()
  attemptSource?: string;

  @IsISO8601()
  occurredAt!: string;
}
