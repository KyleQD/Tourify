"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { CheckCircle, XCircle, Users, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TicketQrScanner } from "@/components/ticketing/ticket-qr-scanner"
import { OFFLINE_CHECK_IN_RESULT } from "@/lib/venue/door-check-in-state"

interface CheckInResult {
  success: boolean
  message?: string
  error?: string
  code?: string
  buyer_name?: string
  ticket_type?: string
  event_title?: string
  guest_type?: "staff" | "public"
  checkin_id?: string
}

interface Stats {
  total: number
  checked_in: number
  capacity: number
}

interface DoorCheckInProps {
  eventId: string
  backHref: string
  backLabel?: string
}

export function DoorCheckIn({ eventId, backHref, backLabel = "Back" }: DoorCheckInProps) {
  const [manualCode, setManualCode] = useState("")
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, checked_in: 0, capacity: 0 })
  const [isOnline, setIsOnline] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/ticketing/check-in?event_id=${eventId}`, { credentials: "include" })
      if (res.ok) setStats(await res.json())
    } catch {
      /* ignore */
    }
  }, [eventId])

  useEffect(() => {
    void fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [fetchStats])

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine)
    updateConnection()
    window.addEventListener("online", updateConnection)
    window.addEventListener("offline", updateConnection)
    return () => {
      window.removeEventListener("online", updateConnection)
      window.removeEventListener("offline", updateConnection)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [result])

  async function submitCheckIn(codeOrId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId.trim())
    const body = isUuid
      ? { sale_id: codeOrId.trim(), event_id: eventId }
      : { qr_code: codeOrId.trim(), event_id: eventId }

    const res = await fetch("/api/ticketing/check-in", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async function checkIn(codeOrId: string) {
    if (!codeOrId.trim() || processing) return
    setProcessing(true)

    try {
      if (!navigator.onLine) {
        setResult(OFFLINE_CHECK_IN_RESULT)
        return
      }

      const data = await submitCheckIn(codeOrId)
      setResult(data)
      setManualCode("")
      if (data.success) void fetchStats()
      if (clearTimer.current) window.clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setResult(null), 4000)
    } finally {
      setProcessing(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const pct = stats.total > 0 ? Math.round((stats.checked_in / stats.total) * 100) : 0

  return (
    <div className="flex min-h-[70vh] flex-col rounded-md border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/70 px-4 py-3">
        <Button variant="ghost" size="sm" className="h-8 text-zinc-400" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-300" />
          <span className="text-sm font-medium text-white">
            {stats.checked_in} / {stats.total} checked in
          </span>
          {!isOnline ? <span className="text-sm text-amber-300">Offline — scans paused</span> : null}
          {stats.capacity > 0 ? <span className="text-sm text-zinc-400">({pct}%)</span> : null}
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400" onClick={() => void fetchStats()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {stats.total > 0 ? (
        <div className="h-1.5 bg-zinc-800">
          <div
            className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 text-sm text-zinc-400">
          <span>No tickets sold for this event yet.</span>
          <Button variant="outline" size="sm" className="h-7 border-zinc-700 text-zinc-200" asChild>
            <Link href={`/admin/dashboard/events/${eventId}?tab=tickets`}>Open tickets</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
        {result ? (
          <div
            className={`w-full max-w-md rounded-md border-2 p-6 text-center transition-all ${
              result.success
                ? "border-green-500/60 bg-green-950/50"
                : result.code === "ALREADY_CHECKED_IN"
                  ? "border-yellow-500/60 bg-yellow-950/50"
                  : result.code === "OFFLINE"
                    ? "border-amber-500/60 bg-amber-950/50"
                  : "border-red-500/60 bg-red-950/50"
            }`}
          >
            {result.success ? (
              <>
                <CheckCircle className="mx-auto mb-3 h-16 w-16 text-green-400" />
                <p className="mb-1 text-3xl font-bold text-white">Welcome!</p>
                <p className="text-lg font-medium text-green-300">{result.buyer_name}</p>
                <p className="mt-1 text-sm text-green-400/70">{result.ticket_type}</p>
              </>
            ) : (
              <>
                <XCircle
                  className={`mx-auto mb-3 h-16 w-16 ${
                    result.code === "ALREADY_CHECKED_IN" || result.code === "OFFLINE"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                />
                <p
                  className={`mb-1 text-xl font-bold ${
                    result.code === "ALREADY_CHECKED_IN" ? "text-yellow-300" : "text-red-300"
                  }`}
                >
                  {result.code === "ALREADY_CHECKED_IN"
                    ? "Already Checked In"
                    : result.code === "OFFLINE"
                      ? "Connection Required"
                      : "Invalid Ticket"}
                </p>
                {result.buyer_name ? <p className="text-sm text-zinc-300">{result.buyer_name}</p> : null}
                <p
                  className={`mt-1 text-sm ${
                    result.code === "ALREADY_CHECKED_IN" ? "text-yellow-400/70" : "text-red-400/70"
                  }`}
                >
                  {result.error}
                </p>
              </>
            )}
          </div>
        ) : (
          <TicketQrScanner disabled={processing} onScan={(value) => void checkIn(value)} />
        )}

        <div className="w-full max-w-md space-y-3">
          <p className="text-center text-xs uppercase tracking-wider text-zinc-500">Manual Entry</p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void checkIn(manualCode)
              }}
              placeholder="Paste QR credential or ticket ID..."
              className="flex-1 border-zinc-700 bg-zinc-900 font-mono text-sm text-white"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Button
              onClick={() => void checkIn(manualCode)}
              disabled={!manualCode.trim() || processing}
              className="shrink-0 border-0 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {processing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Check In"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
