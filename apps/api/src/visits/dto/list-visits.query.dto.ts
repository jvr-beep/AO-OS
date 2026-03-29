import { IsEnum, IsOptional } from 'class-validator';
import { GuestVisitStatus } from '@prisma/client';

export class ListVisitsQueryDto {
  @IsEnum(GuestVisitStatus)
  @IsOptional()
  status?: GuestVisitStatus;
}
