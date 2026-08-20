"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { OpsWorkspaceChrome } from "@/components/admin/operations/ops-workspace-chrome"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  LayoutDashboard,
  Megaphone,
  Briefcase,
  Users,
  ArrowLeft,
  CheckSquare,
  MessageCircle,
  FileText,
  Calendar,
} from "lucide-react"
import { featureUnavailableMessage, isFeatureUnavailableResponse } from "@/lib/api/feature-unavailable"
import { buildAdminHiringHref } from "@/lib/admin/admin-ops-context"
import { EventSetupCompletenessPanel } from "@/components/admin/event-setup-completeness-panel"
import { EventWorkerBriefPublisher } from "@/components/admin/workforce/event-worker-brief-publisher"

function buildNoStoreInit(input?: RequestInit): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(input?.headers || {}),
    },
  }
}

interface HqPayload {
  success?: boolean
  event?: { id?: string; title?: string; venue_id?: string | null }
  userRole?: string | null
  bulletins?: unknown[]
  resources?: unknown[]
  calendar?: unknown[]
  team?: unknown[]
  tasks?: unknown[]
  hiring?: { postings?: unknown[]; applications_total?: number }
  group_chats?: unknown[]
  documents?: unknown[]
  error?: string
}

function pickTimestampMs(row: Record<string, unknown>): number | null {
  const keys = ["updated_at", "created_at", "start_time", "due_date", "pinned_at"]
  for (const k of keys) {
    const v = row[k]
    if (typeof v === "string" && v) {
      const t = Date.parse(v)
      if (!Number.isNaN(t)) return t
    }
  }
  return null
}

function computeLastActivityMs(hq: HqPayload): number | null {
  let best: number | null = null
  const bump = (t: number | null) => {
    if (t == null) return
    if (best == null || t > best) best = t
  }
  for (const list of [hq.bulletins, hq.resources, hq.tasks, hq.documents, hq.hiring?.postings, hq.group_chats, hq.calendar]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (item && typeof item === "object") bump(pickTimestampMs(item as Record<string, unknown>))
    }
  }
  return best
}

