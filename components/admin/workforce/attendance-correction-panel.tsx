"use client"

import { useCallback, useEffect, useState } from "react"
import { ClipboardEdit, Plus, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

type EntryType = "check_in" | "check_out" | "manual_correction"

interface AttendanceEntry {
  id: string
  shiftId: string
  workerId: string
  eventId: string
  entryType: EntryType
  recordedAt: string
  correctionReason: string | null
  approvedBy: string | null
  source: string
  auditEntry: string | null
  createdAt: string
}

interface AttendanceResponse {
  entries: AttendanceEntry[]
  total: number
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  check_in: "Check In",
  check_out: "Check Out",
  manual_correction: "Manual Correction",
}

const ENTRY_TYPE_BADGE: Record<EntryType, string> = {
  check_in: "bg-green-500/20 text-green-300 border-green-500/30",
  check_out: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  manual_correction: "bg-orange-500/20 text-orange-300 border-orange-500/30",
}

/**
 * w12-attendance-corrections
 * WORK-601 — Audited actual-time and attendance correction ledger.
 * Mounts in the Scheduling tab / Roster tab on the staff page.
 */
export function AttendanceCorrectionPanel() {
  const { actingAccount, actingHeaders } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [formState, setFormState] = useState({ shiftId: "", workerId: "", eventId: "", recordedAt: "", correctionReason: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/admin/workforce/attendance?limit=50", {
        credentials: "include",
        headers: actingHeaders,
      })
      const json = (await res.json()) as AttendanceResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load attendance entries"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setEntries(json.entries ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading attendance")
      setState("error")
    }
  }, [actingHeaders])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  async function submitCorrection() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/admin/workforce/attendance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify(formState),
      })
      const json = (await res.json()) as { success?: boolean; unavailable?: boolean; error?: string }
      if (!res.ok || !json.success) {
        setSubmitError(extractErrorMsg(json, "Failed to submit correction"))
        return
      }
      setShowCorrectionForm(false)
      setFormState({ shiftId: "", workerId: "", eventId: "", recordedAt: "", correctionReason: "" })
      void load()
    } catch {
      setSubmitError("Network error submitting correction")
    } finally {
      setSubmitting(false)
    }
  }

  if (state === "idle" || state === "loading") {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading attendance ledger…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400">{unavailableReason ?? "Attendance data not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{errorMsg ?? "Failed to load attendance."}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const corrections = entries.filter((e) => e.entryType === "manual_correction")

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardEdit className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Attendance &amp; Corrections</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">
              {entries.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-slate-300 px-2"
              onClick={() => setShowCorrectionForm(!showCorrectionForm)}
            >
              <Plus className="h-3 w-3" />
              Correction
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()} title="Refresh">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {freshAt && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            Fresh at {new Date(freshAt).toLocaleTimeString()} · {corrections.length} correction(s)
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Manual correction form */}
        {showCorrectionForm && (
          <div className="border border-orange-500/30 rounded-sm bg-orange-500/5 p-3 space-y-2">
            <p className="text-xs font-medium text-orange-300 mb-2">Record Manual Correction</p>
            {(["shiftId", "workerId", "eventId"] as const).map((field) => (
              <input
                key={field}
                type="text"
                placeholder={field === "shiftId" ? "Shift ID" : field === "workerId" ? "Worker ID" : "Event ID"}
                value={formState[field]}
                onChange={(e) => setFormState((p) => ({ ...p, [field]: e.target.value }))}
                className="w-full text-xs bg-slate-800/60 border border-slate-600/50 rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500"
              />
            ))}
            <input
              type="datetime-local"
              value={formState.recordedAt}
              onChange={(e) => setFormState((p) => ({ ...p, recordedAt: e.target.value }))}
              className="w-full text-xs bg-slate-800/60 border border-slate-600/50 rounded px-2.5 py-1.5 text-slate-200"
            />
            <textarea
              placeholder="Correction reason (required)"
              value={formState.correctionReason}
              onChange={(e) => setFormState((p) => ({ ...p, correctionReason: e.target.value }))}
              rows={2}
              className="w-full text-xs bg-slate-800/60 border border-slate-600/50 rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 resize-none"
            />
            {submitError && <p className="text-xs text-red-400">{submitError}</p>}
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => void submitCorrection()} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400" onClick={() => setShowCorrectionForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No attendance entries.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3 py-2 rounded-sm bg-slate-800/30 border border-slate-700/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 truncate">
                    Worker: <span className="font-mono text-slate-400">{entry.workerId.slice(0, 8)}…</span>
                  </p>
                  {entry.correctionReason && (
                    <p className="text-[10px] text-orange-400 truncate">{entry.correctionReason}</p>
                  )}
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${ENTRY_TYPE_BADGE[entry.entryType]}`}>
                  {ENTRY_TYPE_LABELS[entry.entryType]}
                </Badge>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(entry.recordedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
