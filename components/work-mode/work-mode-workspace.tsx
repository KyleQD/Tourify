"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react"

import { useWorkMode } from "@/hooks/use-work-mode"
import { WORK_MODE_VIEWS, type WorkModeView } from "@/lib/work-mode/navigation"
import { trackUxEvent } from "@/lib/ux/client-telemetry"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  WorkModeAssignmentListItem,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"

interface WorkModeWorkspaceProps {
  view: WorkModeView
  initialAssignmentId: string | null
}

function formatDateTime(value: string | null): string {
  if (!value) return "Time not published"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Time unavailable"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
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
                Published {formatDateTime(publication.publishedAt)}
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
              {onAcknowledge ? (
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
  const {
    assignments,
    publications,
    activeAssignment,
    isLoading,
    error,
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

  function publicationsFor(...types: string[]) {
    return scopedPublications.filter((publication) =>
      types.includes(publication.publicationType),
    )
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
        <header className="rounded-xl border border-cyan-400/20 bg-slate-900/80 p-5 shadow-sm">
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
                  ? `${activeAssignment.department || "Crew"} · ${formatDateTime(activeAssignment.startsAt)}`
                  : "Your employer-published schedule and event information appears here."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeAssignment ? (
                <Badge variant="outline" className={statusClass(activeAssignment.status)}>
                  {activeAssignment.status}
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" onClick={refreshAssignments}>
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
          {WORK_MODE_VIEWS.map((item) => {
            const Icon = item.icon
            const isActive = view === item.id
            const query = activeAssignment ? `?assignment=${activeAssignment.id}` : ""
            return (
              <Button
                key={item.id}
                asChild
                size="sm"
                variant={isActive ? "default" : "ghost"}
                className={isActive ? "bg-cyan-600 text-white hover:bg-cyan-500" : "text-slate-300"}
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
                            {assignment.department || "Crew"} · {formatDateTime(assignment.startsAt)}
                          </CardDescription>
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
                        <Button onClick={() => activateWorkMode(assignment.id)}>
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
                    <div className="rounded-lg bg-slate-800/70 p-3">
                      <p className="text-slate-400">Starts</p>
                      <p className="mt-1 font-medium">{formatDateTime(activeAssignment.startsAt)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/70 p-3">
                      <p className="text-slate-400">Ends</p>
                      <p className="mt-1 font-medium">{formatDateTime(activeAssignment.endsAt)}</p>
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
                <div className="lg:col-span-2">
                  <h2 className="mb-3 text-lg font-semibold">Latest updates</h2>
                  <PublicationList
                    publications={scopedPublications.slice(0, 3)}
                    emptyMessage="Your organizer has not published an advance, day sheet, map, or broadcast."
                  />
                </div>
              </div>
            ) : null}

            {view === "schedule" ? (
              <Card className="border-slate-800 bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="text-slate-100">Published schedule</CardTitle>
                  <CardDescription className="text-slate-400">
                    Times shown in your device timezone. Conflicts are not inferred.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 p-4">
                    <p className="text-sm text-slate-400">Start</p>
                    <p className="mt-1 font-medium">{formatDateTime(activeAssignment.startsAt)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 p-4">
                    <p className="text-sm text-slate-400">End</p>
                    <p className="mt-1 font-medium">{formatDateTime(activeAssignment.endsAt)}</p>
                  </div>
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
              <PublicationList
                publications={publicationsFor("task", "tasks", "task_list", "run_of_show")}
                emptyMessage="No assignment-scoped task list has been published."
              />
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
              workerActionsAvailable && activeAssignment.permissions.check_in_out ? (
                <Card className="border-slate-800 bg-slate-900/70">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Assignment attendance</CardTitle>
                    <CardDescription className="text-slate-400">
                      Record an append-only check-in or check-out event. Your device time is
                      submitted for reconciliation; the server time is authoritative.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void runWorkerAction({ action: "check_out" })}
                      disabled={workerActionId !== null}
                    >
                      Check out
                    </Button>
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
