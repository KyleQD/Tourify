"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff } from 'lucide-react'

interface TicketQrScannerProps {
  onScan: (value: string) => void
  disabled?: boolean
}

/**
 * Lightweight camera scanner using BarcodeDetector when available.
 * Falls back to manual entry (parent) when unsupported.
 */
export function TicketQrScanner({ onScan, disabled }: TicketQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScanRef = useRef<string>('')

  useEffect(() => {
    return () => {
      stop()
    }
  }, [])

  async function start() {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available on this device')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)

      const Detector = (window as any).BarcodeDetector
      if (!Detector) {
        setError('Live decode requires BarcodeDetector. Use manual entry or a hardware scanner.')
        return
      }

      const detector = new Detector({ formats: ['qr_code'] })
      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        try {
          const codes = await detector.detect(videoRef.current)
          const raw = codes?.[0]?.rawValue
          if (raw && raw !== lastScanRef.current) {
            lastScanRef.current = raw
            onScan(raw)
            setTimeout(() => {
              lastScanRef.current = ''
            }, 2500)
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (err: any) {
      setError(err?.message || 'Unable to access camera')
      setActive(false)
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 aspect-[3/4]">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Camera off
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {!active ? (
          <Button className="flex-1" onClick={() => void start()} disabled={disabled}>
            <Camera className="mr-2 h-4 w-4" />
            Start camera
          </Button>
        ) : (
          <Button className="flex-1" variant="outline" onClick={stop}>
            <CameraOff className="mr-2 h-4 w-4" />
            Stop camera
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-amber-300">{error}</p>}
    </div>
  )
}
