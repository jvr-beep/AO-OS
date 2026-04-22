import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AcceptWaiverDto } from "../dto/accept-waiver.dto";
import { LatestWaiverResponseDto } from "../dto/latest-waiver.response.dto";
import { WaiverAcceptanceResponseDto } from "../dto/waiver-acceptance.response.dto";
import { WaiverMetadataResponseDto } from "../dto/waiver-metadata.response.dto";
import { WaiversService } from "../services/waivers.service";

@Controller()
export class WaiversController {
  constructor(private readonly waiversService: WaiversService) {}

  @Get("waivers/current")
  getCurrentWaiver(): WaiverMetadataResponseDto {
    return this.waiversService.getCurrentWaiverMetadata();
  }

  @Post("guests/:guestId/waivers")
  acceptWaiver(@Param("guestId") guestId: string, @Body() body: AcceptWaiverDto): Promise<WaiverAcceptanceResponseDto> {
    return this.waiversService.acceptWaiver(guestId, body);
  }

  @Get("guests/:guestId/waivers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  listWaivers(@Param("guestId") guestId: string) {
    return this.waiversService.listWaivers(guestId);
  }

  @Get("guests/:guestId/waivers/latest")
  getLatestWaiver(@Param("guestId") guestId: string): Promise<LatestWaiverResponseDto> {
    return this.waiversService.getLatestWaiverStatus(guestId);
  }
}
