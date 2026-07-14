"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, XCircle, QrCode, Users, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TicketQrScanner } from "@/components/ticketing/ticket-qr-scanner"

interface CheckInResult {
  success: boolean
  message?: string
  error?: string
  code?: string
  buyer_name?: string
  ticket_type?: string
  event_title?: string
  guest_type?: 'staff' | 'public'
  checkin_id?: string
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
  const [queuedScans, setQueuedScans] = useState(0)
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

  useEffect(() => {
    const key = `tourify-check-in-queue-${eventId}`
    const readQueue = () => {
      const rows = JSON.parse(window.localStorage.getItem(key) || '[]') as string[]
      setQueuedScans(rows.length)
      return rows
    }

    async function flushQueue() {
      if (!navigator.onLine) return
      const rows = readQueue()
      if (rows.length === 0) return
      const remaining: string[] = []
      for (const code of rows) {
        try {
          await submitCheckIn(code)
        } catch {
          remaining.push(code)
        }
      }
      window.localStorage.setItem(key, JSON.stringify(remaining))
      setQueuedScans(remaining.length)
      if (remaining.length === 0) void fetchStats()
    }

    readQueue()
    window.addEventListener('online', flushQueue)
    void flushQueue()

    return () => window.removeEventListener('online', flushQueue)
  }, [eventId, fetchStats])

  // Auto-focus the input
  useEffect(() => { inputRef.current?.focus() }, [result])

  async function submitCheckIn(codeOrId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId.trim())
    const body = isUuid ? { sale_id: codeOrId.trim(), event_id: eventId } : { qr_code: codeOrId.trim(), event_id: eventId }

    const res = await fetch('/api/ticketing/check-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    return res.json()
  }

  async function checkIn(codeOrId: string) {
    if (!codeOrId.trim() || processing) return
    setProcessing(true)

    try {
      if (!navigator.onLine) {
        const key = `tourify-check-in-queue-${eventId}`
        const rows = JSON.parse(window.localStorage.getItem(key) || '[]') as string[]
        window.localStorage.setItem(key, JSON.stringify([...rows, codeOrId.trim()]))
        setQueuedScans(rows.length + 1)
        setManualCode('')
        setResult({ success: true, message: 'Scan queued for sync', buyer_name: 'Offline scan' })
        return
      }

      const data = await submitCheckIn(codeOrId)
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
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-3 backdrop-blur-xl">
        <Button variant="ghost" size="sm" className="h-8 text-slate-400" asChild>
          <Link href={`/admin/dashboard/events/${eventId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />Back to hub
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-300" />
          <span className="text-sm font-medium text-white">
            {stats.checked_in} / {stats.total} checked in
          </span>
          {queuedScans > 0 && (
            <span className="text-sm text-amber-300">{queuedScans} queued offline</span>
          )}
          {stats.capacity > 0 && (
            <span className="text-sm text-slate-400">({pct}%)</span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400" onClick={() => void fetchStats()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {stats.total > 0 && (
        <div className="h-1.5 bg-slate-800">
          <div
            className="h-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
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
                {result.guest_type && <p className="text-green-400/70 text-xs mt-1 uppercase">{result.guest_type}</p>}
                {result.checkin_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-slate-600 text-slate-200"
                    disabled={processing}
                    onClick={async () => {
                      setProcessing(true)
                      try {
                        const res = await fetch('/api/ticketing/check-in', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            reverse: true,
                            checkin_id: result.checkin_id,
                            reason: 'scanner_reversal',
                          }),
                        })
                        const data = await res.json()
                        setResult(data.success
                          ? { success: true, message: 'Check-in reversed', buyer_name: result.buyer_name }
                          : { success: false, error: data.error || 'Reverse failed', code: data.code })
                        void fetchStats()
                      } finally {
                        setProcessing(false)
                      }
                    }}
                  >
                    Reverse check-in
                  </Button>
                )}
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

        {/* Camera scanner */}
        {!result && (
          <TicketQrScanner
            disabled={processing}
            onScan={(value) => void checkIn(value)}
          />
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
              placeholder="Paste QR credential or ticket ID..."
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
