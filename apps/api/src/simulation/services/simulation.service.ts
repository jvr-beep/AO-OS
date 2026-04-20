import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AccessDecision } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AccessControlService } from '../../access-control/access-control.service'
import { FireReaderDto, FireReaderResultDto } from '../dto/fire-reader.dto'
import { SimulationCheckInDto, SimulationCheckOutDto } from '../dto/simulation-check-in.dto'

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async listSandboxLocations() {
    return this.prisma.location.findMany({
      where: { name: { contains: 'Sandbox', mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    })
  }

  async listAccessPoints(locationId: string) {
    const points = await this.prisma.accessPoint.findMany({
      where: { locationId },
      include: { accessZone: true },
      orderBy: { code: 'asc' },
    })
    return points.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      zoneId: p.accessZoneId,
      zoneCode: p.accessZone.code,
      zoneName: p.accessZone.name,
    }))
  }

  async listActiveSessions(locationId: string) {
    const sessions = await this.prisma.visitSession.findMany({
      where: { locationId, status: 'checked_in' },
      include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { checkInAt: 'asc' },
    })
    return sessions.map((s) => ({
      sessionId: s.id,
      memberId: s.member.id,
      memberName: `${s.member.firstName} ${s.member.lastName}`,
      memberEmail: s.member.email,
      checkInAt: s.checkInAt.toISOString(),
    }))
  }

  async fireReader(dto: FireReaderDto): Promise<FireReaderResultDto> {
    const accessPoint = await this.prisma.accessPoint.findUnique({
      where: { id: dto.accessPointId },
      include: { accessZone: true },
    })
    if (!accessPoint) throw new NotFoundException('Access point not found')

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!member) throw new NotFoundException('Member not found')

    const evaluation = await this.accessControl.evaluateZoneAccess({
      memberId: dto.memberId,
      accessZoneId: accessPoint.accessZoneId,
      attemptedAt: new Date().toISOString(),
    })

    const decision = evaluation.allowed ? AccessDecision.allowed : AccessDecision.denied

    const attempt = await this.prisma.accessAttempt.create({
      data: {
        memberId: dto.memberId,
        accessPointId: dto.accessPointId,
        accessZoneId: accessPoint.accessZoneId,
        attemptSource: 'sandbox_sensor_panel',
        decision,
        denialReasonCode: evaluation.allowed ? null : (evaluation.denialReasonCode ?? 'ACCESS_DENIED'),
        occurredAt: new Date(),
      },
    })

    return {
      attemptId: attempt.id,
      accessPointCode: accessPoint.code,
      zoneName: accessPoint.accessZone.name,
      memberName: `${member.firstName} ${member.lastName}`,
      decision: evaluation.allowed ? 'allowed' : 'denied',
      denialReasonCode: attempt.denialReasonCode,
      occurredAt: attempt.occurredAt.toISOString(),
    }
  }

  async simulateCheckIn(dto: SimulationCheckInDto) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!member) throw new NotFoundException('Member not found')

    const existing = await this.prisma.visitSession.findFirst({
      where: { memberId: dto.memberId, locationId: dto.locationId, status: 'checked_in' },
    })
    if (existing) throw new BadRequestException('Member already has an active session at this location')

    const session = await this.prisma.visitSession.create({
      data: {
        memberId: dto.memberId,
        locationId: dto.locationId,
        wristbandAssignmentId: null,
        checkInAt: new Date(),
        status: 'checked_in',
      },
    })

    return {
      sessionId: session.id,
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      locationId: dto.locationId,
      checkInAt: session.checkInAt.toISOString(),
      status: session.status,
    }
  }

  async simulateCheckOut(dto: SimulationCheckOutDto) {
    const session = await this.prisma.visitSession.findFirst({
      where: { memberId: dto.memberId, locationId: dto.locationId, status: 'checked_in' },
    })
    if (!session) throw new NotFoundException('No active session found for this member at this location')

    const updated = await this.prisma.visitSession.update({
      where: { id: session.id },
      data: { checkOutAt: new Date(), status: 'checked_out' },
    })

    return {
      sessionId: updated.id,
      memberId: dto.memberId,
      locationId: dto.locationId,
      checkInAt: updated.checkInAt.toISOString(),
      checkOutAt: updated.checkOutAt!.toISOString(),
      status: updated.status,
    }
  }
}
