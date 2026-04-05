import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import express from "express";
import type { Express, Request, Response } from "express";
import { AppModule } from "../src/app.module";

const server: Express = express();
let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn"]
  });

  app.use(helmet());

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["https://app.aosanctuary.com"];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix("v1");

  await app.init();
  initialized = true;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  await init();
  server(req, res);
}
