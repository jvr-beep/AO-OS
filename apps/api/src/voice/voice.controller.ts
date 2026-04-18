import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Logger,
  Header,
  StreamableFile,
} from "@nestjs/common";
import { VoiceService } from "./voice.service";
import { VoiceAlertDto } from "./dto/voice-alert.dto";
import { VoiceRitualDto } from "./dto/voice-ritual.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";

@Controller("voice")
@UseGuards(JwtAuthGuard)
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voiceService: VoiceService) {}

  @Post("alert")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  async alert(@Body() body: VoiceAlertDto): Promise<StreamableFile> {
    const result = await this.voiceService.generateAlert(
      body.text,
      body.severity ?? "p2"
    );

    const audioBuffer = result
      ? Buffer.from(result.audioBase64, "base64")
      : Buffer.alloc(0);

    return new StreamableFile(audioBuffer, {
      type: result?.contentType ?? "audio/mpeg",
      length: audioBuffer.length,
    });
  }

  @Post("alert/json")
  @HttpCode(200)
  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  async alertJson(@Body() body: VoiceAlertDto) {
    const result = await this.voiceService.generateAlert(
      body.text,
      body.severity ?? "p2"
    );

    if (!result) {
      return { available: false };
    }

    return {
      available: true,
      audioBase64: result.audioBase64,
      contentType: result.contentType,
      text: result.text,
    };
  }

  /**
   * POST /voice/ritual/sequence
   * Lane 2 — Ritual Coach (George voice, thermal sequence guidance).
   * mode: restore | release | retreat
   * phase: opening | mid | deep | closing
   */
  @Post("ritual/sequence")
  @HttpCode(200)
  @Throttle({ global: { ttl: 60_000, limit: 20 } })
  async ritualSequence(@Body() body: VoiceRitualDto) {
    const result = await this.voiceService.generateRitualGuidance(body.mode, body.phase);

    if (!result) {
      return { available: false };
    }

    return {
      available: true,
      audioBase64: result.audioBase64,
      contentType: result.contentType,
      text: result.text,
      mode: body.mode,
      phase: body.phase,
    };
  }
}
