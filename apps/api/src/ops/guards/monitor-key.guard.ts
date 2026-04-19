import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class MonitorKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const authHeader = request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Monitor key required");
    }

    const key = authHeader.slice(7);
    const expected = process.env.MONITOR_API_KEY;

    if (!expected || key !== expected) {
      throw new UnauthorizedException("Invalid monitor key");
    }

    return true;
  }
}
