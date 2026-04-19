export class LiveObjectStateDto {
  mapObjectId: string;
  svgElementId: string | null;
  objectType: string;
  code: string;
  label: string;
  state: "available" | "occupied" | "cleaning" | "reserved" | "offline" | "incident" | "unknown";
  occupantName: string | null;
  endsAt: string | null;
  timeRemainingSeconds: number | null;
  cleaningStatus: string | null;
  incidentNote: string | null;
  metadata: Record<string, unknown>;
}

export class MapStudioLiveResponseDto {
  floorId: string;
  versionId: string;
  svgContent: string;
  objects: LiveObjectStateDto[];
  generatedAt: Date;
}
