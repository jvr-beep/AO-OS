import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CleaningTaskResponseDto } from "../dto/cleaning-task.response.dto";
import { CompleteCleaningTaskDto } from "../dto/complete-cleaning-task.dto";
import { ListCleaningTasksQueryDto } from "../dto/list-cleaning-tasks.query.dto";
import { StartCleaningTaskDto } from "../dto/start-cleaning-task.dto";
import { CleaningService } from "../services/cleaning.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CleaningController {
  constructor(private readonly cleaningService: CleaningService) {}

  @Get("cleaning/tasks")
  @Roles("front_desk", "operations", "admin")
  listTasks(@Query() query: ListCleaningTasksQueryDto): Promise<CleaningTaskResponseDto[]> {
    return this.cleaningService.listTasks(query);
  }

  @Post("cleaning/tasks/:id/start")
  @Roles("operations", "admin")
  startTask(
    @Param("id") id: string,
    @Body() body: StartCleaningTaskDto
  ): Promise<CleaningTaskResponseDto> {
    return this.cleaningService.startTask(id, body);
  }

  @Post("cleaning/tasks/:id/complete")
  @Roles("operations", "admin")
  completeTask(
    @Param("id") id: string,
    @Body() body: CompleteCleaningTaskDto
  ): Promise<CleaningTaskResponseDto> {
    return this.cleaningService.completeTask(id, body);
  }

  @Patch("cleaning/tasks/:id/urgent")
  @Roles("operations", "admin")
  flagUrgent(
    @Param("id") id: string,
    @Body() body: { isUrgent: boolean }
  ): Promise<CleaningTaskResponseDto> {
    return this.cleaningService.flagUrgent(id, body.isUrgent);
  }

  @Post("cleaning/rooms/:roomId/flag-urgent")
  @Roles("operations", "admin")
  @HttpCode(HttpStatus.OK)
  flagRoomUrgent(@Param("roomId") roomId: string): Promise<CleaningTaskResponseDto> {
    return this.cleaningService.flagRoomUrgent(roomId);
  }

  @Post("cleaning/rooms/:roomId/start")
  @Roles("operations", "admin")
  @HttpCode(HttpStatus.OK)
  startRoomCleaning(
    @Param("roomId") roomId: string,
    @Body() body: { assignedToStaffUserId?: string }
  ): Promise<CleaningTaskResponseDto> {
    return this.cleaningService.startTaskByRoom(roomId, body.assignedToStaffUserId);
  }

  @Post("cleaning/rooms/:roomId/complete")
  @Roles("operations", "admin")
  @HttpCode(HttpStatus.OK)
  completeRoomCleaning(
    @Param("roomId") roomId: string,
    @Body() body: { notes?: string }
  ): Promise<CleaningTaskResponseDto> {
    return this.cleaningService.completeTaskByRoom(roomId, body.notes);
  }
}
