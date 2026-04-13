import { Controller, Get, UseGuards } from "@nestjs/common";
import { MonitorKeyGuard } from "../guards/monitor-key.guard";

const INTEGRATIONS = [
  { name: "AO_PRISMA_KEY", label: "Prisma (Database)" },
  { name: "AO_WEB_FRAMER_KEY", label: "Framer Web" },
  { name: "API_KEY_JVR_AOSANCTUARY", label: "AO Sanctuary API" },
  { name: "CLAUDE_AO_KEY", label: "Claude (Anthropic)" },
  { name: "CLOUDFLARE_API_TOKEN", label: "Cloudflare" },
  { name: "ELEVENLABS_AO_KEY", label: "ElevenLabs" },
  { name: "FIGMA_AO_KEY", label: "Figma" },
  { name: "FRAMER_API_TOKEN", label: "Framer API" },
] as const;

@Controller("ops")
@UseGuards(MonitorKeyGuard)
export class IntegrationHealthController {
  @Get("integration-health")
  getIntegrationHealth() {
    const integrations = INTEGRATIONS.map(({ name, label }) => ({
      name,
      label,
      configured: Boolean(process.env[name]),
    }));

    const allConfigured = integrations.every((i) => i.configured);

    return {
      status: allConfigured ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      integrations,
    };
  }
}
