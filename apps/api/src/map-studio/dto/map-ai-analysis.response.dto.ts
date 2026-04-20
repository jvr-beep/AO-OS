export class MapAiSuggestionDto {
  type: 'naming' | 'missing_binding' | 'anomaly' | 'task' | 'info';
  severity: 'info' | 'warning' | 'critical';
  objectCode: string | null;
  message: string;
  suggestion: string | null;
}

export class MapAiAnalysisResponseDto {
  floorId: string;
  floorName: string;
  objectCount: number;
  analysedAt: Date;
  suggestions: MapAiSuggestionDto[];
  summary: string;
}
