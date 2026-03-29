import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CreateSystemExceptionDto } from "../dto/create-system-exception.dto";
import { ListSystemExceptionsQueryDto } from "../dto/list-system-exceptions.query.dto";
import { ResolveSystemExceptionDto } from "../dto/resolve-system-exception.dto";
import { OpsService } from "../services/ops.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("ops")
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get("snapshot")
  @Roles("operations", "admin")
  getSnapshot() {
    return this.opsService.getOpsSnapshot();
  }

  @Get("exceptions")
  @Roles("operations", "admin")
  listExceptions(@Query() query: ListSystemExceptionsQueryDto) {
    return this.opsService.listExceptions(query);
  }

  @Post("exceptions")
  @Roles("operations", "admin")
  createException(@Body() dto: CreateSystemExceptionDto) {
    return this.opsService.createException(dto);
  }

  @Patch("exceptions/:exceptionId/status")
  @Roles("operations", "admin")
  resolveException(
    @Param("exceptionId", ParseUUIDPipe) exceptionId: string,
    @Body() dto: ResolveSystemExceptionDto
  ) {
    return this.opsService.resolveException(exceptionId, dto);
  }
}
