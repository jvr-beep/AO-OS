export class MapFloorResponseDto {
  id: string;
  locationId: string;
  name: string;
  level: number;
  description: string | null;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  versionCount?: number;
  publishedVersion?: MapFloorVersionSummaryDto | null;
}

export class MapFloorVersionSummaryDto {
  id: string;
  versionNum: number;
  label: string | null;
  isDraft: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}
