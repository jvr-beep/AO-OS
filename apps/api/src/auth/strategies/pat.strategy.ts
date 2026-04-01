import * as crypto from "crypto";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { PrismaService } from "../../prisma/prisma.service";
import type { JwtPayload } from "./jwt.strategy";

/**
 * Minimal base strategy compatible with NestJS's PassportStrategy mixin.
 *
 * PassportStrategy(PatBase, "pat") wraps this class and, at construction
 * time, passes a single `verifyCallback` as the only argument, i.e. it calls
 * `new PatBase(verifyCallback)`.  Our `authenticate()` invokes that callback
 * with `(req, null)` so the mixin sees `params.length === 2`, resolves
 * `userArgIndex = 0`, and calls `validate(req)` on the concrete strategy.
 */
class PatBase {
  private readonly _verify: (...args: any[]) => void;

  constructor(verify: (...args: any[]) => void) {
    this._verify = verify;
  }

  authenticate(req: any): void {
    const self = this as any;
    Promise.resolve(this._verify(req, null)).catch((e: any) => self.error(e));
  }
}

@Injectable()
export class PATStrategy extends PassportStrategy(PatBase as any, "pat") {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(req: { headers?: { authorization?: string } }): Promise<JwtPayload | null> {
    const auth = req?.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return null;

    const token = auth.slice(7);

    // JWTs are three base64url segments joined by dots; PATs are plain hex
    // strings.  If the token contains a dot it is (or was meant to be) a JWT
    // and this strategy should not handle it.
    if (token.includes(".")) return null;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const pat = await (this.prisma as any).staffPat.findUnique({
      where: { tokenHash },
      include: { staffUser: true }
    });

    if (!pat) return null;
    if (pat.revokedAt) return null;
    if (pat.expiresAt && pat.expiresAt <= new Date()) return null;

    // Record the last-used timestamp without blocking the request
    void (this.prisma as any).staffPat
      .update({ where: { id: pat.id }, data: { lastUsedAt: new Date() } })
      .catch((err: unknown) => console.error("[PATStrategy] lastUsedAt update failed:", err));

    return {
      sub: pat.staffUser.id,
      email: pat.staffUser.email,
      role: pat.staffUser.role
    };
  }
}
