import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Accepts both a signed JWT (short-lived, issued by /auth/login) and a
 * Personal Access Token (long-lived, managed via /developer/pats).
 * passport tries the strategies in order; the first that succeeds wins.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(["jwt", "pat"]) {}
