import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMemberDto } from "../dto/create-member.dto";
import { MemberLegalIdentityDto, MemberResponseDto } from "../dto/member.response.dto";
import { resolveDisplayName } from "../utils/member-display";

const MEMBER_SELECT = {
  id: true,
  publicMemberNumber: true,
  email: true,
  alias: true,
  displayName: true,
  phone: true,
  status: true,
  createdAt: true,
  profile: { select: { preferredName: true } },
} as const;

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(query?: string): Promise<MemberResponseDto[]> {
    const normalizedQuery = query?.trim();
    const where = normalizedQuery
      ? {
          OR: [
            { id: { contains: normalizedQuery, mode: "insensitive" as const } },
            { publicMemberNumber: { contains: normalizedQuery, mode: "insensitive" as const } },
            { email: { contains: normalizedQuery, mode: "insensitive" as const } },
            { alias: { contains: normalizedQuery, mode: "insensitive" as const } },
            { displayName: { contains: normalizedQuery, mode: "insensitive" as const } },
          ],
        }
      : {};

    const members = await this.prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: MEMBER_SELECT,
    });

    return members.map(toMemberDto);
  }

  async createMember(input: CreateMemberDto): Promise<MemberResponseDto> {
    const created = await this.prisma.member.create({
      data: {
        publicMemberNumber: `AO-${Date.now()}`,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        displayName: input.displayName,
        phone: input.phone,
        status: "active",
      },
      select: MEMBER_SELECT,
    });

    return toMemberDto(created);
  }

  async getMemberById(id: string): Promise<MemberResponseDto> {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: MEMBER_SELECT,
    });
    if (!member) throw new NotFoundException("Member not found");
    return toMemberDto(member);
  }

  async getMemberLegalIdentity(id: string): Promise<MemberLegalIdentityDto> {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        publicMemberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
    if (!member) throw new NotFoundException("Member not found");
    return {
      id: member.id,
      publicMemberNumber: member.publicMemberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
    };
  }
}

function toMemberDto(member: {
  id: string;
  publicMemberNumber: string;
  email?: string | null;
  alias?: string | null;
  displayName?: string | null;
  phone?: string | null;
  status: string;
  createdAt: Date;
  profile?: { preferredName?: string | null } | null;
}): MemberResponseDto {
  return {
    id: member.id,
    publicMemberNumber: member.publicMemberNumber,
    email: member.email,
    staffSafeDisplayName: resolveDisplayName(member),
    alias: member.alias,
    phone: member.phone,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
  };
}
