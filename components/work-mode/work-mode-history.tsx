"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { AlertCircle, CalendarDays, History as HistoryIcon, RefreshCw, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  WorkModeApiResponse,
  WorkModeHistoryEvaluation,
  WorkModeHistoryItem,
  WorkModeHistoryPayload,
} from "@/types/hiring-roster-work-mode"

function formatDateTime(value: string | null): string {
  if (!value) return "Time to be announced"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function statusLabel(status: WorkModeHistoryItem["status"]): string {
  if (status === "completed") return "Completed"
  if (status === "cancelled") return "Cancelled"
  if (status === "declined") return "Declined"
  if (status === "active") return "Active"
  if (status === "confirmed") return "Confirmed"
  return "Invited"
}

function statusClass(status: WorkModeHistoryItem["status"]): string {
  if (status === "completed") return "border-indigo-400/40 bg-indigo-400/10 text-indigo-200"
  if (status === "active") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
  if (status === "confirmed") return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
  if (status === "cancelled") return "border-rose-400/40 bg-rose-500/10 text-rose-200"
  if (status === "declined") return "border-slate-500/40 bg-slate-500/10 text-slate-300"
  return "border-amber-400/40 bg-amber-400/10 text-amber-200"
}

function formatNumber(value: number | null, digits = 1): string | null {
  if (value === null || Number.isNaN(value)) return null
  return value.toFixed(digits)
}

function EvaluationSummary({ evaluation }: { evaluation: WorkModeHistoryEvaluation }) {
  if (evaluation.source !== "staff_performance_metrics") {
    return (
      <p className="text-sm text-slate-400">
        No evaluation has been recorded for this job. Evaluations appear after your employer
        reviews the shift.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
      {evaluation.attendanceRate !== null ? (
        <span>
          Attendance <span className="font-medium text-slate-100">{formatNumber(evaluation.attendanceRate, 0)}%</span>
        </span>
      ) : null}
      {evaluation.performanceRating !== null ? (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <span className="font-medium text-slate-100">{formatNumber(evaluation.performanceRating)}/5</span>
          <span className="text-slate-400">performance</span>
        </span>
      ) : null}
      {evaluation.supervisorRating !== null ? (
        <span>
          Supervisor <span className="font-medium text-slate-100">{formatNumber(evaluation.supervisorRating)}/5</span>
        </span>
      ) : null}
      {evaluation.customerFeedbackScore !== null ? (
        <span>
          Customer feedback <span className="font-medium text-slate-100">{formatNumber(evaluation.customerFeedbackScore)}/5</span>
        </span>
      ) : null}
      {evaluation.commendationsCount !== null && evaluation.commendationsCount > 0 ? (
        <span>
          {evaluation.commendationsCount} commendation{evaluation.commendationsCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  )
}

function HistoryItemCard({ item }: { item: WorkModeHistoryItem }) {
  const employerLine = [
    item.organizationName,
    item.venueName,
    item.eventTitle ? `Event: ${item.eventTitle}` : null,
  ].filter((value): value is string => Boolean(value))
  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-slate-100">{item.roleTitle}</CardTitle>
            <CardDescription className="mt-1">
              {employerLine.length > 0 ? employerLine.join(" · ") : "Employer details not published"}
            </CardDescription>
            {item.department ? (
              <CardDescription>{item.department}</CardDescription>
            ) : null}
          </div>
          <Badge variant="outline" className={statusClass(item.status)}>
            {statusLabel(item.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-slate-300">
          <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>
            {formatDateTime(item.startsAt)}
            {item.endsAt ? ` — ${formatDateTime(item.endsAt)}` : ""}
          </span>
        </p>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance</p>
          {item.attendance.source === "worker_actions" ? (
            <p className="mt-1 text-sm text-slate-300">
              {item.attendance.checkIns} check-in{item.attendance.checkIns === 1 ? "" : "s"} ·{" "}
              {item.attendance.checkOuts} check-out{item.attendance.checkOuts === 1 ? "" : "s"}
              {item.attendance.lastCheckInAt
                ? ` · last in ${new Date(item.attendance.lastCheckInAt).toLocaleString()}`
                : ""}
            </p>
          ) : item.attendance.shiftStatus ? (
            <p className="mt-1 text-sm text-slate-300">
              Shift status: <span className="font-medium text-slate-100">{item.attendance.shiftStatus}</span>
              {!item.attendance.workerActionsAvailable
                ? " · timed check-in/out appears once worker actions are enabled."
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
              No attendance recorded{!item.attendance.workerActionsAvailable
                ? "; timed check-in/out is gated on the reviewed worker-actions schema."
                : "."}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evaluation</p>
          <div className="mt-1">
            <EvaluationSummary evaluation={item.evaluation} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkModeHistory() {
  const [data, setData] = useState<WorkModeHistoryPayload | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const requestSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    setStatus("loading")
    try {
      const response = await fetch("/api/work-mode/history", {
        credentials: "include",
        cache: "no-store",
      })
      const payload = (await response.json()) as WorkModeApiResponse<WorkModeHistoryPayload> | null
      if (!response.ok || !payload?.data) throw new Error(payload?.error || "Work history is unavailable")
      if (sequence !== requestSequence.current) return
      setData(payload.data)
      setStatus("ready")
    } catch {
      if (sequence !== requestSequence.current) return
      setData(null)
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    void load()
    return () => { requestSequence.current += 1 }
  }, [load])

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading work history">
        <Skeleton className="h-28 bg-slate-800" />
        <Skeleton className="h-28 bg-slate-800" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <Card className="border-dashed border-slate-700 bg-slate-900/60">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-rose-100">Work history is temporarily unavailable</p>
              <p className="text-sm text-slate-400">Your jobs, attendance, and evaluations could not be loaded.</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const upcoming = data?.upcoming ?? []
  const completed = data?.completed ?? []
  const isEmpty = upcoming.length === 0 && completed.length === 0

  if (isEmpty) {
    return (
      <Card className="border-dashed border-slate-700 bg-slate-900/60">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
            <HistoryIcon className="h-5 w-5 text-slate-300" aria-hidden="true" />
          </div>
          <CardTitle className="text-slate-100">No work history yet</CardTitle>
          <CardDescription className="text-slate-400">
            Jobs you accept, complete, cancel, or decline will appear here with your attendance and
            evaluation state. Nothing has been invented or filled with sample data.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming-jobs-heading">
          <h2 id="upcoming-jobs-heading" className="mb-3 text-lg font-semibold text-slate-100">
            Upcoming jobs
          </h2>
          <div className="grid gap-3">
            {upcoming.map((item) => <HistoryItemCard key={item.id} item={item} />)}
          </div>
        </section>
      ) : null}
      <section aria-labelledby="past-jobs-heading">
        <h2 id="past-jobs-heading" className="mb-3 text-lg font-semibold text-slate-100">
          Past jobs
        </h2>
        {completed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700/80 px-4 py-6 text-sm text-slate-400">
            Completed, cancelled, and declined jobs will appear here after your shifts close.
          </p>
        ) : (
          <div className="grid gap-3">
            {completed.map((item) => <HistoryItemCard key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </div>
  )
}