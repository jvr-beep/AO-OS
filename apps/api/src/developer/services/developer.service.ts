import * as crypto from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtPayload } from "../../auth/strategies/jwt.strategy";
import { CreatePatDto } from "../dto/create-pat.dto";
import { CreatedPatResponseDto, PatResponseDto } from "../dto/pat.response.dto";

@Injectable()
export class DeveloperService {
  constructor(private readonly prisma: PrismaService) {}

  async createPat(input: CreatePatDto, actor: JwtPayload): Promise<CreatedPatResponseDto> {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException("PAT_NAME_REQUIRED");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const prefix = rawToken.substring(0, 8);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const pat = await (this.prisma as any).staffPat.create({
      data: {
        staffUserId: actor.sub,
        name: input.name.trim(),
        tokenHash,
        prefix,
        expiresAt
      }
    });

    return { ...this.toResponse(pat), rawToken };
  }

  async listPats(actor: JwtPayload): Promise<PatResponseDto[]> {
    const pats = await (this.prisma as any).staffPat.findMany({
      where: { staffUserId: actor.sub },
      orderBy: { createdAt: "desc" }
    });
    return pats.map((p: any) => this.toResponse(p));
  }

  async revokePat(id: string, actor: JwtPayload): Promise<PatResponseDto> {
    const pat = await (this.prisma as any).staffPat.findUnique({ where: { id } });

    if (!pat || pat.staffUserId !== actor.sub) {
      throw new NotFoundException("PAT_NOT_FOUND");
    }

    if (pat.revokedAt) {
      throw new BadRequestException("PAT_ALREADY_REVOKED");
    }

    const updated = await (this.prisma as any).staffPat.update({
      where: { id },
      data: { revokedAt: new Date() }
    });

    return this.toResponse(updated);
  }

  private toResponse(pat: any): PatResponseDto {
    return {
      id: pat.id,
      name: pat.name,
      prefix: pat.prefix,
      createdAt: pat.createdAt.toISOString(),
      expiresAt: pat.expiresAt ? pat.expiresAt.toISOString() : null,
      lastUsedAt: pat.lastUsedAt ? pat.lastUsedAt.toISOString() : null,
      revokedAt: pat.revokedAt ? pat.revokedAt.toISOString() : null
    };
  }
}
