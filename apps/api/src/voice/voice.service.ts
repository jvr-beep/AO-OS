import { Injectable, Logger } from "@nestjs/common";

export type AlertSeverity = "p1" | "p2" | "p3" | "info";
export type VisitMode = "restore" | "release" | "retreat";
export type RitualPhase = "opening" | "mid" | "deep" | "closing";

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

/** Ritual Coach scripts — George voice, AO thermal circuit guidance. */
const RITUAL_SCRIPTS: Record<string, Record<string, string>> = {
  restore: {
    opening:
      "Welcome. Your visit has begun. Begin in the Caldarium — the heat will open you. "
      + "Move slowly. There is no urgency here. When you are ready, let the warmth settle, "
      + "then proceed to the contrast pool. The circuit will find its rhythm.",
    mid:
      "You are in the middle of your thermal sequence. If you have not yet taken cold contrast, "
      + "now is the right moment. Move from heat to cold, then rest fully before returning. "
      + "Allow the body to release what it held on the way in.",
    deep:
      "You are in the deeper phase of your visit. Let the circuit slow. "
      + "Longer holds in the thermal baths. Shorter transitions. "
      + "The body has already done much of the work — this is the integration.",
    closing:
      "Your visit is drawing toward its close. Take one final contrast if it calls to you, "
      + "then rest in the lounge. Drink water. Let the heat leave the body slowly before you return to the outside world.",
  },
  release: {
    opening:
      "You are here for release. Your private space is open to you. "
      + "Begin with the thermal circuit if that is your practice — heat loosens the body, "
      + "and a loosened body is more present. Take your time arriving.",
    mid:
      "The body is warm and open now. This is a good moment to move to your private space "
      + "if you have not yet. Everything here is yours. There is no performance required — only presence.",
    deep:
      "You are in the deep part of your visit. Let pleasure be slow. "
      + "What serves you now is attention, not speed. The body knows what it needs.",
    closing:
      "You are approaching the end of your time here. Let the closing be unhurried. "
      + "A warm shower, a rest, whatever returns you to yourself. You are welcome back.",
  },
  retreat: {
    opening:
      "Welcome to your retreat. You have the longest arc of time available to you today. "
      + "Do not rush to fill it. Begin in stillness if you need to — the thermal circuit will wait. "
      + "Your room is yours when you are ready.",
    mid:
      "You are well into your retreat. The circuit, the room, the lounge — all remain available. "
      + "If you have not yet gone deep into heat, this is your moment. "
      + "Full immersion, full contrast, full rest. That is the sequence.",
    deep:
      "The retreat deepens. This is rare time — time without obligation. "
      + "Let the body guide the pace now. It will tell you what remains.",
    closing:
      "Your retreat is entering its final hour. Begin to slow and integrate. "
      + "A long rest in the Thermarium, then a cool close, then stillness. "
      + "Carry this out with you — it is part of the practice.",
  },
};

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
   * Lane 2 — Ritual Coach. George voice, thermal sequence guidance.
   * Guidance is contextual: mode (restore/release/retreat) × phase (opening/mid/deep/closing).
   */
  async generateRitualGuidance(
    mode: VisitMode,
    phase: RitualPhase
  ): Promise<VoiceAlertResult | null> {
    if (!this.enabled) {
      this.logger.warn("ELEVENLABS_API_KEY not set — ritual guidance skipped");
      return null;
    }

    const text = RITUAL_SCRIPTS[mode]?.[phase] ?? RITUAL_SCRIPTS.restore.opening;

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${RITUAL_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: { ...VOICE_SETTINGS, stability: 0.70, style: 0.05 },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`ElevenLabs ritual TTS failed: ${response.status} ${err}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(buffer).toString("base64");

      this.logger.log(`Ritual guidance generated: mode=${mode} phase=${phase} (${buffer.byteLength} bytes)`);

      return { audioBase64, contentType: "audio/mpeg", text, voiceId: RITUAL_VOICE_ID };
    } catch (err) {
      this.logger.error("ElevenLabs ritual TTS error", err);
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
