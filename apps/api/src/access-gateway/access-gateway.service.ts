import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as mqtt from "mqtt";
import { AccessAttemptsService } from "../access-attempts/services/access-attempts.service";
import { PrismaService } from "../prisma/prisma.service";

interface TapPayload {
  wristbandUid: string;
  occurredAt: string;
  attemptSource?: string;
}

@Injectable()
export class AccessGatewayService implements OnModuleInit {
  private readonly logger = new Logger(AccessGatewayService.name);
  private client: mqtt.MqttClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly accessAttempts: AccessAttemptsService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit(): void {
    const brokerUrl = this.config.get<string>("MQTT_BROKER_URL");

    if (!brokerUrl) {
      this.logger.warn("MQTT_BROKER_URL not set — access gateway disabled");
      return;
    }

    this.client = mqtt.connect(brokerUrl, {
      clientId: `ao-os-gateway-${Date.now()}`,
      username: this.config.get<string>("MQTT_USERNAME"),
      password: this.config.get<string>("MQTT_PASSWORD"),
      reconnectPeriod: 5000,
      connectTimeout: 10000
    });

    this.client.on("connect", () => {
      this.logger.log(`Connected to MQTT broker: ${brokerUrl}`);
      this.client!.subscribe("access/tap/+", { qos: 1 }, (err) => {
        if (err) this.logger.error("Failed to subscribe to access/tap/+", err);
        else this.logger.log("Subscribed to access/tap/+");
      });
    });

    this.client.on("message", (topic, message) => {
      void this.handleTap(topic, message);
    });

    this.client.on("error", (err) => {
      this.logger.error("MQTT client error", err);
    });

    this.client.on("disconnect", () => {
      this.logger.warn("MQTT broker disconnected — will reconnect");
    });
  }

  private async handleTap(topic: string, message: Buffer): Promise<void> {
    // topic = access/tap/{accessPointCode}
    const accessPointCode = topic.split("/")[2];
    if (!accessPointCode) {
      this.logger.warn(`Malformed tap topic: ${topic}`);
      return;
    }

    let payload: TapPayload;
    try {
      payload = JSON.parse(message.toString()) as TapPayload;
    } catch {
      this.logger.warn(`Invalid JSON on topic ${topic}`);
      return;
    }

    if (!payload.wristbandUid || !payload.occurredAt) {
      this.logger.warn(`Missing wristbandUid or occurredAt on topic ${topic}`);
      return;
    }

    try {
      const result = await this.accessAttempts.evaluateScan({
        wristbandUid: payload.wristbandUid,
        accessPointCode,
        occurredAt: payload.occurredAt,
        attemptSource: payload.attemptSource ?? "mqtt_reader"
      });

      // Publish decision back so the reader gets a response
      const decisionTopic = `access/decision/${accessPointCode}`;
      this.publish(decisionTopic, JSON.stringify(result), { qos: 1 });

      // Refresh retained entitlements for this wristband if access was allowed
      if (result.decision === "allowed") {
        void this.publishRetainedEntitlements(payload.wristbandUid);
      }
    } catch (err) {
      this.logger.error(`Error evaluating tap on ${accessPointCode}`, err);
      const decisionTopic = `access/decision/${accessPointCode}`;
      this.publish(decisionTopic, JSON.stringify({
        decision: "error",
        wristbandUid: payload.wristbandUid
      }), { qos: 1 });
    }
  }

  async publishRetainedEntitlements(wristbandUid: string): Promise<void> {
    if (!this.client?.connected) return;

    const wristband = await this.prisma.wristband.findFirst({
      where: { uid: wristbandUid }
    });
    if (!wristband) return;

    const now = new Date();
    const permissions = await this.prisma.accessPermission.findMany({
      where: {
        wristbandId: wristband.id,
        permissionStatus: "granted",
        validFrom: { lte: now },
        validUntil: { gte: now }
      }
    });

    // Publish one retained message per zone
    for (const perm of permissions) {
      const topic = `access/entitlements/${wristbandUid}/${perm.zoneCode}`;
      const payload = JSON.stringify({
        granted: true,
        validUntil: perm.validUntil.toISOString()
      });
      this.publish(topic, payload, { qos: 1, retain: true });
    }
  }

  async revokeRetainedEntitlement(wristbandUid: string, zoneCode: string): Promise<void> {
    if (!this.client?.connected) return;
    // Empty retained payload revokes the cached grant on the reader
    const topic = `access/entitlements/${wristbandUid}/${zoneCode}`;
    this.publish(topic, JSON.stringify({ granted: false }), { qos: 1, retain: true });
  }

  private publish(topic: string, payload: string, opts: mqtt.IClientPublishOptions): void {
    if (!this.client?.connected) return;
    this.client.publish(topic, payload, opts, (err) => {
      if (err) this.logger.error(`Publish failed on ${topic}`, err);
    });
  }
}
