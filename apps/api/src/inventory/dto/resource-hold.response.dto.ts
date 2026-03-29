export class ResourceHoldResponseDto {
  id!: string;
  visitId?: string | null;
  resourceId!: string;
  status!: string;
  holdScope!: string;
  expiresAt!: string;
}
