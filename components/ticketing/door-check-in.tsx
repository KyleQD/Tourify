"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Clock,
  CloudOff,
  Copy,
  RefreshCw,
  ScanLine,
  Undo2,
} from "lucide-react"

// VEN-154..161 — productionized door operations: permission-gated stats,
// checkpoint selection, pending-unverified offline queue with idempotent
// reconciliation, reverse check-in with reason, haptics + live announcements.

import {
  enqueueOfflineScan,
  listQueuedScans,
  newClientScanId,
  pendingCount,
  reconcileQueue,
  type QueuedScan,
  type ScanTransportResult,
} from "@/lib/venue/door-check-in-state"
import { TicketQrScanner } from "./ticket-qr-scanner"

interface DoorStats {
  total: number
  checked_in: number
  capacity: number
  checkpoints: string[]
}

interface AdmissionRow {
  checkin_id: string
  checkpoint: string
  result: string
  created_at: string
  reversed_at: string | null
  reverse_reason?: string
  attendee: { buyer_name: string; buyer_email?: string }
  ticket_status: string | null
  ticket_type: string
}

type OutcomeTone = "success" | "warning" | "error" | "pending"

interface ScanOutcome {
  tone: OutcomeTone
  icon: typeof BadgeCheck
  title: string
  detail: string
}

function outcomeFor(result: any): ScanOutcome {
  if (result?.success) {
    return {
      tone: "success",
      icon: BadgeCheck,
      title: result.replayed ? "Already admitted" : "Welcome!",
      detail: `${result.buyer_name || "Guest"} · ${result.ticket_type || "Ticket"}${result.checkpoint ? ` · ${result.checkpoint}` : ""}`,
    }
  }
  switch (result?.code) {
    case "ALREADY_CHECKED_IN":
      return { tone: "warning", icon: Copy, title: "Duplicate scan", detail: result.error || "Already checked in." }
    case "WRONG_EVENT":
      return { tone: "error", icon: AlertTriangle, title: "Wrong event", detail: result.error || "Ticket is for another event." }
    case "FORBIDDEN":
      return { tone: "error", icon: Ban, title: "Not authorized", detail: "You do not have door scanning rights for this event." }
    default:
      return { tone: "error", icon: Ban, title: "Rejected", detail: result?.error || "This credential was not accepted." }
  }
}

