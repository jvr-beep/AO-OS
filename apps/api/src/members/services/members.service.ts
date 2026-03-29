import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMemberDto } from "../dto/create-member.dto";
import { MemberResponseDto } from "../dto/member.response.dto";

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
            { firstName: { contains: normalizedQuery, mode: "insensitive" as const } },
            { lastName: { contains: normalizedQuery, mode: "insensitive" as const } },
            { displayName: { contains: normalizedQuery, mode: "insensitive" as const } }
          ]
        }
      : {};

    const members = await this.prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return members.map((member) => ({
      id: member.id,
      publicMemberNumber: member.publicMemberNumber,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      phone: member.phone,
      status: member.status,
      createdAt: member.createdAt.toISOString()
    }));
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
        status: "active"
      }
    });

    return {
      id: created.id,
      publicMemberNumber: created.publicMemberNumber,
      email: created.email,
      firstName: created.firstName,
      lastName: created.lastName,
      displayName: created.displayName,
      phone: created.phone,
      status: created.status,
      createdAt: created.createdAt.toISOString()
    };
  }

  async getMemberById(id: string): Promise<MemberResponseDto> {
    const member = await this.prisma.member.findUnique({
      where: { id }
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    return {
      id: member.id,
      publicMemberNumber: member.publicMemberNumber,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      phone: member.phone,
      status: member.status,
      createdAt: member.createdAt.toISOString()
    };
  }
}