function formatRelativeTime(isoMs: number) {
  const diff = Date.now() - isoMs
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export default function EventCommandCenterPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [loading, setLoading] = useState(true)
  const [hq, setHq] = useState<HqPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [broadcasting, setBroadcasting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/events/${eventId}/hq`, buildNoStoreInit())
        const json = (await res.json()) as HqPayload
        if (!res.ok) throw new Error(json.error || res.statusText)
        if (!cancelled) setHq(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load event")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const interval = window.setInterval(load, 15000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [eventId])

  async function broadcastToTeam() {
    setBroadcasting(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/work-mode`, buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify({
          publication_type: 'command_broadcast',
          title: hq?.event?.title ? `Command center update: ${hq.event.title}` : 'Command center update',
          payload: {
            bulletins: bulletinsCount,
            tasks: tasksCount,
            documents: docsCount,
            last_activity_at: lastActivityMs ? new Date(lastActivityMs).toISOString() : new Date().toISOString(),
          },
        }),
      }))
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        if (isFeatureUnavailableResponse(res.status, payload)) {
          setError(featureUnavailableMessage(payload, 'Work Mode broadcast is temporarily unavailable.'))
          return
        }
        setError(payload?.error || 'Failed to broadcast update')
      }
    } finally {
      setBroadcasting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-red-300">
        <p>{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const venueId = hq?.event?.venue_id
  const bulletinsCount = hq?.bulletins?.length ?? 0
  const teamCount = hq?.team?.length ?? 0
  const tasksCount = hq?.tasks?.length ?? 0
  const postingsCount = hq?.hiring?.postings?.length ?? 0
  const appsTotal = hq?.hiring?.applications_total ?? 0
  const chatsCount = hq?.group_chats?.length ?? 0
  const docsCount = hq?.documents?.length ?? 0
  const calendarItems = Array.isArray(hq?.calendar) ? hq.calendar : []
  const upcomingCalendar = [...calendarItems]
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
    .sort((a, b) => {
      const ta = typeof a.start_time === "string" ? Date.parse(a.start_time) : 0
      const tb = typeof b.start_time === "string" ? Date.parse(b.start_time) : 0
      return ta - tb
    })
    .slice(0, 5)
  const lastActivityMs = hq ? computeLastActivityMs(hq) : null

  return (
    <OpsWorkspaceChrome
      eventId={eventId}
      backHref={`/admin/dashboard/events/${eventId}`}
      backLabel="Back to event hub"
      title="Command center"
      description={
        hq?.event?.title
          ? `Live ops aggregation for ${hq.event.title}${hq?.userRole ? ` · role: ${hq.userRole}` : ""}${lastActivityMs ? ` · last activity ${formatRelativeTime(lastActivityMs)}` : ""}`
          : `Event ops aggregation${lastActivityMs ? ` · last activity ${formatRelativeTime(lastActivityMs)}` : ""}`
      }
      badge={hq?.userRole || undefined}
      actions={
        <>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
            <Link href={`/admin/dashboard/events/${eventId}/hq`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Event HQ
            </Link>
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={broadcastToTeam} disabled={broadcasting}>
            {broadcasting ? "Broadcasting..." : "Broadcast to Work Mode"}
          </Button>
        </>
      }
    >
      <EventSetupCompletenessPanel eventId={eventId} className="mb-2" />
      <EventWorkerBriefPublisher eventId={eventId} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <Megaphone className="h-5 w-5 text-cyan-400" />
              Communications
            </CardTitle>
            <CardDescription>Bulletins and team chat</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 text-sm text-slate-300">
              <Badge variant="secondary" className="bg-slate-800">
                {bulletinsCount} bulletins
              </Badge>
              <Badge variant="secondary" className="bg-slate-800">
                {chatsCount} groups
              </Badge>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=bulletin`}>Open bulletins</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-slate-600">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=chats`}>Open chats</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <Briefcase className="h-5 w-5 text-amber-400" />
              Hiring
            </CardTitle>
            <CardDescription>Roles tied to this event</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 text-sm text-slate-300">
              <Badge variant="secondary" className="bg-slate-800">
                {postingsCount} postings
              </Badge>
              <Badge variant="secondary" className="bg-slate-800">
                {appsTotal} applications
              </Badge>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={buildAdminHiringHref({
                eventId,
                entityType: venueId ? "venue" : null,
                entityId: venueId,
                venueId,
              })}>
                Admin hiring hub
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-slate-600">
              <Link href="/jobs?tab=staffing">Public jobs board</Link>
            </Button>
            {venueId ? (
              <Button asChild variant="outline" size="sm" className="border-slate-600">
                <Link href={`/venue/dashboard/hiring-kanban?venue_id=${encodeURIComponent(venueId)}`}>Venue hiring board</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <Calendar className="h-5 w-5 text-amber-300" />
              Schedule
            </CardTitle>
            <CardDescription>Next items on the event calendar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcomingCalendar.length === 0 ? (
              <p className="text-sm text-slate-500">No calendar rows yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {upcomingCalendar.map((row, idx) => (
                  <li key={typeof row.id === "string" ? row.id : `cal-${idx}`} className="rounded-md border border-slate-700/80 bg-slate-950/40 px-2 py-1.5">
                    <span className="font-medium text-slate-100">{typeof row.title === "string" ? row.title : "Item"}</span>
                    {typeof row.start_time === "string" ? (
                      <span className="ml-2 text-xs text-slate-500">{new Date(row.start_time).toLocaleString()}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=calendar`}>Open calendar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <Users className="h-5 w-5 text-violet-400" />
              Roster
            </CardTitle>
            <CardDescription>Event participants</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit bg-slate-800">
              {teamCount} members
            </Badge>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=team`}>Open team tab</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <CheckSquare className="h-5 w-5 text-emerald-400" />
              Tasks
            </CardTitle>
            <CardDescription>Logistics tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit bg-slate-800">
              {tasksCount} tasks
            </Badge>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=tasks`}>Open tasks</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <FileText className="h-5 w-5 text-sky-400" />
              Documents
            </CardTitle>
            <CardDescription>Event document vault</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit bg-slate-800">
              {docsCount} visible docs
            </Badge>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/dashboard/events/${eventId}/hq?tab=resources`}>Resources and docs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <MessageCircle className="h-5 w-5 text-pink-400" />
              Show day ops
            </CardTitle>
            <CardDescription>Advancing, day sheet, and door</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/dashboard/events/${eventId}/advancing`}>Advancing</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-slate-600">
              <Link href={`/admin/dashboard/events/${eventId}/day-sheet`}>Day sheet</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-slate-600">
              <Link href={`/admin/dashboard/events/${eventId}/check-in`}>Check-in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </OpsWorkspaceChrome>
  )
}
