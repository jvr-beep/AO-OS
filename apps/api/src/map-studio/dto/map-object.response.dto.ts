export class MapObjectResponseDto {
  id: string;
  floorId: string;
  svgElementId: string | null;
  objectType: string;
  code: string;
  label: string;
  roomId: string | null;
  accessPointId: string | null;
  lockerId: string | null;
  accessZoneId: string | null;
  posX: number | null;
  posY: number | null;
  metadataJson: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
