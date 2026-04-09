import { Controller, Get, UseGuards } from "@nestjs/common";
import { MonitorKeyGuard } from "../guards/monitor-key.guard";
import { OpsService } from "../services/ops.service";

@Controller("ops")
@UseGuards(MonitorKeyGuard)
export class OpsMonitorController {
  constructor(private readonly opsService: OpsService) {}

  @Get("exceptions/monitor")
  getOpenExceptions() {
    return this.opsService.listExceptions({ status: "open" });
  }
}
