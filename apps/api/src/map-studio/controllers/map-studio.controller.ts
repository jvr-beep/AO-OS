import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { MapStudioService } from "../services/map-studio.service";
import { CreateMapFloorDto } from "../dto/create-map-floor.dto";
import { CreateMapFloorVersionDto } from "../dto/create-map-floor-version.dto";
import { CreateMapObjectDto } from "../dto/create-map-object.dto";
import { MapFloorResponseDto } from "../dto/map-floor.response.dto";
import { MapFloorVersionResponseDto } from "../dto/map-floor-version.response.dto";
import { MapObjectResponseDto } from "../dto/map-object.response.dto";
import { MapStudioLiveResponseDto } from "../dto/map-studio-live.response.dto";

@Controller("map-studio")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapStudioController {
  constructor(private readonly mapStudioService: MapStudioService) {}

  // ── Floors ──────────────────────────────────────────────────────────────

  @Get("floors")
  @Roles("front_desk", "operations", "admin")
  listFloors(): Promise<MapFloorResponseDto[]> {
    return this.mapStudioService.listFloors();
  }

  @Post("floors")
  @Roles("operations", "admin")
  createFloor(@Body() body: CreateMapFloorDto): Promise<MapFloorResponseDto> {
    return this.mapStudioService.createFloor(body);
  }

  @Get("floors/:floorId")
  @Roles("front_desk", "operations", "admin")
  getFloor(@Param("floorId") floorId: string): Promise<MapFloorResponseDto> {
    return this.mapStudioService.getFloor(floorId);
  }

  // ── Versions ─────────────────────────────────────────────────────────────

  @Get("floors/:floorId/versions")
  @Roles("front_desk", "operations", "admin")
  listVersions(@Param("floorId") floorId: string): Promise<MapFloorVersionResponseDto[]> {
    return this.mapStudioService.listVersions(floorId);
  }

  @Post("floors/:floorId/versions")
  @Roles("operations", "admin")
  createVersion(
    @Param("floorId") floorId: string,
    @Body() body: CreateMapFloorVersionDto,
    @Req() req: Request,
  ): Promise<MapFloorVersionResponseDto> {
    const staffId = (req as any).user?.sub ?? "system";
    return this.mapStudioService.createVersion(floorId, body, staffId);
  }

  @Get("floors/:floorId/versions/:versionId")
  @Roles("front_desk", "operations", "admin")
  getVersion(
    @Param("floorId") floorId: string,
    @Param("versionId") versionId: string,
  ): Promise<MapFloorVersionResponseDto> {
    return this.mapStudioService.getVersion(floorId, versionId);
  }

  @Put("floors/:floorId/versions/:versionId/publish")
  @Roles("operations", "admin")
  publishVersion(
    @Param("floorId") floorId: string,
    @Param("versionId") versionId: string,
    @Req() req: Request,
  ): Promise<MapFloorVersionResponseDto> {
    const staffId = (req as any).user?.sub ?? "system";
    return this.mapStudioService.publishVersion(floorId, versionId, staffId);
  }

  // ── Objects ───────────────────────────────────────────────────────────────

  @Get("floors/:floorId/objects")
  @Roles("front_desk", "operations", "admin")
  listObjects(@Param("floorId") floorId: string): Promise<MapObjectResponseDto[]> {
    return this.mapStudioService.listObjects(floorId);
  }

  @Put("floors/:floorId/objects")
  @Roles("operations", "admin")
  upsertObject(
    @Param("floorId") floorId: string,
    @Body() body: CreateMapObjectDto,
  ): Promise<MapObjectResponseDto> {
    return this.mapStudioService.upsertObject(floorId, body);
  }

  @Delete("floors/:floorId/objects/:objectId")
  @Roles("operations", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteObject(
    @Param("floorId") floorId: string,
    @Param("objectId") objectId: string,
  ): Promise<void> {
    return this.mapStudioService.deleteObject(floorId, objectId);
  }

  // ── Live State ───────────────────────────────────────────────────────────

  @Get("floors/:floorId/live")
  @Roles("front_desk", "operations", "admin")
  getLiveState(@Param("floorId") floorId: string): Promise<MapStudioLiveResponseDto> {
    return this.mapStudioService.getLiveState(floorId);
  }
}
