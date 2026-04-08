import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function resolveAllowedOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter((origin): origin is string => origin !== null)
    : [];

  const derivedOrigins = [
    process.env.APP_BASE_URL,
    process.env.STAFF_APP_BASE_URL,
    process.env.WEB_BASE_URL
  ]
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => origin !== null);

  const fallbackOrigins = [
    "https://app.aosanctuary.com",
    "https://aosanctuary.com",
    "https://staging.aosanctuary.com",
    "https://ao-os.aosanctuary.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
  ];

  return Array.from(new Set([...configuredOrigins, ...derivedOrigins, ...fallbackOrigins]));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const allowedOrigins = resolveAllowedOrigins();
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