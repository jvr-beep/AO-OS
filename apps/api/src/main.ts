// Datadog APM — must be the first import
import "./tracing";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  // bodyParser: false so we can register our own parsers with a 10mb limit
  // (NestJS default is 100kb which rejects large SVG floor plan uploads)
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Capture raw body for Stripe webhook signature verification, raise limit to 10mb
  app.use(
    json({
      limit: "10mb",
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(urlencoded({ limit: "10mb", extended: true }));

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