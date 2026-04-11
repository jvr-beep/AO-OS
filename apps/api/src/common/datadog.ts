const DD_LOGS_URL = "https://http-intake.logs.datadoghq.com/api/v2/logs";
const DD_SERVICE = "ao-os-api";

export async function logErrorToDatadog(
  error: unknown,
  context?: string,
): Promise<void> {
  const apiKey = process.env.AO_DATA_DOG_KEY;
  if (!apiKey) return;

  const message =
    error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = [
    {
      ddsource: "nodejs",
      ddtags: `env:${process.env.NODE_ENV ?? "production"},service:${DD_SERVICE}`,
      hostname: process.env.HOSTNAME ?? "unknown",
      service: DD_SERVICE,
      status: "error",
      message,
      error: {
        stack,
        message,
        kind: error instanceof Error ? error.constructor.name : "UnknownError",
      },
      context: context ?? "uncaught",
    },
  ];

  try {
    await fetch(DD_LOGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (sendError) {
    // Swallow network errors — observability must never crash the app.
    // Log to stderr so that at least the local/container logs reflect the failure.
    console.error("[Datadog] Failed to send error log:", sendError);
  }
}
