import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAnonymousMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  alias?: string;
}
