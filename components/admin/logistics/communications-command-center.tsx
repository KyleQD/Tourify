"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CloudSun,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Radio,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react"

import { LogisticsCollaboration } from "@/components/admin/logistics-collaboration"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CommandCenterFeedItem {
  id: string
  source: "group_thread" | "event_bulletin" | "event_channel" | "event_task" | "external_event"
  title: string
  summary: string | null
  priority: string | null
  status: string | null
  eventId: string | null
  actionUrl: string | null
  lastActivity: string | null
}

interface CommandCenterPayload {
  success: boolean
  scope: {
    orgId: string
    tourId: string | null
    eventId: string | null
    eventCount: number
    tourCount: number
  }
  summary: {
    nativeThreads: number
    bulletins: number
    eventChannels: number
    taskMessages: number
    pendingAcknowledgements: number
    externalEvents: number
  }
  feed: CommandCenterFeedItem[]
  providerStatus: {
    email: string
    weather: string
    whatsapp: string
  }
  migrationWarnings: string[]
  generatedAt: string
}

interface CommunicationsCommandCenterProps {
  eventId?: string
  tourId?: string
  eventName?: string
  isOwner?: boolean
  threadId?: string
  onThreadProvisioned?: (threadId: string) => void
  actingHeaders?: Record<string, string>
}

const sourceLabels: Record<CommandCenterFeedItem["source"], string> = {
  group_thread: "Team Comms",
  event_bulletin: "Bulletin",
  event_channel: "Channel",
  event_task: "Task",
  external_event: "External",
}

function formatRelative(value: string | null) {
  if (!value) return "No activity yet"
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return "Recent"
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function CommunicationsCommandCenter({
  eventId,
  tourId,
  eventName,
  isOwner = false,
  threadId,
  onThreadProvisioned,
  actingHeaders = {},
}: CommunicationsCommandCenterProps) {
  const [data, setData] = useState<CommandCenterPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const loadCommandCenter = useCallback(async () => {
    const params = new URLSearchParams({ limit: "12" })
    if (tourId) params.set("tourId", tourId)
    if (eventId) params.set("eventId", eventId)

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/logistics/communications-command-center?${params.toString()}`, {
        credentials: "include",
        headers: { ...actingHeaders },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Communications command center is unavailable")
      }
      setData(payload as CommandCenterPayload)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Communications command center is unavailable")
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, eventId, tourId])

  useEffect(() => {
    void loadCommandCenter()
  }, [loadCommandCenter])

  const filteredFeed = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return data?.feed ?? []
    return (data?.feed ?? []).filter((item) => {
      return `${item.title} ${item.summary ?? ""} ${sourceLabels[item.source]}`
        .toLowerCase()
        .includes(needle)
    })
  }, [data?.feed, query])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="space-y-4">
          <Card className="rounded-sm border-slate-700/50 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Radio className="h-4 w-4 text-cyan-300" />
                    Communications Command Center
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-400">
                    {eventId
                      ? "Stop-scoped operational communications"
                      : tourId
                        ? "Tour-wide operational communications"
                        : "Organization-wide operational communications"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadCommandCenter()}
                  className="border-slate-700 text-slate-300"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryTile
                  icon={MessageSquare}
                  label="Native Threads"
                  value={data?.summary.nativeThreads ?? 0}
                  loading={loading}
                />
                <SummaryTile
                  icon={Bell}
                  label="Bulletins"
                  value={data?.summary.bulletins ?? 0}
                  loading={loading}
                />
                <SummaryTile
                  icon={CheckCircle2}
                  label="Pending Acks"
                  value={data?.summary.pendingAcknowledgements ?? 0}
                  loading={loading}
                />
                <SummaryTile
                  icon={ShieldCheck}
                  label="Event Channels"
                  value={data?.summary.eventChannels ?? 0}
                  loading={loading}
                />
                <SummaryTile
                  icon={Inbox}
                  label="Task Messages"
                  value={data?.summary.taskMessages ?? 0}
                  loading={loading}
                />
                <SummaryTile
                  icon={AlertTriangle}
                  label="External Events"
                  value={data?.summary.externalEvents ?? 0}
                  loading={loading}
                />
              </div>

              {data?.migrationWarnings?.length ? (
                <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                  Some optional command-center sources are not available yet. Existing native communications remain active.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-sm border-slate-700/50 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base text-white">Operational Feed</CardTitle>
                <div className="relative w-full md:w-72">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search communications"
                    className="h-9 border-slate-700 bg-slate-950/60 pl-8 text-sm text-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading command feed...
                </div>
              ) : filteredFeed.length === 0 ? (
                <div className="py-10 text-center">
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm font-medium text-slate-300">No operational communications found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Native Team Comms, bulletins, task messages, and provider events will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFeed.map((item) => (
                    <FeedRow key={`${item.source}-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <LogisticsCollaboration
            eventId={eventId}
            tourId={tourId}
            eventName={eventName}
            isOwner={isOwner}
            threadId={threadId}
            onThreadProvisioned={(id) => {
              onThreadProvisioned?.(id)
              void loadCommandCenter()
            }}
          />

          <Card className="rounded-sm border-slate-700/50 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">External Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ProviderRow icon={Mail} label="Email" status={data?.providerStatus.email ?? "not_configured"} />
              <ProviderRow icon={CloudSun} label="Weather" status={data?.providerStatus.weather ?? "not_configured"} />
              <ProviderRow icon={Smartphone} label="WhatsApp" status={data?.providerStatus.whatsapp ?? "not_configured"} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof MessageSquare
  label: string
  value: number
  loading: boolean
}) {
  return (
    <div className="rounded-sm border border-slate-700/60 bg-slate-950/40 p-3">
      <div className="flex items-center justify-between">
        <div className="rounded-sm bg-cyan-500/10 p-2">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="text-xl font-semibold text-white">{loading ? "..." : value}</div>
      </div>
      <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

function FeedRow({ item }: { item: CommandCenterFeedItem }) {
  const urgent = item.priority === "urgent" || item.priority === "emergency" || item.priority === "critical"
  return (
    <div className="rounded-sm border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "rounded-sm border text-[10px]",
                urgent
                  ? "border-red-500/30 bg-red-500/15 text-red-200"
                  : "border-slate-700 bg-slate-800 text-slate-300",
              )}
            >
              {sourceLabels[item.source]}
            </Badge>
            {item.status ? (
              <Badge className="rounded-sm border border-amber-500/30 bg-amber-500/15 text-[10px] text-amber-200">
                {item.status.replace("_", " ")}
              </Badge>
            ) : null}
            <span className="text-xs text-slate-500">{formatRelative(item.lastActivity)}</span>
          </div>
          <h4 className="truncate text-sm font-medium text-white">{item.title}</h4>
          {item.summary ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{item.summary}</p>
          ) : null}
        </div>
        {item.actionUrl ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-slate-400 hover:text-white"
          >
            <a href={item.actionUrl} aria-label="Open communication">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function ProviderRow({
  icon: Icon,
  label,
  status,
}: {
  icon: typeof Mail
  label: string
  status: string
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-200">{label}</span>
      </div>
      <Badge className="rounded-sm border border-slate-700 bg-slate-800 text-[10px] text-slate-300">
        {status.replace("_", " ")}
      </Badge>
    </div>
  )
}
