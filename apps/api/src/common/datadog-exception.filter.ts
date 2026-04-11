import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { logErrorToDatadog } from "./datadog";

@Catch()
export class DatadogExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatadogExceptionFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const context = `${request.method} ${request.url}`;

    // Only send non-HTTP (unhandled) errors to Datadog; 4xx client errors are noise
    if (!(exception instanceof HttpException)) {
      const detail = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`Unhandled exception on ${context}`, detail);
      void logErrorToDatadog(exception, context);
      void this.recordSystemException(exception, context);
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };

    response.status(status).json(body);
  }

  private async recordSystemException(exception: unknown, context: string): Promise<void> {
    try {
      const message = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      await this.prisma.systemException.create({
        data: {
          exceptionType: "UNHANDLED_API_ERROR",
          severity: "critical",
          status: "open",
          payload: { message, context, ...(stack ? { stack } : {}) },
        },
      });
    } catch (recordError) {
      // Swallow — exception recording must never mask the original error
      this.logger.error("Failed to record system exception in DB", recordError);
    }
  }
}
