export class CleaningTaskResponseDto {
  id!: string;
  roomId!: string;
  bookingId?: string;
  taskType!: "turnover" | "deep_clean" | "inspection";
  status!: "open" | "in_progress" | "completed" | "cancelled";
  isUrgent!: boolean;
  createdAt!: string;
  startedAt?: string;
  completedAt?: string;
  assignedToStaffUserId?: string;
  notes?: string;
}
