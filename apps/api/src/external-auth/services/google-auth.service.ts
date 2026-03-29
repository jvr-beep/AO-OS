import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import * as crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { AuthService, MemberAuthResponse, RequestMeta } from "../../auth/auth.service";
import { ExternalAuthService, ResolveGoogleContext, VerifiedGoogleProfile } from "./external-auth.service";

type GoogleAuthState = {
  nonce: string;
  mode: "login" | "link" | "convert";
  memberId?: string;
};

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly externalAuthService: ExternalAuthService,
    private readonly authService: AuthService
  ) {}

  private getGoogleConfig(): {
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
  } {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException("GOOGLE_AUTH_NOT_CONFIGURED");
    }

    return {
      clientId,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    };
  }

  private createOAuthClient(): OAuth2Client {
    const { clientId, clientSecret, redirectUri } = this.getGoogleConfig();
    return new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri
    });
  }

  async buildAuthorizationUrl(params: {
    mode?: "login" | "link" | "convert";
    memberId?: string;
  }): Promise<{ url: string; state: string }> {
    const { clientId, redirectUri } = this.getGoogleConfig();

    const statePayload: GoogleAuthState = {
      nonce: crypto.randomUUID(),
      mode: params.mode ?? "login",
      memberId: params.memberId
    };

    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      nonce: statePayload.nonce,
      state
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
      state
    };
  }

  async handleCallback(
    params: { code: string; state: string },
    meta: RequestMeta = {}
  ): Promise<MemberAuthResponse> {
    try {
      const state = this.parseState(params.state);
      const profile = await this.exchangeCodeForProfile(params.code, state.nonce);

      const resolutionContext: ResolveGoogleContext = {
        mode: state.mode,
        currentMemberId: state.mode === "link" ? state.memberId : undefined,
        memberIdToConvert: state.mode === "convert" ? state.memberId : undefined
      };

      const member = await this.externalAuthService.resolveMemberFromGoogle(profile, resolutionContext);
      return this.authService.finalizeMemberAuthentication(member.id, "google", meta);
    } catch (error) {
      await this.authService.recordAuthenticationFailure({
        method: "google",
        reasonCode: this.extractFailureReasonCode(error),
        meta,
        metadataJson: {
          flow: "google_callback"
        }
      });
      throw error;
    }
  }

  async verifyGoogleIdToken(idToken: string, expectedNonce: string): Promise<VerifiedGoogleProfile> {
    const { clientId } = this.getGoogleConfig();
    const oauthClient = this.createOAuthClient();

    let payload;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch {
      throw new BadRequestException("INVALID_GOOGLE_ID_TOKEN");
    }

    if (!payload?.sub) {
      throw new BadRequestException("INVALID_GOOGLE_ID_TOKEN_PAYLOAD");
    }

    if (!payload.nonce || payload.nonce !== expectedNonce) {
      throw new BadRequestException("GOOGLE_NONCE_MISMATCH");
    }

    return {
      sub: payload.sub,
      email: payload.email ?? undefined,
      emailVerified: payload.email_verified === true,
      displayName: payload.name ?? undefined,
      givenName: payload.given_name ?? undefined,
      familyName: payload.family_name ?? undefined,
      picture: payload.picture ?? undefined
    };
  }

  private parseState(encodedState: string): GoogleAuthState {
    try {
      const parsed = JSON.parse(Buffer.from(encodedState, "base64url").toString("utf8")) as GoogleAuthState;
      const mode = parsed.mode ?? "login";

      if (!parsed.nonce || !["login", "link", "convert"].includes(mode)) {
        throw new Error("INVALID_STATE_PAYLOAD");
      }

      if ((mode === "link" || mode === "convert") && !parsed.memberId) {
        throw new Error("MISSING_MEMBER_ID");
      }

      return {
        nonce: parsed.nonce,
        mode,
        memberId: parsed.memberId
      };
    } catch {
      throw new BadRequestException("INVALID_GOOGLE_AUTH_STATE");
    }
  }

  private async exchangeCodeForProfile(code: string, expectedNonce: string): Promise<VerifiedGoogleProfile> {
    const { clientId, clientSecret, redirectUri } = this.getGoogleConfig();

    if (!clientSecret) {
      throw new ServiceUnavailableException("GOOGLE_AUTH_NOT_CONFIGURED");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      }).toString()
    });

    if (!response.ok) {
      throw new BadRequestException("GOOGLE_TOKEN_EXCHANGE_FAILED");
    }

    const tokenResponse = (await response.json()) as { id_token?: string };
    if (!tokenResponse.id_token) {
      throw new BadRequestException("GOOGLE_ID_TOKEN_MISSING");
    }

    return this.verifyGoogleIdToken(tokenResponse.id_token, expectedNonce);
  }

  private extractFailureReasonCode(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === "string") {
        return response;
      }

      if (typeof response === "object" && response && "message" in response) {
        const message = (response as { message?: string | string[] }).message;
        if (Array.isArray(message)) {
          return String(message[0] ?? "AUTH_ERROR");
        }
        if (message) {
          return String(message);
        }
      }
    }

    if (error instanceof ServiceUnavailableException) {
      return "GOOGLE_AUTH_NOT_CONFIGURED";
    }

    return "AUTH_ERROR";
  }
}
