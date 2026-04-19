import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { GuestVisitStatus } from '@prisma/client';

export class ListVisitsQueryDto {
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  @IsEnum(GuestVisitStatus, { each: true })
  @IsOptional()
  status?: GuestVisitStatus | GuestVisitStatus[];
}
