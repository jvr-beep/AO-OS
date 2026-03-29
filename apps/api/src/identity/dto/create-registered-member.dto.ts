import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateRegisteredMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}
