import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { ResolvedLocation } from "./location-context.service";

const LOCATION_HEADER = "x-ao-location";
const DEFAULT_LOCATION_CODE = process.env.DEFAULT_LOCATION_CODE ?? "AO_TORONTO";

/**
 * Resolves the current Location from the X-AO-Location request header,
 * falling back to DEFAULT_LOCATION_CODE when the header is absent.
 * The resolved location is attached to req.location for the request lifecycle.
 *
 * Header value is a location code (e.g. "AO_TORONTO").
 */
@Injectable()
export class LocationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LocationMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request & { location?: ResolvedLocation }, _res: Response, next: NextFunction): Promise<void> {
    const code =
      (req.headers[LOCATION_HEADER] as string | undefined)?.trim().toUpperCase() ??
      DEFAULT_LOCATION_CODE.toUpperCase();

    const location = await this.prisma.location.findUnique({
      where: { code },
      select: { id: true, code: true, name: true },
    });

    if (location) {
      req.location = location;
    } else {
      this.logger.warn(`Location not found for code "${code}" — requests to location-scoped endpoints will fail`);
    }

    next();
  }
}
