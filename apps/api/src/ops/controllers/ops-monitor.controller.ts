import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { MonitorKeyGuard } from "../guards/monitor-key.guard";
import { OpsService } from "../services/ops.service";
import { CreateAnonymousExceptionDto } from "../dto/create-anonymous-exception.dto";

@Controller("ops")
@UseGuards(MonitorKeyGuard)
export class OpsMonitorController {
  constructor(private readonly opsService: OpsService) {}

  @Get("exceptions/monitor")
  getOpenExceptions() {
    return this.opsService.listExceptions({ status: "open" });
  }

  @Post("exceptions/anonymous")
  createAnonymousException(@Body() dto: CreateAnonymousExceptionDto) {
    return this.opsService.createException({
      exception_type: dto.exception_type,
      severity: dto.severity,
      payload: dto.payload,
    });
  }
}
