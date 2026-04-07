import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Build the allowed-origin list from explicit env var overrides plus any
  // app URL vars that are already required by other features (email links,
  // staff portal, etc.).  This means staging and local dev get the right
  // CORS headers automatically without having to set a separate CORS_ORIGIN.
  const originSet = new Set<string>([
    // Explicit override list — highest priority, supports comma-separated values
    ...(process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
      : []),
    // Standard app URL env vars
    ...[
      process.env.APP_BASE_URL,
      process.env.STAFF_APP_BASE_URL,
      process.env.WEB_BASE_URL,
    ].filter((u): u is string => Boolean(u)),
    // Production fallbacks (safe to include — will only match production requests)
    "https://app.aosanctuary.com",
    "https://ao-os.aosanctuary.com",
    // Staging fallbacks
    "https://staging.aosanctuary.com",
    "https://staff-staging.aosanctuary.com",
    // Local development
    "http://localhost:3000",
    "http://localhost:3001",
  ]);
  app.enableCors({ origin: [...originSet], credentials: true });

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