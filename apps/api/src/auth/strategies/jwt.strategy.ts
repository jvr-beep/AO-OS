import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { StaffRole } from "../decorators/roles.decorator";

export type JwtPayload = {
  sub: string;
  email: string;
  role: StaffRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.AUTH_JWT_SECRET ?? "dev-only-secret-change-me"
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
