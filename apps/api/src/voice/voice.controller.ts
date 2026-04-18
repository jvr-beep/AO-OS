import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { VoiceService } from "./voice.service";
import { VoiceAlertDto } from "./dto/voice-alert.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";

@Controller("voice")
@UseGuards(JwtAuthGuard)
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voiceService: VoiceService) {}

  /**
   * POST /voice/alert
   *
   * Generates a TTS audio clip for a back-of-house ops alert.
   * Returns audio/mpeg directly for browser playback.
   * Staff-only — requires valid JWT.
   */
  @Post("alert")
  @HttpCode(200)
  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  async alert(
    @Body() body: VoiceAlertDto,
    @Res() res: Response
  ): Promise<void> {
    const result = await this.voiceService.generateAlert(
      body.text,
      body.severity ?? "p2"
    );

    if (!result) {
      res.status(503).json({ message: "Voice service unavailable" });
      return;
    }

    const audioBuffer = Buffer.from(result.audioBase64, "base64");
    res.set({
      "Content-Type": result.contentType,
      "Content-Length": audioBuffer.length.toString(),
      "Cache-Control": "no-store",
    });
    res.send(audioBuffer);
  }

  /**
   * POST /voice/alert/json
   *
   * Same as /alert but returns base64-encoded audio as JSON.
   * Useful for web clients that need to store or replay audio.
   */
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
}
