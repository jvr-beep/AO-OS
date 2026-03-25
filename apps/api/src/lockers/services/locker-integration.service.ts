import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { LockerVendorAdapter, NoopLockerVendorAdapter } from "./locker-vendor-adapter";

@Injectable()
export class LockerIntegrationService {
  private readonly adapter: LockerVendorAdapter = new NoopLockerVendorAdapter();

  constructor(private readonly prisma: PrismaService) {}

  async authorizeCredential(memberId: string, credentialId: string, siteId: string): Promise<void> {
    await this.adapter.authorizeCredentialAtSite({ memberId, credentialId, siteId });
  }

  async overrideOpen(lockerId: string, staffUserId: string): Promise<void> {
    await this.prisma.lockerAccessEvent.create({
      data: {
        lockerId,
        memberId: null,
        wristbandId: null,
        lockerAssignmentId: null,
        decision: "allowed",
        denialReasonCode: null,
        eventType: "open",
        occurredAt: new Date(),
        sourceReference: `staff_override:${staffUserId}`,
        rawPayloadJson: { staffUserId }
      }
    });
  }

  async markLockerOutOfService(lockerId: string, reason: string): Promise<void> {
    await this.prisma.locker.update({
      where: { id: lockerId },
      data: { status: "out_of_service" }
    });

    await this.prisma.lockerAccessEvent.create({
      data: {
        lockerId,
        memberId: null,
        wristbandId: null,
        lockerAssignmentId: null,
        decision: "denied",
        denialReasonCode: "LOCKER_OUT_OF_SERVICE",
        eventType: "lock",
        occurredAt: new Date(),
        sourceReference: reason,
        rawPayloadJson: { reason }
      }
    });
  }

  async getLockerStatus(siteId: string): Promise<Array<{ id: string; status: string }>> {
    const lockers = await this.prisma.locker.findMany({
      where: { locationId: siteId },
      select: { id: true, status: true }
    });

    return lockers;
  }

  async syncVendorEvents(siteId: string, from?: string, to?: string): Promise<number> {
    const events = await this.adapter.ingestAccessEvents({ siteId, from, to });

    for (const event of events) {
      const lockerId = typeof event.lockerId === "string" ? event.lockerId : undefined;
      if (!lockerId) continue;

      await this.prisma.lockerAccessEvent.create({
        data: {
          lockerId,
          memberId: typeof event.memberId === "string" ? event.memberId : null,
          wristbandId: typeof event.wristbandId === "string" ? event.wristbandId : null,
          lockerAssignmentId: null,
          decision: "allowed",
          denialReasonCode: null,
          eventType: "open",
          occurredAt: new Date(),
          sourceReference: "vendor_sync",
          rawPayloadJson: event as Prisma.InputJsonValue
        }
      });
    }

    return events.length;
  }
}
