import { Injectable, Logger } from "@nestjs/common";

export type AlertSeverity = "p1" | "p2" | "p3" | "info";

export interface VoiceAlertResult {
  audioBase64: string;
  contentType: string;
  text: string;
  voiceId: string;
  durationMs?: number;
}

/**
 * VoiceService — generates ElevenLabs TTS audio for AO ops alerts.
 *
 * Voice persona: Daniel (onwK4e9ZLuTAKqWW03F9)
 * Steady, British, middle-aged — composed, assured, not theatrical.
 *
 * Only used for Lane 1 (back-of-house ops alerts).
 * Lane 2 (ritual guidance) will use George (JBFqnCBsd6RMkjVDRZzb).
 */

const OPS_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel — ops alerts
const RITUAL_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — ritual guidance (Lane 2)

const VOICE_SETTINGS = {
  stability: 0.65,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: false,
};

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly apiKey = process.env.ELEVENLABS_API_KEY ?? "";
  private readonly baseUrl = "https://api.elevenlabs.io/v1";

  private get enabled(): boolean {
    return this.apiKey.length > 0;
  }

  async generateAlert(
    text: string,
    severity: AlertSeverity = "p2"
  ): Promise<VoiceAlertResult | null> {
    if (!this.enabled) {
      this.logger.warn("ELEVENLABS_API_KEY not set — voice alert skipped");
      return null;
    }

    const voiceId = OPS_VOICE_ID;
    const sanitized = this.sanitizeText(text, severity);

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: sanitized,
            model_id: "eleven_turbo_v2_5",
            voice_settings: VOICE_SETTINGS,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`ElevenLabs TTS failed: ${response.status} ${err}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(buffer).toString("base64");

      this.logger.log(`Voice alert generated: "${sanitized}" (${buffer.byteLength} bytes)`);

      return {
        audioBase64,
        contentType: "audio/mpeg",
        text: sanitized,
        voiceId,
      };
    } catch (err) {
      this.logger.error("ElevenLabs TTS error", err);
      return null;
    }
  }

  /**
   * Sanitize and normalise alert text to match AO brand voice rules:
   * - Short, imperative sentences
   * - No exclamation points
   * - Calm verb cues
   * - P1 gets a brief severity prefix for urgency
   */
  private sanitizeText(text: string, severity: AlertSeverity): string {
    let clean = text
      .replace(/!/g, ".")
      .replace(/\s+/g, " ")
      .trim();

    // Ensure it ends with a period for natural cadence
    if (!/[.?]$/.test(clean)) {
      clean = clean + ".";
    }

    if (severity === "p1") {
      clean = `Priority alert. ${clean}`;
    }

    return clean;
  }
}
