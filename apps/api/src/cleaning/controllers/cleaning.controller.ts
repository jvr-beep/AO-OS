import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
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
}
