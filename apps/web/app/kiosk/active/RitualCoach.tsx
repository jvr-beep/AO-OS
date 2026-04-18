'use client'

import { useState, useRef, useCallback } from 'react'

type VisitMode = 'restore' | 'release' | 'retreat'
type RitualPhase = 'opening' | 'mid' | 'deep' | 'closing'

interface RitualCoachProps {
  visitMode: VisitMode
  /** 0–1 progress through the visit duration */
  progressFraction: number
}

function inferPhase(progress: number): RitualPhase {
  if (progress < 0.25) return 'opening'
  if (progress < 0.60) return 'mid'
  if (progress < 0.85) return 'deep'
  return 'closing'
}

const MODE_LABELS: Record<VisitMode, string> = {
  restore: 'Restore',
  release: 'Release',
  retreat: 'Retreat',
}

export function RitualCoach({ visitMode, progressFraction }: RitualCoachProps) {
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [guidance, setGuidance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const requestGuidance = useCallback(async () => {
    if (loading || playing) return

    setLoading(true)
    setError(null)
    setGuidance(null)

    const phase = inferPhase(progressFraction)

    try {
      const res = await fetch('/api/kiosk/ritual-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: visitMode, phase }),
      })

      const data = await res.json()

      if (!data.available) {
        setError('Guidance unavailable')
        setLoading(false)
        return
      }

      setGuidance(data.text)

      // Play audio
      const blob = new Blob(
        [Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0))],
        { type: data.contentType }
      )
      const url = URL.createObjectURL(blob)

      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }

      const audio = new Audio(url)
      audioRef.current = audio
      setPlaying(true)
      audio.play()
      audio.onended = () => {
        setPlaying(false)
        URL.revokeObjectURL(url)
      }
    } catch {
      setError('Could not load guidance')
    } finally {
      setLoading(false)
    }
  }, [loading, playing, visitMode, progressFraction])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    }
  }, [])

  return (
    <div className="mt-6 rounded-lg bg-surface-1 border border-border-subtle p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Ritual Coach</p>
          <p className="text-xs text-accent-primary mt-0.5">{MODE_LABELS[visitMode]} guidance</p>
        </div>
        <div className="flex items-center gap-2">
          {playing && (
            <button
              onClick={stopAudio}
              className="text-xs text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
            >
              Stop
            </button>
          )}
          <button
            onClick={requestGuidance}
            disabled={loading || playing}
            className="btn-primary px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-40"
          >
            {loading ? 'Loading…' : playing ? 'Playing…' : 'Guidance'}
          </button>
        </div>
      </div>

      {guidance && (
        <p className="text-xs text-text-secondary leading-relaxed italic border-t border-border-subtle pt-3 mt-1">
          {guidance}
        </p>
      )}

      {error && (
        <p className="text-xs text-critical mt-2">{error}</p>
      )}
    </div>
  )
}
