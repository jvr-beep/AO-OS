export class PatResponseDto {
  id!: string;
  name!: string;
  prefix!: string;
  createdAt!: string;
  expiresAt!: string | null;
  lastUsedAt!: string | null;
  revokedAt!: string | null;
}

export class CreatedPatResponseDto extends PatResponseDto {
  rawToken!: string;
}
