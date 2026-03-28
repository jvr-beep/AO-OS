import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>("PORT");
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});