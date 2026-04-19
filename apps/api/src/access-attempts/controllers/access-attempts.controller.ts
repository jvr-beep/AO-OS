import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { AccessAttemptResponseDto } from "../dto/access-attempt.response.dto";
import { CreateAccessAttemptDto } from "../dto/create-access-attempt.dto";
import { AccessAttemptsService } from "../services/access-attempts.service";

@Controller()
export class AccessAttemptsController {
  constructor(private readonly accessAttemptsService: AccessAttemptsService) {}

  @Post("access-attempts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  createAttempt(@Body() body: CreateAccessAttemptDto): Promise<AccessAttemptResponseDto> {
    return this.accessAttemptsService.createAttempt(body);
  }

  @Get("access-attempts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  listAttempts(): Promise<AccessAttemptResponseDto[]> {
    return this.accessAttemptsService.listAttempts();
  }

  @Get("members/:id/access-attempts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("front_desk", "operations", "admin")
  listMemberAttempts(@Param("id") id: string): Promise<AccessAttemptResponseDto[]> {
    return this.accessAttemptsService.listMemberAttempts(id);
  }
}
