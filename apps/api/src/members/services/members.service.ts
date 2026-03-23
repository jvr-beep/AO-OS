import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMemberDto } from "../dto/create-member.dto";
import { MemberResponseDto } from "../dto/member.response.dto";

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

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