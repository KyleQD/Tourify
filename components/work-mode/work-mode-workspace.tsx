"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react"

import { useWorkMode } from "@/hooks/use-work-mode"
import {
  WORK_MODE_PRIMARY_VIEWS,
  WORK_MODE_SECONDARY_VIEWS,
  type WorkModeView,
} from "@/lib/work-mode/navigation"
import { trackUxEvent } from "@/lib/ux/client-telemetry"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  WorkModeAssignmentListItem,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"
import type { WorkerTask, WorkHubPayload } from "@/types/work-hub"

interface WorkModeWorkspaceProps {
  view: WorkModeView
  initialAssignmentId: string | null
}

function formatDateTime(value: string | null, timeZone?: string | null): string {
  if (!value) return "Schedule pending"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Time unavailable"
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
  if (timeZone) {
    options.timeZone = timeZone
  }
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

function statusClass(status: WorkModeAssignmentListItem["status"]): string {
  if (status === "active") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
  if (status === "confirmed") return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
  return "border-amber-400/40 bg-amber-400/10 text-amber-200"
}

function UnavailablePanel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="border-dashed border-slate-700 bg-slate-900/60">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
          <AlertCircle className="h-5 w-5 text-slate-300" aria-hidden="true" />
        </div>
        <CardTitle className="text-slate-100">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function PlanField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg bg-slate-800/70 p-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-1 font-medium text-slate-100">{value || "Not shared yet"}</dd>
    </div>
  )
}

