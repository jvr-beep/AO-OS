import { IsString, IsInt, IsOptional, IsEnum, Min } from "class-validator";

export enum MapFloorStatusDto {
  active = "active",
  inactive = "inactive",
  archived = "archived",
}

export class CreateMapFloorDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(-10)
  @IsOptional()
  level?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MapFloorStatusDto)
  @IsOptional()
  status?: MapFloorStatusDto;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
