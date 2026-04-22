import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AcceptWaiverDto } from "../dto/accept-waiver.dto";
import { LatestWaiverResponseDto } from "../dto/latest-waiver.response.dto";
import { WaiverAcceptanceResponseDto } from "../dto/waiver-acceptance.response.dto";
import { WaiversService } from "../services/waivers.service";

@Controller()
export class WaiversController {
  constructor(private readonly waiversService: WaiversService) {}

  // ── Public: current waiver metadata + body ─────────────────────────────────

  @Get("waivers/current")
  getCurrentWaiver() {
    return this.waiversService.getCurrentWaiverMetadata();
  }

  @Get("waivers/current/body")
  getCurrentWaiverBody() {
    return this.waiversService.getCurrentWaiverBody();
  }

  // ── Guest acceptance ───────────────────────────────────────────────────────

  @Post("guests/:guestId/waivers")
  acceptWaiver(
    @Param("guestId") guestId: string,
    @Body() body: AcceptWaiverDto,
  ): Promise<WaiverAcceptanceResponseDto> {
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

  // ── Admin: waiver document management ─────────────────────────────────────

  @Get("waivers/admin/documents")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminListDocuments() {
    return this.waiversService.adminListDocuments();
  }

  @Get("waivers/admin/documents/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminGetDocument(@Param("id") id: string) {
    return this.waiversService.adminGetDocument(id);
  }

  @Post("waivers/admin/documents")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminCreateDocument(
    @Body() body: { version: string; title: string; body: string },
    @Req() req: any,
  ) {
    return this.waiversService.adminCreateDocument(body, req.user?.email);
  }

  @Patch("waivers/admin/documents/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminUpdateDocument(
    @Param("id") id: string,
    @Body() body: { title?: string; body?: string },
  ) {
    return this.waiversService.adminUpdateDocument(id, body);
  }

  @Post("waivers/admin/documents/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminPublishDocument(@Param("id") id: string, @Req() req: any) {
    return this.waiversService.adminPublishDocument(id, req.user?.email);
  }

  // ── Admin: compliance report ───────────────────────────────────────────────

  @Get("waivers/admin/compliance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("operations", "admin")
  adminComplianceReport(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.waiversService.adminComplianceReport(
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }
}