function PublicationList({
  publications,
  emptyMessage,
  onAcknowledge,
  acknowledgingId,
}: {
  publications: WorkModePublication[]
  emptyMessage: string
  onAcknowledge?: (publicationId: string) => void
  acknowledgingId?: string | null
}) {
  if (publications.length === 0) {
    return <UnavailablePanel title="Nothing published yet" description={emptyMessage} />
  }

  return (
    <div className="grid gap-3">
      {publications.map((publication) => (
        <Card key={publication.id} className="border-slate-800 bg-slate-900/70">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-100">{publication.title}</p>
                <Badge variant="outline" className="border-slate-700 text-slate-300">
                  {publication.publicationType.replaceAll("_", " ")}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Published {formatDateTime(publication.publishedAt)} · Version {publication.version}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {publication.href ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={publication.href}>
                    Open
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
              {onAcknowledge && publication.requiresAcknowledgement && !publication.acknowledgedAt ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAcknowledge(publication.id)}
                  disabled={acknowledgingId === publication.id}
                >
                  {acknowledgingId === publication.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Acknowledge
                </Button>
              ) : publication.requiresAcknowledgement ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
                  Acknowledged
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function WorkModeWorkspace({
  view,
  initialAssignmentId,
}: WorkModeWorkspaceProps) {
  const router = useRouter()
  const {
    assignments,
    publications,
    activeAssignment,
    isLoading,
    error,
    isUsingCachedSnapshot,
    lastSyncedAt,
    isOnline,
    activateWorkMode,
    confirmAssignment,
    declineAssignment,
    refreshAssignments,
    workerActionsAvailable,
    submitWorkerAction,
  } = useWorkMode()
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [workerActionId, setWorkerActionId] = useState<string | null>(null)
  const [responseMessage, setResponseMessage] = useState<string | null>(null)
  const [workTasks, setWorkTasks] = useState<WorkerTask[]>([])
  const [taskActionId, setTaskActionId] = useState<string | null>(null)
  const [blockedReasons, setBlockedReasons] = useState<Record<string, string>>({})
  const invalidAssignment =
    Boolean(initialAssignmentId) &&
    !isLoading &&
    !assignments.some((assignment) => assignment.id === initialAssignmentId)

  useEffect(() => {
    if (
      initialAssignmentId &&
      assignments.some((assignment) => assignment.id === initialAssignmentId)
    ) {
      activateWorkMode(initialAssignmentId)
    }
  }, [activateWorkMode, assignments, initialAssignmentId])

  useEffect(() => {
    trackUxEvent({
      eventName: "viewed",
      flow: "work_mode",
      route: `/work/${view}`,
      step: view,
      source: initialAssignmentId ? "assignment_link" : "navigation",
      context: { hasAssignment: Boolean(activeAssignment) },
    })
  }, [activeAssignment, initialAssignmentId, view])

  useEffect(() => {
    if (view !== "tasks") return
    let cancelled = false
    void fetch("/api/work-hub", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: WorkHubPayload }) => {
        if (cancelled) return
        const tasks = (payload.data?.engagements ?? []).flatMap((engagement) => engagement.tasks)
        setWorkTasks(tasks.filter((task) =>
          !activeAssignment ||
          (task.tourId && task.tourId === activeAssignment.tourId) ||
          (task.eventId && task.eventId === activeAssignment.eventId)
        ))
      })
      .catch(() => { if (!cancelled) setWorkTasks([]) })
    return () => { cancelled = true }
  }, [activeAssignment, view])

  const scopedPublications = useMemo(
    () =>
      activeAssignment?.eventId
        ? publications.filter((publication) => publication.eventId === activeAssignment.eventId)
        : [],
    [activeAssignment?.eventId, publications],
  )

  async function respond(assignmentId: string, action: "accept" | "decline") {
    const startedAt = performance.now()
    setRespondingId(assignmentId)
    setResponseMessage(null)
    trackUxEvent({
      eventName: "started",
      flow: "work_mode_assignment_response",
      route: `/work/${view}`,
      step: action,
    })
    trackUxEvent({
      eventName: "submitted",
      flow: "work_mode_assignment_response",
      route: `/work/${view}`,
      step: action,
    })
    try {
      const succeeded = await (action === "accept"
        ? confirmAssignment(assignmentId)
        : declineAssignment(assignmentId))
      if (succeeded) {
        setResponseMessage(
          action === "accept"
            ? "Assignment accepted. Your organizer can now see your confirmation."
            : "Assignment declined. Your organizer can now reassign the shift.",
        )
      }
      const latency = performance.now() - startedAt
      trackUxEvent({
        eventName: succeeded ? "succeeded" : "failed",
        flow: "work_mode_assignment_response",
        route: `/work/${view}`,
        step: action,
        latencyBucket:
          latency < 100
            ? "under_100ms"
            : latency < 300
              ? "100_300ms"
              : latency < 1000
                ? "300_1000ms"
                : "over_1000ms",
        errorCategory: succeeded ? undefined : "unknown",
      })
    } finally {
      setRespondingId(null)
    }
  }

  async function runWorkerAction(
    action:
      | { action: "check_in" | "check_out" }
      | { action: "acknowledge"; publicationId: string },
  ) {
    if (!activeAssignment) return
    const actionId = action.action === "acknowledge" ? action.publicationId : action.action
    setWorkerActionId(actionId)
    setResponseMessage(null)
    const succeeded = await submitWorkerAction(
      activeAssignment.id,
      action.action === "acknowledge"
        ? {
            ...action,
            clientRequestId: crypto.randomUUID(),
          }
        : {
            ...action,
            clientRequestId: crypto.randomUUID(),
            deviceOccurredAt: new Date().toISOString(),
          },
    )
    if (succeeded) {
      setResponseMessage(
        action.action === "acknowledge"
          ? "Published packet acknowledged."
          : action.action === "check_in"
            ? "Check-in recorded."
            : "Check-out recorded.",
      )
    }
    setWorkerActionId(null)
  }

  async function runTaskAction(task: WorkerTask, action: "acknowledge" | "start" | "complete" | "block") {
    const blockedReason = action === "block" ? blockedReasons[task.id]?.trim() : undefined
    if (action === "block" && !blockedReason) return
    setTaskActionId(task.id)
    setResponseMessage(null)
    try {
      const response = await fetch(`/api/work/tasks/${encodeURIComponent(task.id)}/actions`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, blockedReason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || "The task could not be updated.")
      setWorkTasks((current) => current.map((item) => item.id === task.id ? { ...item, state: action === "acknowledge" ? "acknowledged" : action === "start" ? "doing" : action === "complete" ? "done" : "blocked", blockedReason: action === "block" ? blockedReason || null : null } : item))
      if (action === "block") setBlockedReasons((current) => ({ ...current, [task.id]: "" }))
      setResponseMessage(action === "complete" ? "Task completed." : action === "block" ? "Task marked blocked." : action === "start" ? "Task started." : "Task acknowledged.")
    } catch (caught) { setResponseMessage(caught instanceof Error ? caught.message : "The task could not be updated.") }
    finally { setTaskActionId(null) }
  }

  function publicationsFor(...types: string[]) {
    return scopedPublications.filter((publication) =>
      types.includes(publication.publicationType),
    )
  }

  function openAssignment(assignmentId: string, targetView: WorkModeView = "today") {
    activateWorkMode(assignmentId)
    router.push(`/work/${targetView}?assignment=${encodeURIComponent(assignmentId)}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 text-slate-100">
        <div className="mx-auto max-w-7xl space-y-4" aria-busy="true" aria-label="Loading Work Mode">
          <Skeleton className="h-28 bg-slate-800" />
          <Skeleton className="h-14 bg-slate-800" />
          <Skeleton className="h-72 bg-slate-800" />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-800 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-300">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Work Mode</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold">
                {activeAssignment?.roleTitle ?? "Choose an assignment"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {activeAssignment
                  ? [
                      activeAssignment.eventTitle,
                      activeAssignment.department || "Crew",
                      formatDateTime(activeAssignment.startsAt, activeAssignment.timezone),
                    ].filter(Boolean).join(" · ")
                  : "Your employer-published schedule and event information appears here."}
              </p>
              {activeAssignment?.venueLabel ? (
                <p className="mt-1 text-sm text-slate-500">{activeAssignment.venueLabel}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {assignments.length > 1 ? (
                <label className="sr-only" htmlFor="work-mode-assignment">
                  Switch assignment
                </label>
              ) : null}
              {assignments.length > 1 ? (
                <select
                  id="work-mode-assignment"
                  className="h-9 max-w-56 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"
                  value={activeAssignment?.id ?? ""}
                  onChange={(event) => {
                    if (event.target.value) {
                      openAssignment(event.target.value, view === "assignments" ? "today" : view)
                    }
                  }}
                >
                  <option value="" disabled>
                    Choose assignment
                  </option>
                  {assignments
                    .filter((assignment) => assignment.status !== "completed" && assignment.status !== "cancelled")
                    .map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.roleTitle}{assignment.eventTitle ? ` — ${assignment.eventTitle}` : ""}
                      </option>
                    ))}
                </select>
              ) : null}
              {activeAssignment ? (
                <Badge variant="outline" className={statusClass(activeAssignment.status)}>
                  {activeAssignment.status}
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" className="min-h-11" onClick={refreshAssignments}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {error ? (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-rose-100">Work Mode is unavailable</p>
              <p className="text-sm text-rose-200/80">{error}</p>
            </div>
          </div>
        ) : null}

        {isUsingCachedSnapshot ? (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-amber-100">Showing your last saved event-day details</p>
              <p className="text-sm text-amber-100/80">
                {lastSyncedAt
                  ? `Saved ${formatDateTime(lastSyncedAt)}. `
                  : ""}
                Refresh when you are back online for the latest schedule and packets. Check-in and check-out always require a live confirmation.
              </p>
            </div>
          </div>
        ) : null}

        {!isOnline ? (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-amber-100">You’re offline</p>
              <p className="text-sm text-amber-100/80">
                Saved schedule and packet details remain available. Check-in and check-out will stay unavailable until you reconnect.
              </p>
            </div>
          </div>
        ) : null}

        {invalidAssignment ? (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-amber-100">Assignment unavailable</p>
              <p className="text-sm text-amber-100/80">
                This assignment is expired, cancelled, or no longer available to your account.
              </p>
            </div>
          </div>
        ) : null}

        {responseMessage ? (
          <div
            className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
            role="status"
          >
            <Check className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" />
            <p className="text-sm text-emerald-100">{responseMessage}</p>
          </div>
        ) : null}

        <nav
          className="mt-4 flex gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70 p-2"
          aria-label="Work Mode sections"
        >
          {WORK_MODE_PRIMARY_VIEWS.map((item) => {
            const Icon = item.icon
            const isActive = view === item.id
            const query = activeAssignment ? `?assignment=${activeAssignment.id}` : ""
            return (
              <Button
                key={item.id}
                asChild
                size="sm"
                variant={isActive ? "default" : "ghost"}
                className={isActive ? "min-h-11 bg-cyan-600 text-white hover:bg-cyan-500" : "min-h-11 text-slate-300"}
              >
                <Link href={`/work/${item.id}${query}`} aria-current={isActive ? "page" : undefined}>
                  <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </nav>

        {!activeAssignment ? (
          <section className="mt-5" aria-labelledby="assignment-heading">
            <h2 id="assignment-heading" className="text-lg font-semibold">
              Your assignments
            </h2>
            {assignments.length === 0 ? (
              <UnavailablePanel
                title="No active assignments"
                description="Accepted jobs and published shifts will appear here. Nothing has been invented or filled with sample data."
              />
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="border-slate-800 bg-slate-900/70">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-slate-100">{assignment.roleTitle}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {[
                              assignment.eventTitle,
                              assignment.department || "Crew",
                              formatDateTime(assignment.startsAt),
                            ].filter(Boolean).join(" · ")}
                          </CardDescription>
                          {assignment.venueLabel ? (
                            <p className="mt-1 text-sm text-slate-500">{assignment.venueLabel}</p>
                          ) : null}
                        </div>
                        <Badge variant="outline" className={statusClass(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {assignment.status === "invited" ? (
                        <>
                          <Button
                            onClick={() => respond(assignment.id, "accept")}
                            disabled={respondingId === assignment.id}
                          >
                            {respondingId === assignment.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => respond(assignment.id, "decline")}
                            disabled={respondingId === assignment.id}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => openAssignment(assignment.id)}>
                          Open assignment
                          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="mt-5" aria-live="polite">
            {view === "today" ? (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-slate-800 bg-slate-900/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <CalendarClock className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                      Assignment window
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      The schedule published by your employer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    {activeAssignment.startsAt || activeAssignment.endsAt ? (
                      <>
                        <div className="rounded-lg bg-slate-800/70 p-3">
                          <p className="text-slate-400">Call time</p>
                          <p className="mt-1 font-medium">
                            {formatDateTime(activeAssignment.startsAt, activeAssignment.timezone)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-800/70 p-3">
                          <p className="text-slate-400">Shift end</p>
                          <p className="mt-1 font-medium">
                            {formatDateTime(activeAssignment.endsAt, activeAssignment.timezone)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-700 p-3 sm:col-span-2">
                        <p className="font-medium text-slate-100">Schedule pending</p>
                        <p className="mt-1 text-slate-400">
                          Your assignment is confirmed, but your employer has not published a call time yet.
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg bg-slate-800/70 p-3 sm:col-span-2">
                      <p className="text-slate-400">Reporting location</p>
                      <p className="mt-1 font-medium">
                        {activeAssignment.venueLabel || "Location not published yet"}
                      </p>
                      {activeAssignment.timezone ? (
                        <p className="mt-1 text-xs text-slate-400">Event timezone: {activeAssignment.timezone}</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-800 bg-slate-900/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <ShieldCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                      Access
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Capabilities granted for this assignment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {Object.entries(activeAssignment.permissions)
                      .filter(([, enabled]) => enabled)
                      .map(([permission]) => (
                        <Badge key={permission} variant="secondary">
                          {permission.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    {Object.values(activeAssignment.permissions).every((enabled) => !enabled) ? (
                      <p className="text-sm text-slate-400">No additional capabilities published.</p>
                    ) : null}
                  </CardContent>
                </Card>
                {activeAssignment.sharedShiftPlan ? (
                  <Card className="border-slate-800 bg-slate-900/70 lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Shift briefing</CardTitle>
                      <CardDescription className="text-slate-400">
                        Worker-visible instructions published with this shared shift.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <PlanField label="Reporting location" value={[activeAssignment.sharedShiftPlan.reportingName, activeAssignment.sharedShiftPlan.reportingAddress].filter(Boolean).join(" · ")} />
                        <PlanField label="Directions" value={activeAssignment.sharedShiftPlan.directions} />
                        <PlanField label="Access instructions" value={activeAssignment.sharedShiftPlan.accessInstructions} />
                        <PlanField label="Supervisor" value={[activeAssignment.sharedShiftPlan.supervisorName, activeAssignment.sharedShiftPlan.supervisorContact].filter(Boolean).join(" · ")} />
                        <PlanField label="Break requirements" value={activeAssignment.sharedShiftPlan.breakRequirements || `${activeAssignment.sharedShiftPlan.breakDurationMinutes} minutes`} />
                        <PlanField label="Attire / PPE / credentials" value={activeAssignment.sharedShiftPlan.attirePpeCredentials} />
                        <PlanField label="Worker instructions" value={activeAssignment.sharedShiftPlan.workerInstructions} />
                        <PlanField label="Hazards" value={activeAssignment.sharedShiftPlan.hazards} />
                        <PlanField label="Emergency procedure" value={activeAssignment.sharedShiftPlan.emergencyProcedure} />
                        <PlanField label="Emergency contact" value={activeAssignment.sharedShiftPlan.emergencyContact} />
                        <PlanField label="Attachments" value={activeAssignment.sharedShiftPlan.attachments.length ? `${activeAssignment.sharedShiftPlan.attachments.length} shared` : null} />
                      </dl>
                    </CardContent>
                  </Card>
                ) : null}
                <Card className="border-slate-800 bg-slate-900/70 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Right now</CardTitle>
                    <CardDescription className="text-slate-400">
                      {activeAssignment.attendance.state === "checked_in"
                        ? "You are checked in. Check out when your supervisor releases you."
                        : activeAssignment.attendance.state === "checked_out"
                          ? "Your check-out has been recorded."
                          : "Review updates and complete the next required action."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {workerActionsAvailable && isOnline && activeAssignment.permissions.check_in_out && activeAssignment.attendance.state === "not_checked_in" ? (
                      <Button className="min-h-11" type="button" onClick={() => void runWorkerAction({ action: "check_in" })} disabled={workerActionId !== null}>
                        Check in
                      </Button>
                    ) : null}
                    {workerActionsAvailable && isOnline && activeAssignment.permissions.check_in_out && activeAssignment.attendance.state === "checked_in" ? (
                      <Button className="min-h-11" type="button" onClick={() => void runWorkerAction({ action: "check_out" })} disabled={workerActionId !== null}>
                        Check out
                      </Button>
                    ) : null}
                    <Button asChild variant="outline"><Link href={`/work/schedule?assignment=${activeAssignment.id}`}>View schedule</Link></Button>
                    <Button asChild variant="outline"><Link href={`/work/maps?assignment=${activeAssignment.id}`}>View map</Link></Button>
                  </CardContent>
                </Card>
                <div className="lg:col-span-2">
                  <h2 className="mb-3 text-lg font-semibold">Latest updates</h2>
                  <PublicationList
                    publications={scopedPublications.slice(0, 3)}
                    emptyMessage="Your organizer has not published an advance, day sheet, map, or broadcast."
                  />
                </div>
              </div>
            ) : null}

            {view === "assignments" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="border-slate-800 bg-slate-900/70">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-slate-100">{assignment.roleTitle}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {[
                              assignment.eventTitle,
                              assignment.department || "Crew",
                              formatDateTime(assignment.startsAt),
                            ].filter(Boolean).join(" · ")}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={statusClass(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button onClick={() => openAssignment(assignment.id)}>
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                      {assignment.status === "invited" ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => respond(assignment.id, "accept")}
                            disabled={respondingId === assignment.id}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => respond(assignment.id, "decline")}
                            disabled={respondingId === assignment.id}
                          >
                            Decline
                          </Button>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
                {assignments.length === 0 ? (
                  <UnavailablePanel
                    title="No active assignments"
                    description="Accepted jobs and published shifts will appear here."
                  />
                ) : null}
              </div>
            ) : null}

            {view === "packets" ? (
              <PublicationList
                publications={scopedPublications}
                emptyMessage="Published advances, day sheets, maps, and broadcasts will appear here."
                onAcknowledge={
                  workerActionsAvailable
                    ? (publicationId) =>
                        void runWorkerAction({ action: "acknowledge", publicationId })
                    : undefined
                }
                acknowledgingId={workerActionId}
              />
            ) : null}

            {view === "more" ? (
              <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                <Card className="border-slate-800 bg-slate-900/70">
                  <CardHeader>
                    <CardTitle className="text-slate-100">More packet views</CardTitle>
                    <CardDescription className="text-slate-400">
                      These views stay available for direct links while richer producers come online.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {WORK_MODE_SECONDARY_VIEWS.map((item) => {
                      const Icon = item.icon
                      const query = activeAssignment ? `?assignment=${activeAssignment.id}` : ""
                      return (
                        <Button key={item.id} asChild variant="outline" className="justify-start">
                          <Link href={`/work/${item.id}${query}`}>
                            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                            {item.label}
                          </Link>
                        </Button>
                      )
                    })}
                  </CardContent>
                </Card>
                <PublicationList
                  publications={scopedPublications}
                  emptyMessage="No additional work packets have been published for this assignment."
                />
              </div>
            ) : null}

            {view === "schedule" ? (
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="text-slate-100">Published schedule</CardTitle>
                  <CardDescription className="text-slate-400">
                    {activeAssignment.timezone
                      ? `Times are shown in the event timezone: ${activeAssignment.timezone}.`
                      : "Your employer has not published an event timezone."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {activeAssignment.startsAt || activeAssignment.endsAt ? (
                    <>
                      <div className="rounded-lg border border-slate-800 p-4">
                        <p className="text-sm text-slate-400">Start</p>
                        <p className="mt-1 font-medium">
                          {formatDateTime(activeAssignment.startsAt, activeAssignment.timezone)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-4">
                        <p className="text-sm text-slate-400">End</p>
                        <p className="mt-1 font-medium">
                          {formatDateTime(activeAssignment.endsAt, activeAssignment.timezone)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-700 p-4 sm:col-span-2">
                      <p className="font-medium text-slate-100">Schedule pending</p>
                      <p className="mt-1 text-sm text-slate-400">No call or end time has been published for this assignment.</p>
                    </div>
                  )}
                  {activeAssignment.schedule ? (
                    <div className="rounded-lg border border-slate-800 p-4 sm:col-span-2">
                      <p className="font-medium text-slate-100">Shift details</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {activeAssignment.schedule.date} · {activeAssignment.schedule.startTime}–{activeAssignment.schedule.endTime}
                        {activeAssignment.schedule.zone ? ` · ${activeAssignment.schedule.zone}` : ""}
                      </p>
                      {activeAssignment.schedule.notes ? (
                        <p className="mt-2 text-sm text-slate-300">{activeAssignment.schedule.notes}</p>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {view === "updates" ? (
              <PublicationList
                publications={scopedPublications}
                emptyMessage="Operational broadcasts will appear after an organizer publishes them."
                onAcknowledge={
                  workerActionsAvailable
                    ? (publicationId) =>
                        void runWorkerAction({ action: "acknowledge", publicationId })
                    : undefined
                }
                acknowledgingId={workerActionId}
              />
            ) : null}

            {view === "maps" ? (
              <PublicationList
                publications={scopedPublications.filter(
                  (publication) => publication.publicationType === "site_map",
                )}
                emptyMessage="No site map has been published for this assignment."
              />
            ) : null}

            {view === "day-sheet" ? (
              <PublicationList
                publications={scopedPublications.filter(
                  (publication) => publication.publicationType === "day_sheet",
                )}
                emptyMessage="No day sheet has been published for this assignment."
              />
            ) : null}

            {view === "tasks" ? (
              workTasks.length ? <div className="grid gap-3">{workTasks.map((task) => <Card key={task.id} className="border-slate-800 bg-slate-900/70"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-slate-100">{task.title}</CardTitle><CardDescription className="mt-1 text-slate-400">{[task.tourName, task.eventName, task.shiftTitle, task.dueAt ? `Due ${formatDateTime(task.dueAt)}` : null].filter(Boolean).join(" · ")}</CardDescription></div><Badge variant="outline" className="capitalize">{task.state.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent><p className="text-sm text-slate-300">{task.description || "No additional instructions were shared."}</p>{task.blockedReason ? <p className="mt-2 text-sm text-rose-200">Blocked: {task.blockedReason}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{task.state === "assigned" ? <Button className="min-h-11" disabled={taskActionId === task.id} onClick={() => void runTaskAction(task, "acknowledge")}><Check className="mr-2 h-4 w-4" />Acknowledge</Button> : null}{["acknowledged", "blocked"].includes(task.state) ? <Button className="min-h-11" disabled={taskActionId === task.id} onClick={() => void runTaskAction(task, "start")}><Play className="mr-2 h-4 w-4" />Start</Button> : null}{["acknowledged", "doing", "blocked"].includes(task.state) ? <Button className="min-h-11" variant="outline" disabled={taskActionId === task.id} onClick={() => void runTaskAction(task, "complete")}><Check className="mr-2 h-4 w-4" />Complete</Button> : null}{["acknowledged", "doing"].includes(task.state) ? <label className="min-w-60 flex-1 text-xs text-slate-400">Block reason<Input className="mt-1 min-h-11 border-slate-700 bg-slate-950" value={blockedReasons[task.id] ?? ""} onChange={(event) => setBlockedReasons((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="What is preventing progress?" /></label> : null}{["acknowledged", "doing"].includes(task.state) ? <Button className="min-h-11 self-end" variant="outline" disabled={taskActionId === task.id || !(blockedReasons[task.id] ?? "").trim()} onClick={() => void runTaskAction(task, "block")}><AlertCircle className="mr-2 h-4 w-4" />Block</Button> : null}</div></CardContent></Card>)}</div> : <UnavailablePanel title="No tasks assigned" description="Tour, event, and shift tasks assigned to you will appear here." />
            ) : null}
            {view === "documents" ? (
              <PublicationList
                publications={publicationsFor("document", "documents", "credential", "staff_document")}
                emptyMessage="No worker-scoped document packet has been published."
              />
            ) : null}
            {view === "travel" ? (
              <PublicationList
                publications={publicationsFor("travel", "itinerary", "lodging", "transport")}
                emptyMessage="No worker-visible itinerary has been published."
              />
            ) : null}
            {view === "pay" ? (
              <PublicationList
                publications={publicationsFor("pay", "payroll", "compensation")}
                emptyMessage="No authorized compensation statement has been published. Tourify does not estimate pay."
              />
            ) : null}
            {view === "contacts" ? (
              <PublicationList
                publications={publicationsFor("contacts", "crew_contacts", "contact_sheet")}
                emptyMessage="No assignment-scoped contact sheet has been published."
              />
            ) : null}
            {view === "check-in" ? (
              !isOnline ? (
                <UnavailablePanel
                  title="You’re offline"
                  description="Check-in and check-out are not queued. Reconnect and use Refresh before recording attendance."
                />
              ) : workerActionsAvailable && activeAssignment.permissions.check_in_out ? (
                <Card className="border-slate-800 bg-slate-900/70">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Assignment attendance</CardTitle>
                    <CardDescription className="text-slate-400">
                      Record an append-only check-in or check-out event. Your device time is
                      submitted for reconciliation; the server time is authoritative.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {activeAssignment.attendance.state === "not_checked_in" ? (
                      <Button
                        className="min-h-11"
                        type="button"
                        onClick={() => void runWorkerAction({ action: "check_in" })}
                        disabled={workerActionId !== null}
                      >
                        {workerActionId === "check_in" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        Check in
                      </Button>
                    ) : null}
                    {activeAssignment.attendance.state === "checked_in" ? (
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        onClick={() => void runWorkerAction({ action: "check_out" })}
                        disabled={workerActionId !== null}
                      >
                        {workerActionId === "check_out" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        Check out
                      </Button>
                    ) : null}
                    {activeAssignment.attendance.state === "checked_out" ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">Checked out</Badge>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <UnavailablePanel
                  title="Check-in is unavailable"
                  description={
                    !activeAssignment.permissions.check_in_out
                      ? "Your employer has not granted check-in access for this assignment."
                      : "The reviewed worker-actions SQL must be applied and verified before check-in is enabled."
                  }
                />
              )
            ) : null}
          </section>
        )}
      </div>
    </main>
  )
}
