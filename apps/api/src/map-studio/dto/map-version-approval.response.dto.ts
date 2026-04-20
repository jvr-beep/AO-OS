export class MapVersionApprovalResponseDto {
  id: string;
  versionId: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewNote: string | null;
  n8nRunId: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
}
