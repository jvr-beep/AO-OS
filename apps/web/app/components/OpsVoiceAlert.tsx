"use client"

import { useEffect, useRef, useCallback } from "react"

export type AlertSeverity = "p1" | "p2" | "p3" | "info"

interface OpsVoiceAlertOptions {
  apiBaseUrl?: string
  token?: string
}

/**
 * useOpsVoiceAlert — hook for triggering voice alerts from the staff portal.
 *
 * Usage:
 *   const { speak } = useOpsVoiceAlert({ token: staffToken })
 *   speak("Cold plunge two offline.", "p2")
 *
 * Audio plays immediately in the browser. Falls back silently if the
 * voice service is unavailable. No ambient sound — only called on demand.
 */
export function useOpsVoiceAlert(options: OpsVoiceAlertOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

  const speak = useCallback(
    async (text: string, severity: AlertSeverity = "p2") => {
      if (!options.token) return

      try {
        const res = await fetch(`${apiBaseUrl}/voice/alert/json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.token}`,
          },
          body: JSON.stringify({ text, severity }),
        })

        if (!res.ok) return

        const data = await res.json()
        if (!data.available || !data.audioBase64) return

        const byteChars = atob(data.audioBase64)
        const byteArray = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i)
        }

        const blob = new Blob([byteArray], { type: data.contentType ?? "audio/mpeg" })
        const url = URL.createObjectURL(blob)

        if (audioRef.current) {
          audioRef.current.pause()
          URL.revokeObjectURL(audioRef.current.src)
        }

        const audio = new Audio(url)
        audioRef.current = audio
        await audio.play()

        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(url)
        })
      } catch {
        // Voice alert failures are non-blocking — Slack is the primary channel
      }
    },
    [apiBaseUrl, options.token]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
  }, [])

  return { speak }
}
