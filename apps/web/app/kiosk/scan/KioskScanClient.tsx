'use client'

import { useEffect, useRef, useState } from 'react'
import { resolveQrAction } from '../actions/visit'

export function KioskScanClient({ error }: { error?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const tokenInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)
  const detectedRef = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let animFrame: number

    async function startCamera() {
      // BarcodeDetector is available in Chrome 83+ (standard kiosk environment)
      if (!('BarcodeDetector' in window)) {
        setCameraError('QR scanning requires a Chromium-based browser. Please use the booking code or walk-in path.')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)
        scan()
      } catch {
        setCameraError('Camera access denied. Please allow camera access and try again.')
      }
    }

    const detector = 'BarcodeDetector' in window
      ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      : null

    async function scan() {
      if (!videoRef.current || !detector || detectedRef.current) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0 && !detectedRef.current) {
          detectedRef.current = true
          setDetected(true)
          const rawValue: string = barcodes[0].rawValue
          if (tokenInputRef.current) tokenInputRef.current.value = rawValue
          formRef.current?.requestSubmit()
          return
        }
      } catch { /* frame not ready */ }
      animFrame = requestAnimationFrame(scan)
    }

    startCamera()

    return () => {
      cancelAnimationFrame(animFrame)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">Scan Member QR Code</p>
        </div>

        {cameraError ? (
          <div className="rounded-lg bg-surface-1 border border-border-subtle p-6 text-center space-y-4">
            <p className="text-sm text-text-muted">{cameraError}</p>
            <a href="/kiosk" className="block text-xs text-accent-primary uppercase tracking-wider">
              ← Back to Start
            </a>
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden border border-border-subtle mb-6 bg-surface-1 aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {/* Scan frame overlay */}
              {scanning && !detected && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-accent-primary rounded-lg opacity-80" />
                </div>
              )}
              {detected && (
                <div className="absolute inset-0 bg-accent-primary/20 flex items-center justify-center">
                  <p className="text-accent-primary font-medium text-sm uppercase tracking-wider">
                    Recognised ✓
                  </p>
                </div>
              )}
              {!scanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-text-muted text-xs uppercase tracking-wider">Starting camera…</p>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-text-muted mb-6">
              Open the AO app on your phone and show your QR code.
            </p>

            {(error || cameraError) && (
              <div className="rounded-lg border border-critical/40 bg-critical/10 px-4 py-3 mb-4">
                <p className="text-critical text-xs text-center">{error ?? cameraError}</p>
              </div>
            )}

            {/* Hidden form — submitted programmatically when QR detected */}
            <form ref={formRef} action={resolveQrAction}>
              <input ref={tokenInputRef} type="hidden" name="token" />
            </form>
          </>
        )}

        <a
          href="/kiosk"
          className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors mt-4"
        >
          ← Different Option
        </a>
      </div>
    </div>
  )
}
