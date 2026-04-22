import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { WaiverDocumentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AcceptWaiverDto } from "../dto/accept-waiver.dto";
import { LatestWaiverResponseDto } from "../dto/latest-waiver.response.dto";
import { WaiverAcceptanceResponseDto } from "../dto/waiver-acceptance.response.dto";
import { WaiverMetadataResponseDto } from "../dto/waiver-metadata.response.dto";

@Injectable()
export class WaiversService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Published document helpers ─────────────────────────────────────────────

  private async getPublishedDocument() {
    return this.prisma.waiverDocument.findFirst({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
    });
  }

  async getCurrentWaiverMetadata(): Promise<WaiverMetadataResponseDto> {
    const doc = await this.getPublishedDocument();
    return {
      waiverVersion: doc?.version ?? "AO-WAIVER-v1",
      effectiveAt: doc?.effectiveAt?.toISOString() ?? new Date("2026-01-01").toISOString(),
      title: doc?.title ?? "AO Participation Waiver",
      summary: "Acknowledges risk, rules, and release of liability for AO activities.",
    };
  }

  async getCurrentWaiverBody(): Promise<{ version: string; title: string; body: string }> {
    const doc = await this.getPublishedDocument();
    if (!doc) throw new NotFoundException("No published waiver found");
    return { version: doc.version, title: doc.title, body: doc.body };
  }

  // ── Guest acceptance ───────────────────────────────────────────────────────

  async acceptWaiver(guestId: string, dto: AcceptWaiverDto): Promise<WaiverAcceptanceResponseDto> {
    if (!dto.waiverVersion?.trim()) {
      throw new BadRequestException("waiverVersion is required");
    }

    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException("Guest not found");

    const accepted = await this.prisma.$transaction(async (tx) => {
      await tx.guestWaiver.updateMany({
        where: { guestId, isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.guestWaiver.create({
        data: {
          guestId,
          waiverVersion: dto.waiverVersion.trim(),
          acceptedChannel: dto.acceptedChannel,
          signatureText: dto.signatureText?.trim() || null,
          isCurrent: true,
        },
      });
    });

    return {
      guestId: accepted.guestId,
      waiverVersion: accepted.waiverVersion,
      acceptedAt: accepted.acceptedAt.toISOString(),
      acceptedChannel: accepted.acceptedChannel,
    };
  }

  async listWaivers(guestId: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException("Guest not found");

    const waivers = await this.prisma.guestWaiver.findMany({
      where: { guestId },
      orderBy: { acceptedAt: "desc" },
    });

    return waivers.map((w) => ({
      id: w.id,
      waiverVersion: w.waiverVersion,
      acceptedAt: w.acceptedAt.toISOString(),
      acceptedChannel: w.acceptedChannel,
      isCurrent: w.isCurrent,
    }));
  }

  async getLatestWaiverStatus(guestId: string): Promise<LatestWaiverResponseDto> {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException("Guest not found");

    const [latest, published] = await Promise.all([
      this.prisma.guestWaiver.findFirst({ where: { guestId }, orderBy: { acceptedAt: "desc" } }),
      this.getPublishedDocument(),
    ]);

    const currentVersion = published?.version ?? "AO-WAIVER-v1";

    return {
      isValid: Boolean(latest && latest.waiverVersion === currentVersion && latest.isCurrent),
      latest: latest
        ? {
            guestId: latest.guestId,
            waiverVersion: latest.waiverVersion,
            acceptedAt: latest.acceptedAt.toISOString(),
            acceptedChannel: latest.acceptedChannel,
          }
        : null,
      currentWaiverVersion: currentVersion,
    };
  }

  // ── Admin document management ──────────────────────────────────────────────

  async adminListDocuments() {
    const docs = await this.prisma.waiverDocument.findMany({
      orderBy: { createdAt: "desc" },
    });
    return docs.map(this.mapDoc);
  }

  async adminGetDocument(id: string) {
    const doc = await this.prisma.waiverDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Waiver document not found");
    return this.mapDoc(doc);
  }

  async adminCreateDocument(dto: { version: string; title: string; body: string }, createdBy?: string) {
    const existing = await this.prisma.waiverDocument.findUnique({ where: { version: dto.version } });
    if (existing) throw new ConflictException("A waiver document with this version already exists");

    const doc = await this.prisma.waiverDocument.create({
      data: {
        version: dto.version.trim(),
        title: dto.title.trim(),
        body: dto.body.trim(),
        status: "draft",
        createdBy: createdBy ?? null,
      },
    });
    return this.mapDoc(doc);
  }

  async adminUpdateDocument(id: string, dto: { title?: string; body?: string }) {
    const doc = await this.prisma.waiverDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Waiver document not found");
    if (doc.status === "published") {
      throw new BadRequestException("Cannot edit a published waiver. Create a new draft instead.");
    }

    const updated = await this.prisma.waiverDocument.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
      },
    });
    return this.mapDoc(updated);
  }

  async adminPublishDocument(id: string, publishedBy?: string) {
    const doc = await this.prisma.waiverDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Waiver document not found");
    if (doc.status === "published") throw new BadRequestException("Already published");

    // Archive currently published docs, then publish this one
    await this.prisma.$transaction(async (tx) => {
      await tx.waiverDocument.updateMany({
        where: { status: "published" },
        data: { status: "archived" },
      });
      await tx.waiverDocument.update({
        where: { id },
        data: {
          status: "published",
          publishedAt: new Date(),
          effectiveAt: new Date(),
          createdBy: publishedBy ?? doc.createdBy,
        },
      });
    });

    return this.adminGetDocument(id);
  }

  // ── Compliance report ──────────────────────────────────────────────────────

  async adminComplianceReport(limit = 100, offset = 0) {
    const published = await this.getPublishedDocument();
    const currentVersion = published?.version ?? "AO-WAIVER-v1";

    // Guests who have visited but whose latest waiver is missing or outdated
    const guests = await this.prisma.$queryRaw<
      Array<{ id: string; email: string | null; phone: string | null; latest_version: string | null; accepted_at: string | null }>
    >`
      SELECT
        g.id,
        g.email,
        g.phone,
        lw.waiver_version AS latest_version,
        lw.accepted_at
      FROM guests g
      LEFT JOIN LATERAL (
        SELECT waiver_version, accepted_at
        FROM guest_waivers
        WHERE guest_id = g.id AND is_current = true
        ORDER BY accepted_at DESC
        LIMIT 1
      ) lw ON true
      WHERE lw.waiver_version IS NULL OR lw.waiver_version != ${currentVersion}
      ORDER BY g.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      currentVersion,
      totalOutstanding: guests.length,
      guests: guests.map((g) => ({
        id: g.id,
        identifier: g.email ?? g.phone ?? `Guest …${g.id.slice(-8)}`,
        latestVersion: g.latest_version ?? null,
        acceptedAt: g.accepted_at ?? null,
        needsResign: true,
      })),
    };
  }

  private mapDoc(doc: any) {
    return {
      id: doc.id,
      version: doc.version,
      title: doc.title,
      body: doc.body,
      status: doc.status,
      publishedAt: doc.publishedAt?.toISOString() ?? null,
      effectiveAt: doc.effectiveAt?.toISOString() ?? null,
      createdBy: doc.createdBy ?? null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
