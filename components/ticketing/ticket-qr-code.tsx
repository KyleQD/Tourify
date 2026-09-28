"use client"

import { useEffect, useState } from "react"

interface TicketQrCodeProps {
  value: string
  size?: number
  className?: string
}

export function TicketQrCode({ value, size = 280, className }: TicketQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const QRCode = (await import("qrcode")).default
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "M",
        })
        if (!cancelled) setDataUrl(url)
      } catch {
        if (!cancelled) setDataUrl(null)
      }
    }
    void render()
    return () => { cancelled = true }
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-label="Generating QR code"
      />
    )
  }

  return (

    <img
      src={dataUrl}
      alt="Ticket QR code"
      width={size}
      height={size}
      className={className}
    />
  )
}
