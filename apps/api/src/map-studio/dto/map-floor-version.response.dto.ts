export class MapFloorVersionResponseDto {
  id: string;
  floorId: string;
  versionNum: number;
  label: string | null;
  svgContent: string;
  isDraft: boolean;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdBy: string | null;
  notes: string | null;
  createdAt: Date;
}
