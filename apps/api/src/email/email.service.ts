import { Injectable, Logger } from "@nestjs/common";

/**
 * EmailService — thin wrapper around Resend (or any HTTP-based email provider).
 *
 * Set RESEND_API_KEY + EMAIL_FROM in env. If neither is set the service logs
 * the email payload so dev workflows still show what would have been sent.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? "";
  private readonly from = process.env.EMAIL_FROM ?? "AO OS <noreply@aosanctuary.com>";
  private readonly appBaseUrl = process.env.APP_BASE_URL ?? "https://app.aosanctuary.com";

  async sendVerification(to: string, rawToken: string): Promise<void> {
    const link = `${this.appBaseUrl}/auth/verify-email?token=${rawToken}`;
    await this._send({
      to,
      subject: "Verify your AO OS email address",
      html: this._verifyTemplate(link)
    });
  }

  async sendPasswordReset(to: string, rawToken: string): Promise<void> {
    const link = `${this.appBaseUrl}/auth/reset-password?token=${rawToken}`;
    await this._send({
      to,
      subject: "Reset your AO OS password",
      html: this._resetTemplate(link)
    });
  }

  async sendInvite(to: string, rawToken: string): Promise<void> {
    const link = `${this.appBaseUrl}/auth/set-password?token=${rawToken}`;
    await this._send({
      to,
      subject: "You've been invited to AO OS — set your password",
      html: this._inviteTemplate(link)
    });
  }

  private async _send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`[EMAIL DRY-RUN] To: ${opts.to} | Subject: ${opts.subject}`);
      this.logger.debug(opts.html);
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: this.from, to: opts.to, subject: opts.subject, html: opts.html })
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Email send failed (${res.status}): ${body}`);
    }
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

  private _inviteTemplate(link: string): string {
    return `<p>You've been added to AO OS. Click below to set your password and activate your account.</p>
<p><a href="${link}">${link}</a></p>`;
  }
}
