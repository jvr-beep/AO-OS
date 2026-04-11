import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { logErrorToDatadog } from "./datadog";

@Catch()
export class DatadogExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatadogExceptionFilter.name);

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
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };

    response.status(status).json(body);
  }
}
