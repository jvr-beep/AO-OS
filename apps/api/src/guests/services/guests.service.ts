import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateGuestDto } from "../dto/create-guest.dto";
import { GuestLookupResponseDto } from "../dto/guest-lookup.response.dto";
import { GuestResponseDto } from "../dto/guest.response.dto";
import { LookupGuestDto } from "../dto/lookup-guest.dto";
import { UpdateGuestDto } from "../dto/update-guest.dto";

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGuestDto): Promise<GuestResponseDto> {
    if (!dto.firstName?.trim()) {
      throw new BadRequestException("firstName is required");
    }

    try {
      const created = await this.prisma.guest.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          preferredLanguage: dto.preferredLanguage?.trim() || "en",
          marketingOptIn: dto.marketingOptIn ?? false
        }
      });

      return this.toGuestResponse(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Guest already exists with this phone or email");
      }
      throw error;
    }
  }

  async findOne(guestId: string): Promise<GuestResponseDto> {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

    return this.toGuestResponse(guest);
  }

  async update(guestId: string, dto: UpdateGuestDto): Promise<GuestResponseDto> {
    await this.findOne(guestId);

    try {
      const updated = await this.prisma.guest.update({
        where: { id: guestId },
        data: {
          ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName !== undefined ? { lastName: dto.lastName?.trim() || null } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
          ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
          ...(dto.dateOfBirth !== undefined ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null } : {}),
          ...(dto.preferredLanguage !== undefined ? { preferredLanguage: dto.preferredLanguage?.trim() || "en" } : {}),
          ...(dto.marketingOptIn !== undefined ? { marketingOptIn: dto.marketingOptIn } : {}),
          version: { increment: 1 }
        }
      });

      return this.toGuestResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Guest already exists with this phone or email");
      }
      throw error;
    }
  }

  async lookup(dto: LookupGuestDto): Promise<GuestLookupResponseDto> {
    const hasLookupField = Boolean(dto.phone || dto.email || dto.firstName || dto.lastName);
    if (!hasLookupField) {
      throw new BadRequestException("Provide phone, email, firstName, or lastName");
    }

    if (dto.phone) {
      const exact = await this.prisma.guest.findFirst({ where: { phone: dto.phone.trim() } });
      if (exact) {
        return {
          matchType: "exact",
          guest: this.toGuestResponse(exact),
          duplicateCandidates: []
        };
      }
    }

    if (dto.email) {
      const exact = await this.prisma.guest.findFirst({ where: { email: dto.email.trim().toLowerCase() } });
      if (exact) {
        return {
          matchType: "exact",
          guest: this.toGuestResponse(exact),
          duplicateCandidates: []
        };
      }
    }

    const candidates = await this.prisma.guest.findMany({
      where: {
        OR: [
          ...(dto.firstName ? [{ firstName: { contains: dto.firstName.trim(), mode: "insensitive" as const } }] : []),
          ...(dto.lastName ? [{ lastName: { contains: dto.lastName.trim(), mode: "insensitive" as const } }] : [])
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    if (candidates.length === 1) {
      return {
        matchType: "fuzzy",
        guest: this.toGuestResponse(candidates[0]),
        duplicateCandidates: []
      };
    }

    if (candidates.length > 1) {
      return {
        matchType: "multiple",
        guest: null,
        duplicateCandidates: candidates.map((candidate) => this.toGuestResponse(candidate))
      };
    }

    return {
      matchType: "none",
      guest: null,
      duplicateCandidates: []
    };
  }

  private toGuestResponse(guest: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    dateOfBirth: Date | null;
    preferredLanguage: string;
    membershipStatus: string;
    riskFlagStatus: string;
    marketingOptIn: boolean;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }): GuestResponseDto {
    return {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      email: guest.email,
      dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.toISOString().slice(0, 10) : null,
      preferredLanguage: guest.preferredLanguage,
      membershipStatus: guest.membershipStatus,
      riskFlagStatus: guest.riskFlagStatus,
      marketingOptIn: guest.marketingOptIn,
      createdAt: guest.createdAt.toISOString(),
      updatedAt: guest.updatedAt.toISOString(),
      version: guest.version
    };
  }
}
