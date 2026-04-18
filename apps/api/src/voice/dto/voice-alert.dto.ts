import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from "class-validator";

export class VoiceAlertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  text!: string;

  @IsOptional()
  @IsIn(["p1", "p2", "p3", "info"])
  severity?: "p1" | "p2" | "p3" | "info";
}
