import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean } from "class-validator";

export enum MapObjectTypeDto {
  room = "room",
  door = "door",
  access_reader = "access_reader",
  locker_bank = "locker_bank",
  zone_boundary = "zone_boundary",
  amenity = "amenity",
  sensor = "sensor",
  staff_area = "staff_area",
  circulation = "circulation",
  incident = "incident",
}

export class CreateMapObjectDto {
  @IsString()
  @IsOptional()
  svgElementId?: string;

  @IsEnum(MapObjectTypeDto)
  objectType: MapObjectTypeDto;

  @IsString()
  code: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  accessPointId?: string;

  @IsString()
  @IsOptional()
  lockerId?: string;

  @IsString()
  @IsOptional()
  accessZoneId?: string;

  @IsNumber()
  @IsOptional()
  posX?: number;

  @IsNumber()
  @IsOptional()
  posY?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
