import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSystemExceptionDto } from "../dto/create-system-exception.dto";
import { ListSystemExceptionsQueryDto } from "../dto/list-system-exceptions.query.dto";
import { ResolveSystemExceptionDto } from "../dto/resolve-system-exception.dto";

@Injectable()
export class OpsService {
  private readonly logger = new Logger(OpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createException(dto: CreateSystemExceptionDto) {
    const created = await this.prisma.systemException.create({
      data: {
        exceptionType: dto.exception_type,
        severity: dto.severity,
        visitId: dto.visit_id ?? null,
        bookingId: dto.booking_id ?? null,
        folioId: dto.folio_id ?? null,
        resourceId: dto.resource_id ?? null,
        wristbandId: dto.wristband_id ?? null,
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        status: "open"
      }
    });

    return this.toResponse(created);
  }

  async listExceptions(query: ListSystemExceptionsQueryDto) {
    const rows = await this.prisma.systemException.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return rows.map((row) => this.toResponse(row));
  }

  async resolveException(exceptionId: string, dto: ResolveSystemExceptionDto) {
    const current = await this.prisma.systemException.findUnique({ where: { id: exceptionId } });
    if (!current) {
      throw new NotFoundException("System exception not found");
    }

    const updated = await this.prisma.systemException.update({
      where: { id: exceptionId },
      data: {
        status: dto.status,
        resolvedAt: dto.status === "resolved" ? new Date() : null
      }
    });

    return this.toResponse(updated);
  }

  async getOpsSnapshot() {
    const [openExceptions, activeVisits, heldResources, occupiedResources, infraHealth] =
      await Promise.all([
        this.prisma.systemException.count({ where: { status: "open" } }),
        this.prisma.visit.count({ where: { status: { in: ["checked_in", "active", "extended"] } } }),
        this.prisma.resource.count({ where: { status: "held" } }),
        this.prisma.resource.count({ where: { status: "occupied" } }),
        this.getInfraHealth()
      ]);

    return {
      open_exceptions: openExceptions,
      active_visits: activeVisits,
      held_resources: heldResources,
      occupied_resources: occupiedResources,
      infra: infraHealth,
      generated_at: new Date().toISOString()
    };
  }

  private async getInfraHealth() {
    const [tunnel, vercel, gcp] = await Promise.all([
      this.checkCloudflareTunnel(),
      this.checkVercelDeployment(),
      this.checkGcpVm()
    ]);
    return { tunnel, vercel, gcp };
  }

  private async checkCloudflareTunnel(): Promise<{ status: string; latency_ms: number | null }> {
    const url = process.env.CLOUDFLARE_TUNNEL_URL;
    if (!url) {
      return { status: "unconfigured", latency_ms: null };
    }
    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const latency_ms = Date.now() - start;
      return { status: res.ok ? "up" : `http_${res.status}`, latency_ms };
    } catch (err) {
      this.logger.warn(`Cloudflare tunnel health check failed: ${(err as Error).message}`);
      return { status: "down", latency_ms: null };
    }
  }

  private async checkVercelDeployment(): Promise<{
    status: string;
    deployment_state: string | null;
    url: string | null;
  }> {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (!token || !projectId) {
      return { status: "unconfigured", deployment_state: null, url: null };
    }
    const orgId = process.env.VERCEL_ORG_ID ?? "";
    const qs = new URLSearchParams({ projectId, limit: "1", ...(orgId ? { teamId: orgId } : {}) });
    try {
      const res = await fetch(`https://api.vercel.com/v6/deployments?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) {
        return { status: `api_error_${res.status}`, deployment_state: null, url: null };
      }
      const body = (await res.json()) as { deployments: Array<{ state: string; url: string }> };
      const dep = body.deployments?.[0];
      if (!dep) {
        return { status: "no_deployments", deployment_state: null, url: null };
      }
      return {
        status: dep.state === "READY" ? "ok" : "degraded",
        deployment_state: dep.state,
        url: dep.url ? `https://${dep.url}` : null
      };
    } catch (err) {
      this.logger.warn(`Vercel deployment check failed: ${(err as Error).message}`);
      return { status: "error", deployment_state: null, url: null };
    }
  }

  private async checkGcpVm(): Promise<{ status: string; vm_state: string | null }> {
    const project = process.env.GCP_PROJECT;
    const zone = process.env.GCP_ZONE;
    const instance = process.env.GCP_INSTANCE;
    if (!project || !zone || !instance) {
      return { status: "unconfigured", vm_state: null };
    }
    // Requires an Authorization header with a valid OAuth2 access token
    // (Application Default Credentials or a service account key).
    // Without credentials the API returns 401 — handled gracefully below.
    const url =
      `https://compute.googleapis.com/compute/v1/projects/${project}/zones/${zone}/instances/${instance}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.status === 401 || res.status === 403) {
        return { status: "auth_required", vm_state: null };
      }
      if (!res.ok) {
        return { status: `api_error_${res.status}`, vm_state: null };
      }
      const body = (await res.json()) as { status: string };
      const vmState = body.status ?? "UNKNOWN";
      return { status: vmState === "RUNNING" ? "ok" : "degraded", vm_state: vmState };
    } catch (err) {
      this.logger.warn(`GCP VM check failed: ${(err as Error).message}`);
      return { status: "error", vm_state: null };
    }
  }

  private toResponse(row: {
    id: string;
    exceptionType: string;
    severity: string;
    status: string;
    visitId: string | null;
    bookingId: string | null;
    folioId: string | null;
    resourceId: string | null;
    wristbandId: string | null;
    payload: unknown;
    createdAt: Date;
    resolvedAt: Date | null;
  }) {
    return {
      id: row.id,
      exception_type: row.exceptionType,
      severity: row.severity,
      status: row.status,
      visit_id: row.visitId,
      booking_id: row.bookingId,
      folio_id: row.folioId,
      resource_id: row.resourceId,
      wristband_id: row.wristbandId,
      payload: row.payload,
      created_at: row.createdAt.toISOString(),
      resolved_at: row.resolvedAt ? row.resolvedAt.toISOString() : null
    };
  }
}
