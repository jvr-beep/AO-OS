import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CleaningTaskStatus, CleaningTaskType, RoomStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CleaningTaskResponseDto } from "../dto/cleaning-task.response.dto";
import { CompleteCleaningTaskDto } from "../dto/complete-cleaning-task.dto";
import { ListCleaningTasksQueryDto } from "../dto/list-cleaning-tasks.query.dto";
import { StartCleaningTaskDto } from "../dto/start-cleaning-task.dto";

@Injectable()
export class CleaningService {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(query: ListCleaningTasksQueryDto): Promise<CleaningTaskResponseDto[]> {
    const rows = await this.prisma.cleaningTask.findMany({
      where: {
        ...(query.roomId ? { roomId: query.roomId } : {}),
        ...(query.status ? { status: this.parseStatus(query.status) } : {}),
        ...(query.taskType ? { taskType: this.parseTaskType(query.taskType) } : {}),
        ...(query.assignedToStaffUserId ? { assignedToStaffUserId: query.assignedToStaffUserId } : {})
      },
      take: this.parseLimit(query.limit),
      orderBy: { createdAt: "desc" }
    });

    return rows.map((row) => this.toResponse(row));
  }

  async startTask(id: string, input: StartCleaningTaskDto): Promise<CleaningTaskResponseDto> {
    const occurredAt = this.parseDate(input.occurredAt, "INVALID_OCCURRED_AT");
    return this.startTaskById(id, occurredAt, input.assignedToStaffUserId);
  }

  async startTaskByRoom(roomId: string, staffUserId?: string): Promise<CleaningTaskResponseDto> {
    const task = await this.prisma.cleaningTask.findFirst({
      where: { roomId, status: "open" },
      orderBy: { createdAt: "asc" }
    });
    if (!task) throw new NotFoundException("NO_OPEN_CLEANING_TASK_FOR_ROOM");
    return this.startTaskById(task.id, new Date(), staffUserId);
  }

  async flagUrgent(id: string, isUrgent: boolean): Promise<CleaningTaskResponseDto> {
    const task = await this.prisma.cleaningTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("CLEANING_TASK_NOT_FOUND");
    if (task.status === "completed" || task.status === "cancelled") {
      throw new ConflictException("CLEANING_TASK_NOT_FLAGGABLE");
    }
    const updated = await this.prisma.cleaningTask.update({ where: { id }, data: { isUrgent } });
    return this.toResponse(updated);
  }

  async flagRoomUrgent(roomId: string): Promise<CleaningTaskResponseDto> {
    const task = await this.prisma.cleaningTask.findFirst({
      where: { roomId, status: { in: ["open", "in_progress"] } },
      orderBy: [{ status: "desc" }, { createdAt: "asc" }]
    });
    if (!task) throw new NotFoundException("NO_ACTIVE_CLEANING_TASK_FOR_ROOM");
    const updated = await this.prisma.cleaningTask.update({ where: { id: task.id }, data: { isUrgent: true } });
    return this.toResponse(updated);
  }

  async completeTaskByRoom(roomId: string, notes?: string): Promise<CleaningTaskResponseDto> {
    const task = await this.prisma.cleaningTask.findFirst({
      where: { roomId, status: { in: ["open", "in_progress"] } },
      orderBy: [{ status: "desc" }, { createdAt: "asc" }]
    });
    if (!task) throw new NotFoundException("NO_ACTIVE_CLEANING_TASK_FOR_ROOM");
    return this.completeTaskById(task.id, new Date(), notes);
  }

  private async startTaskById(id: string, occurredAt: Date, staffUserId?: string): Promise<CleaningTaskResponseDto> {
    const task = await this.prisma.cleaningTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("CLEANING_TASK_NOT_FOUND");
    if (task.status !== "open") throw new ConflictException("CLEANING_TASK_NOT_STARTABLE");

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.cleaningTask.update({
        where: { id },
        data: {
          status: "in_progress",
          startedAt: occurredAt,
          assignedToStaffUserId: staffUserId ?? task.assignedToStaffUserId
        }
      });
      await tx.room.update({
        where: { id: task.roomId },
        data: { status: "cleaning" }
      });
      return row;
    });

    return this.toResponse(updated);
  }

  async completeTask(id: string, input: CompleteCleaningTaskDto): Promise<CleaningTaskResponseDto> {
    const occurredAt = this.parseDate(input.occurredAt, "INVALID_OCCURRED_AT");
    return this.completeTaskById(id, occurredAt, input.notes);
  }

  private async completeTaskById(id: string, occurredAt: Date, notes?: string): Promise<CleaningTaskResponseDto> {
    const task = await this.prisma.cleaningTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("CLEANING_TASK_NOT_FOUND");
    if (task.status !== "open" && task.status !== "in_progress") {
      throw new ConflictException("CLEANING_TASK_NOT_COMPLETABLE");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.cleaningTask.update({
        where: { id },
        data: {
          status: "completed",
          completedAt: occurredAt,
          notes: notes ?? task.notes
        }
      });

      const activeBooking = await tx.roomBooking.findFirst({
        where: {
          roomId: task.roomId,
          status: { in: ["checked_in", "reserved"] }
        },
        orderBy: { startsAt: "asc" }
      });

      let nextRoomStatus: RoomStatus = "available";
      if (activeBooking?.status === "checked_in") {
        nextRoomStatus = "occupied";
      } else if (activeBooking?.status === "reserved") {
        nextRoomStatus = "booked";
      }

      await tx.room.update({
        where: { id: task.roomId },
        data: {
          status: nextRoomStatus,
          lastTurnedAt: occurredAt
        }
      });

      return row;
    });

    return this.toResponse(updated);
  }

  private parseDate(value: string, errorCode: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(errorCode);
    }

    return parsed;
  }

  private parseLimit(input: string | undefined): number | undefined {
    if (!input) {
      return undefined;
    }

    const parsed = Number.parseInt(input, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException("INVALID_LIMIT");
    }

    return Math.min(parsed, 200);
  }

  private parseStatus(input: string): CleaningTaskStatus {
    if (input === "open" || input === "in_progress" || input === "completed" || input === "cancelled") {
      return input;
    }

    throw new BadRequestException("INVALID_CLEANING_TASK_STATUS");
  }

  private parseTaskType(input: string): CleaningTaskType {
    if (input === "turnover" || input === "deep_clean" || input === "inspection") {
      return input;
    }

    throw new BadRequestException("INVALID_CLEANING_TASK_TYPE");
  }

  private toResponse(row: {
    id: string;
    roomId: string;
    bookingId: string | null;
    taskType: CleaningTaskType;
    status: CleaningTaskStatus;
    isUrgent: boolean;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    assignedToStaffUserId: string | null;
    notes: string | null;
  }): CleaningTaskResponseDto {
    return {
      id: row.id,
      roomId: row.roomId,
      bookingId: row.bookingId ?? undefined,
      taskType: row.taskType,
      status: row.status,
      isUrgent: row.isUrgent,
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      assignedToStaffUserId: row.assignedToStaffUserId ?? undefined,
      notes: row.notes ?? undefined
    };
  }
}
