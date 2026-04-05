import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService, MemberAuthResponse } from "../auth.service";
import { LoginDto } from "../dto/login.dto";
import { LoginResponseDto } from "../dto/login.response.dto";
import { MemberSignupDto } from "../dto/member-signup.dto";
import { PasswordResetRequestDto } from "../dto/password-reset-request.dto";
import { PasswordResetConfirmDto } from "../dto/password-reset-confirm.dto";
import { Req } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── STAFF LOGIN ────────────────────────────────────────────────────

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post("login")
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post("member/login")
  memberLogin(@Body() body: LoginDto, @Req() req: any): Promise<MemberAuthResponse> {
    return this.authService.memberLogin(body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
  }

  // ── MEMBER SIGNUP + EMAIL VERIFY ───────────────────────────────────

  @Post("signup")
  memberSignup(@Body() body: MemberSignupDto): Promise<{ email: string }> {
    return this.authService.memberSignup(body);
  }

  @Post("email/verify")
  verifyEmail(@Body() body: { token: string }): Promise<{ email: string }> {
    return this.authService.verifyEmail(body.token);
  }

  // ── PASSWORD RESET (SELF-SERVE) ────────────────────────────────────

  @Post("password-reset/request")
  passwordResetRequest(@Body() body: PasswordResetRequestDto): Promise<void> {
    return this.authService.passwordResetRequest(body);
  }

  @Post("password-reset/confirm")
  passwordResetConfirm(@Body() body: PasswordResetConfirmDto): Promise<{ email: string }> {
    return this.authService.passwordResetConfirm(body);
  }

  // ── STAFF PASSWORD RESET ───────────────────────────────────────────

  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @Post("staff/password-reset/request")
  staffPasswordResetRequest(@Body() body: PasswordResetRequestDto): Promise<void> {
    return this.authService.staffPasswordResetRequest(body);
  }

  @Post("staff/password-reset/confirm")
  staffPasswordResetConfirm(@Body() body: PasswordResetConfirmDto): Promise<{ email: string }> {
    return this.authService.staffPasswordResetConfirm(body);
  }
}
