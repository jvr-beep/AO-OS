import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class ConvertMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
