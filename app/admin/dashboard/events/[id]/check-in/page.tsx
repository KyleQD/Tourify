"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, XCircle, QrCode, Users, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CheckInResult {
  success: boolean
  message?: string
  error?: string
  code?: string
  buyer_name?: string
  ticket_type?: string
  event_title?: string
}

interface Stats {
  total: number
  checked_in: number
  capacity: number
}

export default function CheckInPage() {
  const params = useParams()
  const eventId = params.id as string

  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, checked_in: 0, capacity: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const clearTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/ticketing/check-in?event_id=${eventId}`, { credentials: 'include' })
      if (res.ok) setStats(await res.json())
    } catch {}
  }, [eventId])

  useEffect(() => {
    void fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Auto-focus the input
  useEffect(() => { inputRef.current?.focus() }, [result])

  async function checkIn(codeOrId: string) {
    if (!codeOrId.trim() || processing) return
    setProcessing(true)

    try {
      // Try as UUID (sale_id) first, then as QR code
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId.trim())
      const body = isUuid ? { sale_id: codeOrId.trim() } : { qr_code: codeOrId.trim() }

      const res = await fetch('/api/ticketing/check-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setResult(data)
      setManualCode('')

      // Refresh stats on successful check-in
      if (data.success) void fetchStats()

      // Auto-clear result after 4 seconds
      if (clearTimeout.current) window.clearTimeout(clearTimeout.current)
      clearTimeout.current = setTimeout(() => setResult(null), 4000)
    } finally {
      setProcessing(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const pct = stats.total > 0 ? Math.round((stats.checked_in / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-900/60">
        <Button variant="ghost" size="sm" className="text-slate-400 h-8" asChild>
          <Link href={`/admin/dashboard/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-400" />
          <span className="text-white font-medium text-sm">
            {stats.checked_in} / {stats.total} checked in
          </span>
          {stats.capacity > 0 && (
            <span className="text-slate-400 text-sm">({pct}%)</span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400" onClick={() => void fetchStats()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="h-1.5 bg-slate-800">
          <div
            className="h-1.5 bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Main scan area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">

        {/* Result feedback */}
        {result && (
          <div className={`w-full max-w-md rounded-2xl p-6 text-center border-2 transition-all ${
            result.success
              ? 'bg-green-950/50 border-green-500/60'
              : result.code === 'ALREADY_CHECKED_IN'
                ? 'bg-yellow-950/50 border-yellow-500/60'
                : 'bg-red-950/50 border-red-500/60'
          }`}>
            {result.success ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-3" />
                <p className="text-3xl font-bold text-white mb-1">Welcome!</p>
                <p className="text-green-300 text-lg font-medium">{result.buyer_name}</p>
                <p className="text-green-400/70 text-sm mt-1">{result.ticket_type}</p>
              </>
            ) : (
              <>
                <XCircle className={`h-16 w-16 mx-auto mb-3 ${result.code === 'ALREADY_CHECKED_IN' ? 'text-yellow-400' : 'text-red-400'}`} />
                <p className={`text-xl font-bold mb-1 ${result.code === 'ALREADY_CHECKED_IN' ? 'text-yellow-300' : 'text-red-300'}`}>
                  {result.code === 'ALREADY_CHECKED_IN' ? 'Already Checked In' : 'Invalid Ticket'}
                </p>
                {result.buyer_name && <p className="text-slate-300 text-sm">{result.buyer_name}</p>}
                <p className={`text-sm mt-1 ${result.code === 'ALREADY_CHECKED_IN' ? 'text-yellow-400/70' : 'text-red-400/70'}`}>
                  {result.error}
                </p>
              </>
            )}
          </div>
        )}

        {/* Scan icon when idle */}
        {!result && (
          <div className="text-center">
            <QrCode className="h-24 w-24 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Ready to scan</p>
            <p className="text-slate-600 text-sm mt-1">Point a QR scanner at the camera or enter a ticket code below</p>
          </div>
        )}

        {/* Manual entry */}
        <div className="w-full max-w-md space-y-3">
          <p className="text-slate-500 text-xs text-center uppercase tracking-wider">Manual Entry</p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void checkIn(manualCode) }}
              placeholder="Paste QR code or ticket ID..."
              className="bg-slate-800/50 border-slate-700/50 text-white font-mono text-sm flex-1"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Button
              onClick={() => void checkIn(manualCode)}
              disabled={!manualCode.trim() || processing}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 shrink-0"
            >
              {processing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Check In'}
            </Button>
          </div>
          <p className="text-slate-600 text-xs text-center">Press Enter or click Check In · Auto-clears in 4 seconds</p>
        </div>
      </div>
    </div>
  )
}
