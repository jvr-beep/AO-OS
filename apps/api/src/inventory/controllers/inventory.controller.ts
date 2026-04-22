import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { AvailabilitySearchResponseDto } from "../dto/availability-search.response.dto";
import { CreateHoldDto } from "../dto/create-hold.dto";
import { FinalizeAssignmentResponseDto } from "../dto/finalize-assignment.response.dto";
import { FinalizeAssignmentDto } from "../dto/finalize-assignment.dto";
import { ResourceHoldResponseDto } from "../dto/resource-hold.response.dto";
import { SearchAvailabilityQueryDto } from "../dto/search-availability.query.dto";
import { InventoryService } from "../services/inventory.service";

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("availability/search")
  searchAvailability(@Query() query: SearchAvailabilityQueryDto): Promise<AvailabilitySearchResponseDto> {
    return this.inventoryService.searchAvailability(query);
  }

  @Post("inventory/holds")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createHold(@Body() body: CreateHoldDto): Promise<ResourceHoldResponseDto> {
    return this.inventoryService.createHold(body);
  }

  @Delete("inventory/holds/:holdId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  async releaseHold(@Param("holdId") holdId: string): Promise<void> {
    await this.inventoryService.releaseHold(holdId);
  }

  @Post("inventory/assignments/finalize")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  finalizeAssignment(@Body() body: FinalizeAssignmentDto): Promise<FinalizeAssignmentResponseDto> {
    return this.inventoryService.finalizeAssignment(body);
  }

  @Get("resources")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  listResources(@Query("product_type") productType?: string) {
    return this.inventoryService.listResources(productType as any);
  }

  @Patch("resources/:resourceId/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  setResourceStatus(
    @Param("resourceId") resourceId: string,
    @Body() body: { status: string; reason?: string },
    @Req() req: any,
  ) {
    return this.inventoryService.setResourceStatus(resourceId, body.status as any, body.reason, req.user?.id);
  }
}