const TONE_STYLES: Record<OutcomeTone, string> = {
  success: "border-green-600 bg-green-950/50 text-green-200",
  warning: "border-yellow-600 bg-yellow-950/40 text-yellow-200",
  error: "border-red-700 bg-red-950/50 text-red-200",
  pending: "border-sky-600 bg-sky-950/40 text-sky-200",
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern)
  } catch {
    // Haptics unsupported — visual states carry the signal.
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function DoorCheckIn({
  eventId,
  backHref,
  backLabel,
}: {
  eventId: string
  backHref?: string
  backLabel?: string
}) {
  const [stats, setStats] = useState<DoorStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [checkpoint, setCheckpoint] = useState("main")
  const [online, setOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const [manualCode, setManualCode] = useState("")
  const manualInputRef = useRef<HTMLInputElement>(null)

  // Reverse workflow state (VEN-158).
  const [canReverse, setCanReverse] = useState(false)
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([])
  const [reverseTarget, setReverseTarget] = useState<AdmissionRow | null>(null)
  const [reverseReason, setReverseReason] = useState("")
  const [reverseBusy, setReverseBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const refreshQueueCount = useCallback(() => setQueueCount(pendingCount()), [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/ticketing/check-in?event_id=${encodeURIComponent(eventId)}&by_checkpoint=1`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Stats unavailable (${res.status})`)
      }
      const payload = await res.json()
      setStats({
        total: Number(payload.total || 0),
        checked_in: Number(payload.checked_in || 0),
        capacity: Number(payload.capacity || 0),
        checkpoints: Array.isArray(payload.checkpoints) ? payload.checkpoints : [],
      })
      setStatsError(null)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Failed to load stats")
    }
  }, [eventId])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ticketing/check-in?event_id=${encodeURIComponent(eventId)}&recent=1&include_reversed=1`,
        { credentials: "include", cache: "no-store" },
      )
      if (!res.ok) {
        setCanReverse(false)
        setAdmissions([])
        return
      }
      const payload = await res.json()
      setCanReverse(true)
      setAdmissions(Array.isArray(payload.admissions) ? payload.admissions : [])
    } catch {
      setCanReverse(false)
    }
  }, [eventId])

  useEffect(() => {
    void fetchStats()
    void loadRecent()
    const interval = setInterval(() => void fetchStats(), 10_000)
    return () => clearInterval(interval)
  }, [fetchStats, loadRecent])

  // Restore per-event checkpoint preference.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`tourify.door.checkpoint.${eventId}`)
      if (saved) setCheckpoint(saved)
    } catch {
      // ignore
    }
  }, [eventId])

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => {
      setOnline(true)
      void reconcile()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [eventId, reconcile])

  // Reconcile pending scans when connectivity returns or on mount.
  const reconcile = useCallback(async () => {
    if (!navigator.onLine || pendingCount() === 0) return
    const transport = async (scan: QueuedScan): Promise<ScanTransportResult> => {
      try {
        const body =
          scan.mode === "sale_id"
            ? { sale_id: scan.token, event_id: scan.eventId, checkpoint: scan.checkpoint, client_scan_id: scan.clientScanId }
            : { qr_code: scan.token, event_id: scan.eventId, checkpoint: scan.checkpoint, client_scan_id: scan.clientScanId }
        const res = await fetch("/api/ticketing/check-in", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const payload = await res.json().catch(() => ({}))
        return { ok: res.ok, httpStatus: res.status, code: payload.code, message: payload.error, checkinId: payload.checkin_id }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "Network error" }
      }
    }

    const result = await reconcileQueue(transport)
    refreshQueueCount()
    if (result.reconciled > 0) {
      void fetchStats()
      void loadRecent()
    }
    if (result.failed === 0 && result.reconciled > 0) {
      setOutcome({
        tone: "success",
        icon: CloudOff,
        title: `Synced ${result.reconciled} queued scan${result.reconciled === 1 ? "" : "s"}`,
        detail: "Offline results are now verified.",
      })
    }
  }, [fetchStats, loadRecent, refreshQueueCount])

  useEffect(() => {
    const interval = setInterval(() => {
      if (online) void reconcile()
    }, 15_000)
    return () => clearInterval(interval)
  }, [online, reconcile])

  const submitScan = useCallback(
    async (codeOrId: string, opts?: { clientScanId?: string }) => {
      const trimmed = codeOrId.trim()
      if (!trimmed || processing) return
      setProcessing(true)
      setNotice(null)
      const clientScanId = opts?.clientScanId || newClientScanId()
      const mode: 'qr' | 'sale_id' = UUID_RE.test(trimmed) ? 'sale_id' : 'qr'

      if (!navigator.onLine) {
        // VEN-156 — pending-unverified, never success.
        enqueueOfflineScan({ eventId, checkpoint, token: trimmed, clientScanId, mode })
        refreshQueueCount()
        vibrate([40, 60, 40])
        setOutcome({
          tone: "pending",
          icon: Clock,
          title: "Pending verification",
          detail: "Saved on this device. It becomes final when the connection returns.",
        })
        setProcessing(false)
        manualInputRef.current?.focus()
        return
      }

      try {
        const body =
          mode === 'sale_id'
            ? { sale_id: trimmed, event_id: eventId, checkpoint, client_scan_id: clientScanId }
            : { qr_code: trimmed, event_id: eventId, checkpoint, client_scan_id: clientScanId }
        const res = await fetch("/api/ticketing/check-in", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const result = await res.json().catch(() => ({}))
        const mapped = outcomeFor(res.ok ? { success: true, ...result } : result)
        vibrate(mapped.tone === "success" ? 80 : mapped.tone === "warning" ? [60, 60, 60] : 220)
        setOutcome(mapped)
        if (!res.ok && mapped.tone === "error" && !res.status) {
          // Network-level failure mid-flight — queue for reconciliation.
          enqueueOfflineScan({ eventId, checkpoint, token: trimmed, clientScanId, mode })
          refreshQueueCount()
        }
        if (mapped.tone !== "error") {
          void fetchStats()
          void loadRecent()
        }
      } catch {
        enqueueOfflineScan({ eventId, checkpoint, token: trimmed, clientScanId, mode })
        refreshQueueCount()
        vibrate([40, 60, 40])
        setOutcome({
          tone: "pending",
          icon: Clock,
          title: "Pending verification",
          detail: "Network dropped mid-scan. Saved and will reconcile automatically.",
        })
      } finally {
        setProcessing(false)
        manualInputRef.current?.focus()
      }
    },
    [checkpoint, eventId, fetchStats, loadRecent, processing, refreshQueueCount],
  )

  const reverseAdmission = async () => {
    if (!reverseTarget) return
    const reason = reverseReason.trim()
    if (reason.length < 4) {
      setNotice("Reversal needs a reason (at least 4 characters).")
      return
    }
    setReverseBusy(true)
    try {
      const res = await fetch("/api/ticketing/check-in", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reverse: true, checkin_id: reverseTarget.checkin_id, reason }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Reverse failed")
      setNotice(`Reversed admission at ${reverseTarget.checkpoint}.`)
      setReverseTarget(null)
      setReverseReason("")
      void Promise.all([fetchStats(), loadRecent()])
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Reverse failed")
    } finally {
      setReverseBusy(false)
    }
  }

  const pct = stats && stats.total > 0 ? Math.min(100, Math.round((stats.checked_in / stats.total) * 100)) : 0

  return (
    <div className="space-y-5">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" />
          {backLabel || "Back"}
        </Link>
      )}

      {/* Header: identity + connectivity */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-zinc-300">
          <ScanLine className="h-4 w-4 text-emerald-400" />
          Door station{checkpoint !== "main" ? ` · ${checkpoint}` : ""}
        </p>
        <p
          role="status"
          className={`rounded-full border px-3 py-1 text-xs ${
            online ? "border-emerald-700 text-emerald-300" : "border-orange-600 text-orange-300"
          }`}
        >
          {online ? "Online" : "Offline"}
          {queueCount > 0 ? ` · ${queueCount} pending` : ""}
        </p>
      </div>

      {/* Stats */}
      {statsError ? (
        <div className="flex items-center justify-between rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          <span>{statsError}</span>
          <Button size="sm" variant="outline" onClick={() => void fetchStats()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />Retry
          </Button>
        </div>
      ) : !stats ? (
        <div className="h-16 animate-pulse rounded-md bg-zinc-800" aria-label="Loading stats" />
      ) : (
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-300">
              {stats.checked_in} / {stats.total} checked in
            </span>
            <span className="text-zinc-500">{pct}%</span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Checked-in progress"
          >
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Checkpoint picker (VEN-159) */}
      {stats && stats.checkpoints.length > 0 && (
        <div className="space-y-1">
          <label htmlFor="door-checkpoint" className="text-xs uppercase tracking-wide text-zinc-500">
            Checkpoint
          </label>
          <select
            id="door-checkpoint"
            value={checkpoint}
            onChange={(e) => {
              setCheckpoint(e.target.value)
              try {
                window.localStorage.setItem(`tourify.door.checkpoint.${eventId}`, e.target.value)
              } catch {
                // ignore
              }
            }}
            className="h-11 w-full rounded-md border border-zinc-700 bg-gray-800 px-3 text-sm sm:w-64"
          >
            {stats.checkpoints.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Result card with live announcement */}
      <div aria-live="polite" role="status">
        {outcome &&
          (() => {
            const Icon = outcome.icon
            return (
              <div className={`flex items-start gap-3 rounded-lg border p-4 ${TONE_STYLES[outcome.tone]}`}>
                <Icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold">{outcome.title}</p>
                  <p className="break-words text-sm opacity-90">{outcome.detail}</p>
                </div>
              </div>
            )
          })()}
      </div>

      {/* Scanner */}
      {!outcome || outcome.tone === "pending" ? (
        <TicketQrScanner disabled={processing} onScan={(value) => void submitScan(value)} />
      ) : (
        <Button variant="outline" className="min-h-11 w-full border-zinc-700" onClick={() => setOutcome(null)}>
          Scan next ticket
        </Button>
      )}

      {/* Manual entry */}
      <div className="flex gap-2">
        <Input
          ref={manualInputRef}
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void submitScan(manualCode)
              setManualCode("")
            }
          }}
          placeholder="Manual code / ticket ID"
          aria-label="Manual entry code"
          className="bg-gray-800 border-gray-700"
        />
        <Button
          className="min-h-11"
          onClick={() => {
            void submitScan(manualCode)
            setManualCode("")
          }}
          disabled={processing || !manualCode.trim()}
        >
          Check In
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-300">
          {notice}
        </p>
      )}

      {/* Reverse workflow (VEN-158) — only renders when permitted */}
      {canReverse && (
        <section aria-label="Recent admissions" className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-200">Recent admissions</h3>
          {admissions.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
              No admissions yet at this event.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-x-auto rounded-md border border-zinc-800 text-sm">
              {admissions.map((row) => (
                <li key={row.checkin_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-100">
                      {row.attendee.buyer_name}
                      {row.reversed_at ? " · reversed" : ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {row.ticket_type} · {row.checkpoint} ·{" "}
                      {new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {row.reversed_at && row.reverse_reason ? ` · ${row.reverse_reason}` : ""}
                    </p>
                  </div>
                  {!row.reversed_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-red-800 text-red-300"
                      onClick={() => setReverseTarget(row)}
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                      Reverse
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Reverse confirmation dialog */}
      {reverseTarget && (
        <div role="alertdialog" aria-label="Confirm reversal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-zinc-700 bg-gray-900 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Reverse this check-in?</h2>
            <p className="text-sm text-zinc-400">
              {reverseTarget.attendee.buyer_name} · {reverseTarget.ticket_type} · {reverseTarget.checkpoint}. The ticket
              returns to valid and the attendee must be scanned again.
            </p>
            <label htmlFor="reverse-reason" className="block text-sm text-zinc-300">
              Reason (required, audited)
            </label>
            <textarea
              id="reverse-reason"
              rows={3}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Wrong ticket scanned at gate…"
              className="w-full rounded-md border border-zinc-700 bg-gray-800 p-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-700" onClick={() => setReverseTarget(null)} disabled={reverseBusy}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void reverseAdmission()} disabled={reverseBusy}>
                {reverseBusy ? "Reversing…" : "Reverse check-in"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
