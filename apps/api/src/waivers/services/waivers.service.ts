import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AcceptWaiverDto } from "../dto/accept-waiver.dto";
import { LatestWaiverResponseDto } from "../dto/latest-waiver.response.dto";
import { WaiverAcceptanceResponseDto } from "../dto/waiver-acceptance.response.dto";
import { WaiverMetadataResponseDto } from "../dto/waiver-metadata.response.dto";

const CURRENT_WAIVER_VERSION = "AO-WAIVER-v1";

@Injectable()
export class WaiversService {
  constructor(private readonly prisma: PrismaService) {}

  getCurrentWaiverMetadata(): WaiverMetadataResponseDto {
    return {
      waiverVersion: CURRENT_WAIVER_VERSION,
      effectiveAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      title: "AO Participation Waiver",
      summary: "Acknowledges risk, rules, and release of liability for AO activities."
    };
  }

  async acceptWaiver(guestId: string, dto: AcceptWaiverDto): Promise<WaiverAcceptanceResponseDto> {
    if (!dto.waiverVersion?.trim()) {
      throw new BadRequestException("waiverVersion is required");
    }

    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

    const accepted = await this.prisma.$transaction(async (tx) => {
      await tx.guestWaiver.updateMany({
        where: { guestId, isCurrent: true },
        data: { isCurrent: false }
      });

      return tx.guestWaiver.create({
        data: {
          guestId,
          waiverVersion: dto.waiverVersion.trim(),
          acceptedChannel: dto.acceptedChannel,
          signatureText: dto.signatureText?.trim() || null,
          isCurrent: true
        }
      });
    });

    return {
      guestId: accepted.guestId,
      waiverVersion: accepted.waiverVersion,
      acceptedAt: accepted.acceptedAt.toISOString(),
      acceptedChannel: accepted.acceptedChannel
    };
  }

  async listWaivers(guestId: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

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
    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

    const latest = await this.prisma.guestWaiver.findFirst({
      where: { guestId },
      orderBy: { acceptedAt: "desc" }
    });

    const latestResponse = latest
      ? {
          guestId: latest.guestId,
          waiverVersion: latest.waiverVersion,
          acceptedAt: latest.acceptedAt.toISOString(),
          acceptedChannel: latest.acceptedChannel
        }
      : null;

    return {
      isValid: Boolean(latest && latest.waiverVersion === CURRENT_WAIVER_VERSION && latest.isCurrent),
      latest: latestResponse,
      currentWaiverVersion: CURRENT_WAIVER_VERSION
    };
  }
}
