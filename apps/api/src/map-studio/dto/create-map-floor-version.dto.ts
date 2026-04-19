import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateMapFloorVersionDto {
  @IsString()
  svgContent: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  publish?: boolean;
}
