import { Body, Controller, Delete, Get, Param, Query, Req } from "@nestjs/common";
import { GoogleCallbackDto } from "../dto/google-callback.dto";
import { GoogleAuthStartDto } from "../dto/google-auth-start.dto";
import { LinkGoogleDto } from "../dto/link-google.dto";
import { ExternalAuthService } from "../services/external-auth.service";
import { GoogleAuthService } from "../services/google-auth.service";

@Controller("auth")
export class ExternalAuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly externalAuthService: ExternalAuthService
  ) {}

  @Get("google")
  startGoogle(@Query() query: GoogleAuthStartDto): Promise<{ url: string; state: string }> {
    return this.googleAuthService.buildAuthorizationUrl({
      mode: query.mode,
      memberId: query.memberId
    });
  }

  @Get("google/callback")
  googleCallback(
    @Query() query: GoogleCallbackDto,
    @Req() req: any
  ): Promise<{ memberId: string; session: { sessionId: string; expiresAt: string } }> {
    return this.googleAuthService.handleCallback(
      {
        code: query.code,
        state: query.state
      },
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );
  }

  @Get("providers/google/link")
  linkGoogle(@Query() query: LinkGoogleDto): Promise<{ url: string; state: string }> {
    return this.googleAuthService.buildAuthorizationUrl({
      mode: "link",
      memberId: query.memberId
    });
  }

  @Delete("providers/google/:externalAuthId")
  async unlinkGoogle(
    @Param("externalAuthId") externalAuthId: string,
    @Body() body: LinkGoogleDto
  ): Promise<{ success: true }> {
    await this.externalAuthService.unlinkExternalIdentity(body.memberId, externalAuthId);
    return { success: true };
  }
}
