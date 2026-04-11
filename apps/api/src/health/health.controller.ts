import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async checkHealth(@Res() res: Response): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).json({ status: "ok" });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: "degraded",
        reason: "database_unreachable",
      });
    }
  }
}