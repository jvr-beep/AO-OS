import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../../src/app.module";

export type IntegrationApp = {
  app: INestApplication;
  prisma: PrismaClient;
  http: ReturnType<typeof request>;
  runId: string;
};

export async function createIntegrationApp(): Promise<IntegrationApp> {
  process.env.NODE_ENV = "test";
  process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "integration-test-secret";

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("v1");
  await app.init();

  const prisma = new PrismaClient();
  const runId = `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    app,
    prisma,
    http: request(app.getHttpServer()),
    runId
  };
}

export async function closeIntegrationApp(ctx: IntegrationApp): Promise<void> {
  await ctx.prisma.$disconnect();
  await ctx.app.close();
}
