import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AccessAttemptResponseDto } from "../dto/access-attempt.response.dto";
import { CreateAccessAttemptDto } from "../dto/create-access-attempt.dto";
import { AccessAttemptsService } from "../services/access-attempts.service";

@Controller()
export class AccessAttemptsController {
  constructor(private readonly accessAttemptsService: AccessAttemptsService) {}

  @Post("access-attempts")
  createAttempt(@Body() body: CreateAccessAttemptDto): Promise<AccessAttemptResponseDto> {
    return this.accessAttemptsService.createAttempt(body);
  }

  @Get("access-attempts")
  listAttempts(): Promise<AccessAttemptResponseDto[]> {
    return this.accessAttemptsService.listAttempts();
  }

  @Get("members/:id/access-attempts")
  listMemberAttempts(@Param("id") id: string): Promise<AccessAttemptResponseDto[]> {
    return this.accessAttemptsService.listMemberAttempts(id);
  }
}
