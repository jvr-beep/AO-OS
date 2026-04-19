import { Injectable, Scope, Inject } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";

export interface ResolvedLocation {
  id: string;
  code: string;
  name: string;
}

/**
 * Request-scoped service that exposes the resolved Location for the current request.
 *
 * LocationMiddleware resolves the location from the X-AO-Location header (or
 * DEFAULT_LOCATION_CODE env fallback) and attaches it to req.location.
 * This service reads it via the REQUEST injection token.
 */
@Injectable({ scope: Scope.REQUEST })
export class LocationContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get location(): ResolvedLocation {
    const loc = (this.request as Request & { location?: ResolvedLocation }).location;
    if (!loc) {
      throw new Error("No location resolved for this request. Check X-AO-Location header or DEFAULT_LOCATION_CODE env var.");
    }
    return loc;
  }

  get locationId(): string {
    return this.location.id;
  }

  get locationOrNull(): ResolvedLocation | null {
    return (this.request as Request & { location?: ResolvedLocation }).location ?? null;
  }
}
