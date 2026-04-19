import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CreateFloorPlanAreaDto } from "../dto/create-floor-plan-area.dto";
import { CreateFloorPlanDto } from "../dto/create-floor-plan.dto";
import { FloorPlanAreaResponseDto } from "../dto/floor-plan-area.response.dto";
import { FloorPlanResponseDto } from "../dto/floor-plan.response.dto";
import { FloorPlanLiveResponseDto } from "../dto/floor-plan-live.response.dto";
import { ListFloorPlansQueryDto } from "../dto/list-floor-plans.query.dto";
import { FloorPlansService } from "../services/floor-plans.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FloorPlansController {
  constructor(private readonly floorPlansService: FloorPlansService) {}

  @Post("floor-plans")
  @Roles("admin")
  createFloorPlan(@Body() body: CreateFloorPlanDto): Promise<FloorPlanResponseDto> {
    return this.floorPlansService.createFloorPlan(body);
  }

  @Post("floor-plans/:id/areas")
  @Roles("admin")
  createFloorPlanArea(
    @Param("id") floorPlanId: string,
    @Body() body: CreateFloorPlanAreaDto
  ): Promise<FloorPlanAreaResponseDto> {
    return this.floorPlansService.createFloorPlanArea(floorPlanId, body);
  }

  @Get("floor-plans")
  @Roles("front_desk", "operations", "admin")
  listFloorPlans(@Query() query: ListFloorPlansQueryDto): Promise<FloorPlanResponseDto[]> {
    return this.floorPlansService.listFloorPlans(query);
  }

  @Get("floor-plans/:id")
  @Roles("front_desk", "operations", "admin")
  getFloorPlan(@Param("id") id: string): Promise<FloorPlanResponseDto> {
    return this.floorPlansService.getFloorPlan(id);
  }

  @Get("floor-plans/:id/live")
  @Roles("front_desk", "operations", "admin")
  getLiveFloorPlan(@Param("id") id: string): Promise<FloorPlanLiveResponseDto> {
    return this.floorPlansService.getLiveFloorPlan(id);
  }
}
