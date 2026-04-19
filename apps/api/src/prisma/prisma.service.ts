import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateClient = new PrismaClient().$extends(withAccelerate());

type AccelerateClient = typeof accelerateClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private accelerate: AccelerateClient;

  constructor() {
    super();
    this.accelerate = new PrismaClient().$extends(withAccelerate()) as AccelerateClient;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // Use for queries that benefit from Accelerate connection pooling + caching.
  // Pass cacheStrategy to individual queries: { cacheStrategy: { ttl: 60 } }
  get $accelerate(): AccelerateClient {
    return this.accelerate;
  }
}