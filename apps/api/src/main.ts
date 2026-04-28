// Datadog APM — must be the first import
import "./tracing";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

const BODY_SIZE_LIMIT = "10mb";

async function bootstrap(): Promise<void> {
  // rawBody: true exposes req.rawBody for Stripe webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: false });

  // Raise body size limit to support SVG uploads with embedded base64 floor plan images
  app.use(json({ limit: BODY_SIZE_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

  app.use(helmet());

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["https://app.aosanctuary.com"];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({ transform: true })
  );

  app.setGlobalPrefix("v1");
  await app.listen(process.env.PORT ?? 4000);
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});