import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Validates member sessions via the X-AO-Member-Session header.
 *
 * Flow:
 *   1. Read sessionId from X-AO-Member-Session header
 *   2. Look up AuthSession — must exist, not expired, not revoked
 *   3. Set req.memberId for downstream controllers
 *
 * Used on all member-facing self-service endpoints.
 */
@Injectable()
export class MemberSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sessionId = req.headers["x-ao-member-session"] as string | undefined;

    if (!sessionId) throw new UnauthorizedException("Member session required");

    const session = await (this.prisma as any).authSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new UnauthorizedException("Session not found");
    if (session.revokedAt) throw new UnauthorizedException("Session revoked");
    if (new Date(session.expiresAt) < new Date()) throw new UnauthorizedException("Session expired");

    req.memberId = session.memberId;
    return true;
  }
}
