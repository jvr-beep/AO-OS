"use client"

import { useEffect } from "react"

// Requires NEXT_PUBLIC_DD_APPLICATION_ID and NEXT_PUBLIC_DD_CLIENT_TOKEN
// to be set. Create a RUM Application in the Datadog UI (UX Monitoring →
// RUM Applications → New Application) to obtain these values, then add
// them to apps/web/.env and to the VM env.
const APP_ID = process.env.NEXT_PUBLIC_DD_APPLICATION_ID
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN

export default function DatadogRum() {
  useEffect(() => {
    if (!APP_ID || !CLIENT_TOKEN) return

    import("@datadog/browser-rum").then(({ datadogRum }) => {
      datadogRum.init({
        applicationId: APP_ID,
        clientToken: CLIENT_TOKEN,
        site: "datadoghq.com",
        service: "ao-os-web",
        env: process.env.NODE_ENV ?? "production",
        version: "1.0.0",
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask-user-input",
      })
    })
  }, [])

  return null
}
