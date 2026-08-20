"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, BedDouble, BriefcaseBusiness, CalendarClock, Check, ClipboardList, FileText, Loader2, MapPin, MessageSquare, Plane, Play, RefreshCw, Search, ShieldCheck, UserRoundCheck, X } from "lucide-react"

import { useWorkMode } from "@/hooks/use-work-mode"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { WorkModeAssignmentListItem } from "@/types/hiring-roster-work-mode"
import type { WorkerApplication, WorkerEngagement, WorkerTask, WorkHubPayload } from "@/types/work-hub"

function formatDateTime(value: string | null | undefined, timeZone?: string | null): string {
  if (!value) return "Not shared yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not shared yet"
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
  if (timeZone) options.timeZone = timeZone
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

function formatStatus(value: string | null | undefined): string {
  return value ? value.replaceAll("_", " ") : "Not shared yet"
}

function assignmentHref(assignment: WorkModeAssignmentListItem): string {
  return `/work/today?assignment=${encodeURIComponent(assignment.id)}`
}

function statusClass(status: string): string {
  if (["active", "confirmed", "approved", "completed"].includes(status)) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
  if (["invited", "pending", "under_review", "interview"].includes(status)) return "border-amber-500/40 bg-amber-500/10 text-amber-100"
  if (["cancelled", "declined", "rejected", "withdrawn"].includes(status)) return "border-rose-500/40 bg-rose-500/10 text-rose-200"
  return "border-zinc-700 text-zinc-300"
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 text-sm text-zinc-100">{value || "Not shared yet"}</dd></div>
}

function briefText(brief: Record<string, unknown> | null, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = brief?.[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

function ApplicationTimeline({ application }: { application: WorkerApplication }) {
  return <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={`${application.title} application timeline`}>
    {application.timeline.map((step) => <li key={step.key} className="min-w-0"><div className={`h-1.5 rounded-full ${step.state === "complete" ? "bg-emerald-400" : step.state === "current" ? "bg-amber-400" : step.state === "stopped" ? "bg-rose-400" : "bg-zinc-700"}`} aria-hidden="true" /><p className="mt-1 truncate text-[11px] text-zinc-400">{step.label}</p></li>)}
  </ol>
}

function TaskActions({ task, busy, blockedReason, onBlockedReasonChange, onAction }: { task: WorkerTask; busy: boolean; blockedReason: string; onBlockedReasonChange: (value: string) => void; onAction: (task: WorkerTask, action: "acknowledge" | "start" | "complete" | "block") => void }) {
  if (["done", "cancelled"].includes(task.state)) return null
  return <div className="mt-3 flex flex-wrap gap-2">
    {task.state === "assigned" ? <Button className="min-h-11" disabled={busy} onClick={() => onAction(task, "acknowledge")}><Check className="mr-2 h-4 w-4" />Acknowledge</Button> : null}
    {["acknowledged", "blocked"].includes(task.state) ? <Button className="min-h-11" disabled={busy} onClick={() => onAction(task, "start")}><Play className="mr-2 h-4 w-4" />Start</Button> : null}
    {["acknowledged", "doing", "blocked"].includes(task.state) ? <Button variant="outline" className="min-h-11 border-zinc-700" disabled={busy} onClick={() => onAction(task, "complete")}><Check className="mr-2 h-4 w-4" />Complete</Button> : null}
    {["acknowledged", "doing"].includes(task.state) ? <label className="min-w-60 flex-1 text-xs text-zinc-400">Block reason<Input value={blockedReason} onChange={(event) => onBlockedReasonChange(event.target.value)} className="mt-1 min-h-11 border-zinc-700 bg-zinc-950 text-zinc-100" placeholder="What is preventing progress?" /></label> : null}
    {["acknowledged", "doing"].includes(task.state) ? <Button variant="outline" className="min-h-11 self-end border-zinc-700" disabled={busy || !blockedReason.trim()} onClick={() => onAction(task, "block")}><AlertCircle className="mr-2 h-4 w-4" />Block</Button> : null}
  </div>
}

function EngagementCard({ engagement, respondingTaskId, blockedReasons, onBlockedReasonChange, onTaskAction }: { engagement: WorkerEngagement; respondingTaskId: string | null; blockedReasons: Record<string, string>; onBlockedReasonChange: (taskId: string, value: string) => void; onTaskAction: (task: WorkerTask, action: "acknowledge" | "start" | "complete" | "block") => void }) {
  const assignment = engagement.assignments.find((item) => item.assignmentKind !== "legacy_engagement" && !["completed", "cancelled", "declined"].includes(item.status))
  const shiftPlan = assignment?.sharedShiftPlan
  return <Card className="border-zinc-800 bg-zinc-900/80" id={`engagement-${engagement.id}`}>
    <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-zinc-100">{engagement.employerName}</CardTitle><CardDescription className="mt-1 text-zinc-400">{[engagement.role, engagement.department].filter(Boolean).join(" · ")}</CardDescription></div><Badge variant="outline" className={`w-fit capitalize ${statusClass(engagement.rosterStatus)}`}>{engagement.rosterStatus === "active" ? "On roster" : formatStatus(engagement.rosterStatus)}</Badge></div></CardHeader>
    <CardContent className="space-y-5">
      {engagement.scheduleState === "not_assigned" ? <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4"><p className="font-medium text-emerald-100">On roster — schedule not assigned yet</p><p className="mt-1 text-sm text-zinc-400">Your employer relationship is active. Event and shift details will appear here when they are published.</p></div> : null}
      <div><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="text-zinc-300">Onboarding</span><span className="text-zinc-400">{engagement.onboardingProgress}%</span></div><Progress value={engagement.onboardingProgress} className="h-2" /><p className="mt-2 text-xs text-zinc-500">Compliance: {formatStatus(engagement.complianceStatus)}</p></div>
      {engagement.tours.length ? <div className="space-y-3"><h3 className="font-semibold text-zinc-100">Tours and event access</h3>{engagement.tours.map((tour) => <div key={tour.membershipId} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-zinc-100">{tour.name}</p><p className="mt-1 text-sm text-zinc-400">{[tour.role, tour.teamName].filter(Boolean).join(" · ") || "Tour member"}</p></div><Badge variant="outline" className="border-emerald-500/40 text-emerald-200">On tour</Badge></div>{tour.scheduleState === "not_assigned" ? <p className="mt-3 rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100">On tour — schedule not assigned yet</p> : null}<p className="mt-3 text-xs text-zinc-500">{tour.propagationMode === "current_and_future_events" ? "Current and future events" : "Current events only"}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{tour.events.map((event) => <div key={event.id} className="rounded-md border border-zinc-800 p-3"><p className="text-sm font-medium text-zinc-100">{event.title}</p><p className="mt-1 text-xs text-zinc-500">{formatDateTime(event.startsAt, event.timezone)}</p></div>)}</div></div>)}</div> : null}
      {assignment ? <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-zinc-100">{assignment.eventTitle || shiftPlan?.title || assignment.roleTitle}</h3><Badge variant="outline" className={`capitalize ${statusClass(assignment.status)}`}>{formatStatus(assignment.status)}</Badge></div><dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Field label="Employer" value={engagement.employerName} /><Field label="Event" value={assignment.eventTitle} /><Field label="Role" value={shiftPlan?.role || assignment.roleTitle} /><Field label="Department / zone" value={assignment.schedule?.zone || shiftPlan?.department || assignment.department} /><Field label="Call time" value={formatDateTime(shiftPlan?.startsAt || assignment.startsAt, shiftPlan?.timezone || assignment.timezone)} /><Field label="End time" value={formatDateTime(shiftPlan?.endsAt || assignment.endsAt, shiftPlan?.timezone || assignment.timezone)} /><Field label="Timezone" value={shiftPlan?.timezone || assignment.timezone || briefText(engagement.eventBrief, "timezone")} /><Field label="Reporting location" value={assignment.venueLabel || briefText(engagement.eventBrief, "reporting_location", "location")} /><Field label="Break" value={shiftPlan ? `${shiftPlan.breakDurationMinutes} minutes${shiftPlan.breakRequirements ? ` · ${shiftPlan.breakRequirements}` : ""}` : assignment.schedule ? `${assignment.schedule.breakDurationMinutes} minutes` : briefText(engagement.eventBrief, "breaks", "break_policy")} /><Field label="Directions" value={shiftPlan?.directions || briefText(engagement.eventBrief, "directions")} /><Field label="Access instructions" value={shiftPlan?.accessInstructions} /><Field label="Supervisor" value={[shiftPlan?.supervisorName, shiftPlan?.supervisorContact].filter(Boolean).join(" · ") || briefText(engagement.eventBrief, "supervisor_contact", "supervisor")} /><Field label="Attire / PPE / credentials" value={shiftPlan?.attirePpeCredentials || briefText(engagement.eventBrief, "attire_ppe_credentials", "attire", "ppe")} /><Field label="Worker instructions" value={shiftPlan?.workerInstructions} /><Field label="Hazards" value={shiftPlan?.hazards || briefText(engagement.eventBrief, "hazards")} /><Field label="Emergency procedure" value={shiftPlan?.emergencyProcedure || briefText(engagement.eventBrief, "emergency_procedure")} /><Field label="Emergency contact" value={shiftPlan?.emergencyContact || briefText(engagement.eventBrief, "emergency_contact")} /><Field label="Attachments" value={shiftPlan?.attachments.length ? `${shiftPlan.attachments.length} shared` : null} /></dl><div className="mt-3 flex flex-wrap gap-2"><Button asChild className="min-h-11"><Link href={assignmentHref(assignment)}>Open assignment <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" className="min-h-11 border-zinc-700"><Link href={`/work/packets?assignment=${assignment.id}`}>Event information</Link></Button></div></div> : null}
      <div className="grid gap-3 md:grid-cols-2">{engagement.coordinatorChannel ? <Link href={engagement.coordinatorChannel.href} className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-800 p-3 transition hover:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><MessageSquare className="h-5 w-5 text-emerald-300" /><span className="min-w-0 flex-1"><span className="block font-medium text-zinc-100">Coordinator chat</span><span className="block truncate text-sm text-zinc-400">{engagement.coordinatorChannel.latestMessage || "Private channel with your employer"}</span></span>{engagement.coordinatorChannel.unreadCount > 0 ? <Badge>{engagement.coordinatorChannel.unreadCount}</Badge> : null}</Link> : <div className="rounded-lg border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">Coordinator chat is being prepared.</div>}{engagement.approvedApplications.map((application) => <Link key={application.id} href={application.href} className="rounded-lg border border-zinc-800 p-3 hover:border-emerald-500/40"><span className="block text-xs uppercase tracking-wide text-zinc-500">Approved application</span><span className="mt-1 block font-medium text-zinc-100">{application.title}</span></Link>)}</div>
      {engagement.tasks.length ? <div className="space-y-3"><h3 className="font-semibold text-zinc-100">Assigned tasks</h3>{engagement.tasks.map((task) => <div key={task.id} id={`task-${task.id}`} className="scroll-mt-24 rounded-lg border border-zinc-800 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-zinc-100">{task.title}</p><p className="mt-1 text-sm text-zinc-400">{[task.tourName, task.eventName, task.shiftTitle, task.dueAt ? `Due ${formatDateTime(task.dueAt)}` : null].filter(Boolean).join(" · ")}</p>{task.description ? <p className="mt-2 text-sm text-zinc-300">{task.description}</p> : null}{task.blockedReason ? <p className="mt-2 text-sm text-rose-200">Blocked: {task.blockedReason}</p> : null}</div><Badge variant="outline" className={`capitalize ${statusClass(task.state)}`}>{formatStatus(task.state)}</Badge></div><TaskActions task={task} busy={respondingTaskId === task.id} blockedReason={blockedReasons[task.id] ?? ""} onBlockedReasonChange={(value) => onBlockedReasonChange(task.id, value)} onAction={onTaskAction} /></div>)}</div> : null}
      {engagement.operations.tasks.length || engagement.operations.travel.length || engagement.operations.lodging.length ? <div className="grid gap-2 sm:grid-cols-3">{engagement.operations.tasks.map((task) => <div key={task.id} className="rounded-lg border border-zinc-800 p-3 text-sm"><ClipboardList className="mb-2 h-4 w-4 text-sky-300" /><p className="font-medium text-zinc-100">{task.title}</p><p className="mt-1 text-zinc-500">{formatStatus(task.status)}</p></div>)}{engagement.operations.travel.map((travel) => <div key={travel.id} className="rounded-lg border border-zinc-800 p-3 text-sm"><Plane className="mb-2 h-4 w-4 text-sky-300" /><p className="font-medium text-zinc-100">{travel.name || "Assigned travel"}</p><p className="mt-1 text-zinc-500">{formatStatus(travel.status)}</p></div>)}{engagement.operations.lodging.map((lodging) => <div key={lodging.id} className="rounded-lg border border-zinc-800 p-3 text-sm"><BedDouble className="mb-2 h-4 w-4 text-sky-300" /><p className="font-medium text-zinc-100">Assigned lodging</p><p className="mt-1 text-zinc-500">{lodging.roomNumber || formatStatus(lodging.status)}</p></div>)}</div> : null}
    </CardContent>
  </Card>
}

export function WorkHubDashboard() {
  const { confirmAssignment, declineAssignment, refreshAssignments, error: actionError } = useWorkMode()
  const [hub, setHub] = useState<WorkHubPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [respondingTaskId, setRespondingTaskId] = useState<string | null>(null)
  const [blockedReasons, setBlockedReasons] = useState<Record<string, string>>({})
  const [announcement, setAnnouncement] = useState("")
  const [employerFilter, setEmployerFilter] = useState("all")

  const loadHub = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch("/api/work-hub", { credentials: "include", cache: "no-store" })
      const payload = await response.json().catch(() => null) as { success?: boolean; data?: WorkHubPayload; error?: string } | null
      if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || "Your Work Hub could not be loaded.")
      setHub(payload.data)
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Your Work Hub could not be loaded.") } finally { setIsLoading(false) }
  }, [])
  useEffect(() => { void loadHub() }, [loadHub])

  const filteredEngagements = useMemo(() => hub?.engagements.filter((item) => employerFilter === "all" || item.id === employerFilter) ?? [], [employerFilter, hub?.engagements])
  const upcomingShifts = useMemo(() => (hub?.assignments ?? []).filter((item) => item.assignmentKind === "shift" && ["confirmed", "active"].includes(item.status)).sort((a, b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999"))), [hub?.assignments])
  const channels = useMemo(() => (hub?.engagements ?? []).flatMap((item) => [...(item.coordinatorChannel ? [item.coordinatorChannel] : []), ...item.teamChannels]), [hub?.engagements])

  async function respond(assignmentId: string, action: "accept" | "decline") {
    setRespondingId(assignmentId); setAnnouncement("")
    const saved = action === "accept" ? await confirmAssignment(assignmentId) : await declineAssignment(assignmentId)
    if (saved) { setAnnouncement(action === "accept" ? "Shift accepted." : "Shift declined."); await loadHub() } else setAnnouncement("The response was not saved. Your previous shift status is unchanged.")
    setRespondingId(null)
  }
  async function actOnTask(task: WorkerTask, action: "acknowledge" | "start" | "complete" | "block") {
    const blockedReason = action === "block" ? blockedReasons[task.id]?.trim() : undefined
    if (action === "block" && !blockedReason) return
    setRespondingTaskId(task.id); setAnnouncement("")
    try {
      const response = await fetch(`/api/work/tasks/${encodeURIComponent(task.id)}/actions`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, blockedReason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || "The task could not be updated.")
      setAnnouncement(action === "acknowledge" ? "Task acknowledged." : action === "start" ? "Task started." : action === "complete" ? "Task completed." : "Task marked blocked.")
      if (action === "block") setBlockedReasons((current) => ({ ...current, [task.id]: "" }))
      await loadHub()
    } catch (error) { setAnnouncement(error instanceof Error ? error.message : "The task could not be updated.") }
    finally { setRespondingTaskId(null) }
  }
  async function refreshAll() { setIsLoading(true); await Promise.all([refreshAssignments(), loadHub()]) }

  return <main className="min-h-[calc(100vh-4rem)] bg-zinc-950 px-4 py-5 text-zinc-100 sm:px-6"><div className="mx-auto max-w-7xl space-y-6">
    <header className="border-b border-zinc-800 pb-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-emerald-300"><BriefcaseBusiness className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Work Hub</span></div><h1 className="mt-2 text-3xl font-semibold">Your work, from application to event day</h1><p className="mt-2 max-w-3xl text-sm text-zinc-400">Track applications, employer rosters, shift responses, event information, and work messages in one place.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="min-h-11 border-zinc-700 bg-zinc-900"><Link href="/jobs"><Search className="mr-2 h-4 w-4" />Browse jobs</Link></Button><Button className="min-h-11" onClick={() => void refreshAll()} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button></div></div></header>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {loadError || actionError ? <Card className="border-rose-900/50 bg-rose-950/30" role="alert"><CardContent className="flex gap-3 p-4 text-rose-100"><AlertCircle className="mt-0.5 h-5 w-5" /><div><p className="font-medium">Some work information is unavailable</p><p className="text-sm text-rose-200/80">{loadError || actionError}</p></div></CardContent></Card> : null}
    {hub?.partialSources.length ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100" role="status">Some information is still loading: {hub.partialSources.join(", ")}.</div> : null}

    <section aria-labelledby="attention-heading"><Heading id="attention-heading" icon={<AlertCircle className="h-5 w-5 text-amber-300" />} title="Needs attention" />{isLoading && !hub ? <Skeleton className="h-32 bg-zinc-800" /> : null}{!isLoading && hub?.attention.length === 0 ? <Empty>Nothing needs your response right now.</Empty> : null}<div className="grid gap-3 lg:grid-cols-2">{hub?.attention.map((item) => <Card key={item.id} className="border-amber-500/25 bg-amber-500/5"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-amber-50">{item.title}</p><p className="mt-1 text-sm text-zinc-400">{item.description}</p></div><Badge variant="outline" className="border-amber-500/40 text-amber-200">{formatStatus(item.kind)}</Badge></div>{item.kind === "shift_invitation" && item.assignmentId ? <div className="mt-4 flex flex-wrap gap-2"><Button className="min-h-11" onClick={() => void respond(item.assignmentId!, "accept")} disabled={respondingId === item.assignmentId}>{respondingId === item.assignmentId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Accept shift</Button><Button variant="outline" className="min-h-11 border-zinc-700" onClick={() => void respond(item.assignmentId!, "decline")} disabled={respondingId === item.assignmentId}><X className="mr-2 h-4 w-4" />Decline</Button><Button asChild variant="ghost" className="min-h-11"><Link href={item.href}>See details</Link></Button></div> : item.kind === "task_acknowledgement" && item.taskAssignmentId ? <Button className="mt-4 min-h-11" disabled={respondingTaskId === item.taskAssignmentId} onClick={() => { const task = hub.engagements.flatMap((engagement) => engagement.tasks).find((candidate) => candidate.id === item.taskAssignmentId); if (task) void actOnTask(task, "acknowledge") }}><Check className="mr-2 h-4 w-4" />Acknowledge task</Button> : item.kind === "blocked_task" && item.taskAssignmentId ? <Button className="mt-4 min-h-11" disabled={respondingTaskId === item.taskAssignmentId} onClick={() => { const task = hub.engagements.flatMap((engagement) => engagement.tasks).find((candidate) => candidate.id === item.taskAssignmentId); if (task) void actOnTask(task, "start") }}><Play className="mr-2 h-4 w-4" />Resume task</Button> : <Button asChild className="mt-4 min-h-11"><Link href={item.href}>Open <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</CardContent></Card>)}</div></section>

    <section aria-labelledby="my-work-heading"><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Heading id="my-work-heading" icon={<UserRoundCheck className="h-5 w-5 text-emerald-300" />} title="My work" /><p className="text-sm text-zinc-400">Every employer that has added you to a pending or active roster.</p></div>{hub && hub.engagements.length > 1 ? <label className="text-sm text-zinc-400">Employer <select value={employerFilter} onChange={(event) => setEmployerFilter(event.target.value)} className="ml-2 min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100"><option value="all">All employers</option>{hub.engagements.map((item) => <option key={item.id} value={item.id}>{item.employerName}</option>)}</select></label> : null}</div>{!isLoading && hub?.engagements.length === 0 ? <Empty>Approved employer rosters will appear here, even before a shift is assigned.</Empty> : null}<div className="space-y-4">{filteredEngagements.map((item) => <EngagementCard key={item.id} engagement={item} respondingTaskId={respondingTaskId} blockedReasons={blockedReasons} onBlockedReasonChange={(taskId, value) => setBlockedReasons((current) => ({ ...current, [taskId]: value }))} onTaskAction={(task, action) => void actOnTask(task, action)} />)}</div></section>

    <section aria-labelledby="upcoming-heading"><Heading id="upcoming-heading" icon={<CalendarClock className="h-5 w-5 text-sky-300" />} title="Upcoming shifts" />{upcomingShifts.length === 0 ? <Empty>No confirmed shifts yet. Roster status remains visible in My work.</Empty> : <div className="grid gap-3 lg:grid-cols-2">{upcomingShifts.map((item) => <Link key={item.id} href={assignmentHref(item)} className="min-h-11 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 hover:border-emerald-500/40"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-zinc-100">{item.eventTitle || item.roleTitle}</p><p className="mt-1 text-sm text-zinc-400">{item.employerName || "Employer"} · {formatDateTime(item.startsAt, item.timezone)}</p><p className="mt-1 text-xs text-zinc-500"><MapPin className="mr-1 inline h-3 w-3" />{item.venueLabel || "Not shared yet"}</p></div><Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge></div></Link>)}</div>}</section>

    <section aria-labelledby="applications-heading"><Heading id="applications-heading" icon={<FileText className="h-5 w-5 text-violet-300" />} title="Applications" /><div className="space-y-3">{hub?.applications.map((item) => <Card key={`${item.source}:${item.id}`} className="border-zinc-800 bg-zinc-900/80"><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Link href={item.href} className="font-medium text-zinc-100 hover:text-emerald-200">{item.title}</Link><p className="mt-1 text-sm text-zinc-400">{[item.employerName, item.role, item.department].filter(Boolean).join(" · ") || item.source}</p><p className="mt-1 text-xs text-zinc-500">Applied {formatDateTime(item.appliedAt)}</p></div><Badge variant="outline" className={`w-fit capitalize ${statusClass(item.normalizedStatus)}`}>{formatStatus(item.normalizedStatus)}</Badge></div><ApplicationTimeline application={item} /></CardContent></Card>)}</div>{!isLoading && hub?.applications.length === 0 ? <Empty>You have not applied to any jobs yet.</Empty> : null}</section>

    <section aria-labelledby="messages-heading"><Heading id="messages-heading" icon={<MessageSquare className="h-5 w-5 text-emerald-300" />} title="Work messages" />{channels.length === 0 ? <Empty>Coordinator and optional team channels appear here when provisioned.</Empty> : <div className="grid gap-3 lg:grid-cols-2">{channels.map((item) => <Link key={item.threadId} href={item.href} className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 hover:border-emerald-500/40"><MessageSquare className="h-5 w-5 text-emerald-300" /><span className="min-w-0 flex-1"><span className="block font-medium text-zinc-100">{item.name}</span><span className="block truncate text-sm text-zinc-400">{item.latestMessage || "No messages yet"}</span></span>{item.unreadCount > 0 ? <Badge>{item.unreadCount}</Badge> : null}</Link>)}</div>}</section>

    <section aria-labelledby="recommended-heading"><Heading id="recommended-heading" icon={<Search className="h-5 w-5 text-sky-300" />} title="Recommended jobs" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hub?.recommendedJobs.slice(0, 6).map((item) => <Link key={`${item.source}:${item.id}`} href={item.href} className="min-h-11 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 hover:border-emerald-500/40"><p className="font-medium text-zinc-100">{item.title}</p><p className="mt-1 text-sm text-zinc-400">{[item.organizationName, item.location, item.employmentType].filter(Boolean).join(" · ") || "Open role"}</p></Link>)}</div><Button asChild variant="outline" className="mt-3 min-h-11 border-zinc-700"><Link href="/jobs">Browse all jobs</Link></Button></section>

    <section aria-labelledby="history-heading" className="pb-8"><Heading id="history-heading" icon={<ShieldCheck className="h-5 w-5 text-zinc-400" />} title="History" />{hub?.history.length === 0 ? <p className="text-sm text-zinc-400">No completed, cancelled, declined, or offboarded work yet.</p> : <div className="space-y-2">{hub?.history.map((item) => <div key={`${item.kind}:${item.id}`} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 p-3"><div><p className="font-medium text-zinc-100">{item.title}</p><p className="mt-1 text-sm text-zinc-400">{[item.employerName, item.at ? formatDateTime(item.at) : null].filter(Boolean).join(" · ")}</p></div><Badge variant="outline" className={`capitalize ${statusClass(item.status)}`}>{formatStatus(item.status)}</Badge></div>)}</div>}</section>
  </div></main>
}

function Heading({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) { return <div className="mb-3 flex items-center gap-2">{icon}<h2 id={id} className="text-xl font-semibold">{title}</h2></div> }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">{children}</div> }
