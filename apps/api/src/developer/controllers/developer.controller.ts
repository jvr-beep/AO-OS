import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtPayload } from "../../auth/strategies/jwt.strategy";
import { CreatePatDto } from "../dto/create-pat.dto";
import { CreatedPatResponseDto, PatResponseDto } from "../dto/pat.response.dto";
import { DeveloperService } from "../services/developer.service";

@Controller("developer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Get("pats")
  listPats(@Req() req: { user: JwtPayload }): Promise<PatResponseDto[]> {
    return this.developerService.listPats(req.user);
  }

  @Post("pats")
  createPat(
    @Body() body: CreatePatDto,
    @Req() req: { user: JwtPayload }
  ): Promise<CreatedPatResponseDto> {
    return this.developerService.createPat(body, req.user);
  }

  @Delete("pats/:id")
  revokePat(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload }
  ): Promise<PatResponseDto> {
    return this.developerService.revokePat(id, req.user);
  }
}
