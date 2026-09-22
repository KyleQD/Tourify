"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, FlashlightIcon, FlashlightOff, RotateCcw } from 'lucide-react'

interface TicketQrScannerProps {
  onScan: (value: string) => void
  disabled?: boolean
}

type ScannerState = 'idle' | 'starting' | 'active' | 'denied' | 'unsupported' | 'error'

/**
 * VEN-161 — productionized door scanner: camera permission states, torch
 * control where the track supports it, and clear recovery paths. Live decode
 * uses BarcodeDetector; manual entry remains the parent's fallback.
 */
export function TicketQrScanner({ onScan, disabled }: TicketQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ScannerState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScanRef = useRef<string>('')

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTorchOn(false)
    setTorchAvailable(false)
    setState('idle')
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  const start = async () => {
    setMessage(null)
    setState('starting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported')
        setMessage('Camera not available on this device. Use manual entry or a hardware scanner.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Torch capability probe (VEN-161).
      const track = stream.getVideoTracks()[0]
      const capabilities = typeof track?.getCapabilities === 'function' ? track.getCapabilities() : null
      setTorchAvailable(Boolean((capabilities as any)?.torch))

      const Detector = (window as any).BarcodeDetector
      if (!Detector) {
        // Camera runs so hardware scanners can still frame the preview.
        setState('active')
        setMessage('Live decode needs BarcodeDetector (Chrome/Android). Manual entry or a USB/hardware scanner still works.')
        return
      }
      setState('active')

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
      if (err?.name === 'NotAllowedError') {
        setState('denied')
        setMessage('Camera permission was denied. Allow camera access in your browser settings, then retry.')
      } else if (err?.name === 'NotFoundError') {
        setState('error')
        setMessage('No camera found on this device. Use manual entry.')
      } else {
        setState('error')
        setMessage(err?.message || 'Unable to access camera')
      }
    }
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      const next = !torchOn
      await track.applyConstraints({ advanced: [{ torch: next }] } as any)
      setTorchOn(next)
    } catch {
      setTorchAvailable(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          aria-label="Ticket QR camera"
        />
        {!streamRef.current && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">
            {state === 'denied'
              ? 'Camera blocked'
              : state === 'starting'
                ? 'Starting camera…'
                : 'Camera off'}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!streamRef.current ? (
          <Button className="min-h-11 flex-1" onClick={() => void start()} disabled={disabled}>
            <Camera className="mr-2 h-4 w-4" />
            Start camera
          </Button>
        ) : (
          <>
            <Button className="min-h-11 flex-1" variant="outline" onClick={stop}>
              <CameraOff className="mr-2 h-4 w-4" />
              Stop camera
            </Button>
            {torchAvailable && (
              <Button
                variant="outline"
                className="min-h-11 min-w-11"
                onClick={() => void toggleTorch()}
                aria-pressed={torchOn}
                aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
              >
                {torchOn ? <FlashlightOff className="h-4 w-4" /> : <FlashlightIcon className="h-4 w-4" />}
              </Button>
            )}
          </>
        )}
      </div>

      {(message || state === 'denied') && (
        <div
          role={state === 'denied' ? 'alert' : 'status'}
          className="flex flex-col gap-2 rounded-md border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-200"
        >
          <p>{message}</p>
          {(state === 'denied' || state === 'error') && (
            <Button size="sm" variant="outline" className="self-start border-amber-600 text-amber-200" onClick={() => void start()}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry camera
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
