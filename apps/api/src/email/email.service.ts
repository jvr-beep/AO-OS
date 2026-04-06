import { Injectable, Logger } from "@nestjs/common";
import { getWorkspaceDelegatedAccessToken } from "./google-workspace-auth";

/**
 * EmailService — thin wrapper around Gmail API or Resend.
 *
 * Provider selection order:
 * 1. EMAIL_PROVIDER=gmail or detected Google Workspace env
 * 2. EMAIL_PROVIDER=resend or detected Resend env
 * 3. dry-run logging when no provider config exists
 */

type EmailProvider = "gmail" | "resend" | "dry-run";

export type EmailDeliveryResult = {
  provider: EmailProvider;
  accepted: boolean;
  deliveryId: string;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey = process.env.RESEND_API_KEY ?? "";
  private readonly from = process.env.EMAIL_FROM ?? "AO OS <noreply@aosanctuary.com>";
  private readonly appBaseUrl = process.env.APP_BASE_URL ?? "https://app.aosanctuary.com";
  private readonly staffAppBaseUrl = process.env.STAFF_APP_BASE_URL ?? this.appBaseUrl;
  private readonly googleWorkspaceClientEmail = process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL ?? "";
  private readonly googleWorkspacePrivateKey = (process.env.GOOGLE_WORKSPACE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  private readonly googleWorkspaceDelegatedUser = process.env.GOOGLE_WORKSPACE_DELEGATED_USER ?? "";
  private readonly provider = this.resolveProvider();

  constructor() {
    this.logger.log(
      JSON.stringify({
        event: "email_provider_initialized",
        provider: this.provider,
        from: this.from,
        appBaseUrl: this.appBaseUrl,
        staffAppBaseUrl: this.staffAppBaseUrl,
        gmailConfigured: this.hasGmailConfig(),
        gmailAuthMode: this.googleWorkspacePrivateKey ? "key" : process.env.GOOGLE_WORKSPACE_KEYLESS === "true" ? "keyless" : "none",
        delegatedUser: this.maskEmail(this.googleWorkspaceDelegatedUser),
        resendConfigured: Boolean(this.resendApiKey)
      })
    );
  }

  async sendVerification(to: string, rawToken: string): Promise<EmailDeliveryResult> {
    const link = `${this.appBaseUrl}/auth/verify-email?token=${rawToken}`;
    return this._send({
      to,
      subject: "Verify your AO OS email address",
      html: this._verifyTemplate(link),
      template: "verify-email"
    });
  }

  async sendPasswordReset(to: string, rawToken: string): Promise<EmailDeliveryResult> {
    const link = `${this.appBaseUrl}/auth/reset-password?token=${rawToken}`;
    return this._send({
      to,
      subject: "Reset your AO OS password",
      html: this._resetTemplate(link),
      template: "member-password-reset"
    });
  }

  async sendStaffPasswordReset(to: string, rawToken: string): Promise<EmailDeliveryResult> {
    const link = `${this.staffAppBaseUrl}/login?resetToken=${encodeURIComponent(rawToken)}`;
    return this._send({
      to,
      subject: "Reset your AO OS staff password",
      html: this._staffResetTemplate(link),
      template: "staff-password-reset"
    });
  }

  async sendInvite(to: string, rawToken: string): Promise<EmailDeliveryResult> {
    const link = `${this.appBaseUrl}/auth/set-password?token=${rawToken}`;
    return this._send({
      to,
      subject: "You've been invited to AO OS — set your password",
      html: this._inviteTemplate(link),
      template: "invite-set-password"
    });
  }

  private async _send(opts: { to: string; subject: string; html: string; template: string }): Promise<EmailDeliveryResult> {
    const deliveryId = crypto.randomUUID();

    this.logger.log(
      JSON.stringify({
        event: "email_delivery_started",
        deliveryId,
        provider: this.provider,
        template: opts.template,
        to: this.maskEmail(opts.to),
        subject: opts.subject
      })
    );

    if (this.provider === "gmail") {
      return this._sendViaGmail(opts, deliveryId);
    }

    if (this.provider === "resend") {
      return this._sendViaResend(opts, deliveryId);
    }

    if (this.provider === "dry-run") {
      this.logger.warn(`[EMAIL DRY-RUN] To: ${opts.to} | Subject: ${opts.subject}`);
      this.logger.debug(opts.html);
      const result = {
        provider: this.provider,
        accepted: true,
        deliveryId
      } satisfies EmailDeliveryResult;
      this.logger.log(JSON.stringify({ event: "email_delivery_completed", template: opts.template, ...result }));
      return result;
    }

    return {
      provider: this.provider,
      accepted: false,
      deliveryId,
      errorCode: "UNKNOWN_PROVIDER"
    };
  }

  private resolveProvider(): EmailProvider {
    const explicitProvider = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();

    if (explicitProvider === "gmail" || explicitProvider === "resend" || explicitProvider === "dry-run") {
      return explicitProvider;
    }

    if (this.hasGmailConfig()) {
      return "gmail";
    }

    if (this.resendApiKey) {
      return "resend";
    }

    return "dry-run";
  }

  private hasGmailConfig(): boolean {
    // Key-based: all three vars present (legacy / local-dev mode).
    // Keyless: client email + delegated user present without a private key —
    //   uses GCP IAM signJwt via Application Default Credentials.
    return Boolean(
      this.googleWorkspaceClientEmail &&
      this.googleWorkspaceDelegatedUser &&
      (this.googleWorkspacePrivateKey || process.env.GOOGLE_WORKSPACE_KEYLESS === "true")
    );
  }

  private async _sendViaResend(
    opts: { to: string; subject: string; html: string; template: string },
    deliveryId: string
  ): Promise<EmailDeliveryResult> {
    if (!this.resendApiKey) {
      this.logger.warn("[EMAIL DRY-RUN] Resend selected but RESEND_API_KEY is missing.");
      this.logger.warn(`[EMAIL DRY-RUN] To: ${opts.to} | Subject: ${opts.subject}`);
      this.logger.debug(opts.html);
      const result = {
        provider: "resend" as const,
        accepted: false,
        deliveryId,
        errorCode: "RESEND_API_KEY_MISSING",
        errorMessage: "Resend selected but RESEND_API_KEY is missing"
      } satisfies EmailDeliveryResult;
      this.logger.error(JSON.stringify({ event: "email_delivery_failed", template: opts.template, to: this.maskEmail(opts.to), ...result }));
      return result;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: this.from, to: opts.to, subject: opts.subject, html: opts.html })
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Email send failed (${res.status}): ${body}`);
      const result = {
        provider: "resend" as const,
        accepted: false,
        deliveryId,
        statusCode: res.status,
        errorCode: "RESEND_SEND_FAILED",
        errorMessage: this.truncate(body)
      } satisfies EmailDeliveryResult;
      this.logger.error(JSON.stringify({ event: "email_delivery_failed", template: opts.template, to: this.maskEmail(opts.to), ...result }));
      return result;
    }

    const result = {
      provider: "resend" as const,
      accepted: true,
      deliveryId,
      statusCode: res.status
    } satisfies EmailDeliveryResult;
    this.logger.log(JSON.stringify({ event: "email_delivery_completed", template: opts.template, to: this.maskEmail(opts.to), ...result }));
    return result;
  }

  private async _sendViaGmail(
    opts: { to: string; subject: string; html: string; template: string },
    deliveryId: string
  ): Promise<EmailDeliveryResult> {
    if (!this.hasGmailConfig()) {
      this.logger.warn("[EMAIL DRY-RUN] Gmail selected but Google Workspace env is incomplete.");
      this.logger.warn(`[EMAIL DRY-RUN] To: ${opts.to} | Subject: ${opts.subject}`);
      this.logger.debug(opts.html);
      const result = {
        provider: "gmail" as const,
        accepted: false,
        deliveryId,
        errorCode: "GMAIL_CONFIG_INCOMPLETE",
        errorMessage: "Gmail selected but Google Workspace env is incomplete"
      } satisfies EmailDeliveryResult;
      this.logger.error(
        JSON.stringify({
          event: "email_delivery_failed",
          template: opts.template,
          to: this.maskEmail(opts.to),
          delegatedUser: this.maskEmail(this.googleWorkspaceDelegatedUser),
          clientEmail: this.maskEmail(this.googleWorkspaceClientEmail),
          ...result
        })
      );
      return result;
    }

    try {
      const accessToken = await getWorkspaceDelegatedAccessToken(
        this.googleWorkspaceClientEmail,
        this.googleWorkspaceDelegatedUser,
        ["https://www.googleapis.com/auth/gmail.send"],
        this.googleWorkspacePrivateKey || undefined
      );

      const rawMessage = this.buildRawMimeMessage(opts);
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.googleWorkspaceDelegatedUser)}/messages/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw: rawMessage })
        }
      );

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Gmail send failed (${response.status}): ${body}`);
        const result = {
          provider: "gmail" as const,
          accepted: false,
          deliveryId,
          statusCode: response.status,
          errorCode: "GMAIL_SEND_FAILED",
          errorMessage: this.truncate(body)
        } satisfies EmailDeliveryResult;
        this.logger.error(
          JSON.stringify({
            event: "email_delivery_failed",
            template: opts.template,
            to: this.maskEmail(opts.to),
            delegatedUser: this.maskEmail(this.googleWorkspaceDelegatedUser),
            clientEmail: this.maskEmail(this.googleWorkspaceClientEmail),
            gmailAuthMode: this.googleWorkspacePrivateKey ? "key" : "keyless",
            ...result
          })
        );
        return result;
      }

      const responseBody = (await response.json().catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;
      const result = {
        provider: "gmail" as const,
        accepted: true,
        deliveryId,
        statusCode: response.status
      } satisfies EmailDeliveryResult;
      this.logger.log(
        JSON.stringify({
          event: "email_delivery_completed",
          template: opts.template,
          to: this.maskEmail(opts.to),
          delegatedUser: this.maskEmail(this.googleWorkspaceDelegatedUser),
          clientEmail: this.maskEmail(this.googleWorkspaceClientEmail),
          gmailMessageId: typeof responseBody.id === "string" ? responseBody.id : undefined,
          gmailAuthMode: this.googleWorkspacePrivateKey ? "key" : "keyless",
          ...result
        })
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_GMAIL_ERROR";
      this.logger.error(
        `Gmail send failed: ${message}`
      );
      const result = {
        provider: "gmail" as const,
        accepted: false,
        deliveryId,
        errorCode: "GMAIL_EXCEPTION",
        errorMessage: this.truncate(message)
      } satisfies EmailDeliveryResult;
      this.logger.error(
        JSON.stringify({
          event: "email_delivery_failed",
          template: opts.template,
          to: this.maskEmail(opts.to),
          delegatedUser: this.maskEmail(this.googleWorkspaceDelegatedUser),
          clientEmail: this.maskEmail(this.googleWorkspaceClientEmail),
          gmailAuthMode: this.googleWorkspacePrivateKey ? "key" : "keyless",
          ...result
        })
      );
      return result;
    }
  }

  private maskEmail(value: string): string {
    const normalized = value.trim().toLowerCase();
    const [localPart, domain] = normalized.split("@");

    if (!localPart || !domain) {
      return normalized || "unknown";
    }

    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}*@${domain}`;
    }

    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  private truncate(value: string, maxLength = 500): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
  }

  private buildRawMimeMessage(opts: { to: string; subject: string; html: string }): string {
    const message = [
      `From: ${this.from}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      opts.html
    ].join("\r\n");

    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  // ── Templates ──────────────────────────────────────────────────────

  private _verifyTemplate(link: string): string {
    return `<p>Please verify your email address by clicking the link below. It expires in 24 hours.</p>
<p><a href="${link}">${link}</a></p>`;
  }

  private _resetTemplate(link: string): string {
    return `<p>We received a request to reset your AO OS password. Click the link below within 30 minutes.</p>
<p><a href="${link}">${link}</a></p>
<p>If you did not request a password reset, you can safely ignore this email.</p>`;
  }

  private _staffResetTemplate(link: string): string {
    return `<p>We received a request to reset your AO OS staff portal password. Click the link below within 30 minutes.</p>
<p><a href="${link}">${link}</a></p>
<p>If you did not request a password reset, you can safely ignore this email.</p>`;
  }

  private _inviteTemplate(link: string): string {
    return `<p>You've been added to AO OS. Click below to set your password and activate your account.</p>
<p><a href="${link}">${link}</a></p>`;
  }
}
