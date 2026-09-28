'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Map,
  MessageSquare,
  Route,
  Search,
  UserRoundX,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/auth-context'
import { useLogisticsOverview } from '@/hooks/use-logistics-overview'
import {
  logisticsOverviewHref,
  type LogisticsAttentionSeverity,
  type LogisticsOverviewDomain,
  type LogisticsSourceStatus,
} from '@/lib/admin/logistics-overview'
import {
  LogisticsAttentionRow,
  LogisticsCommandCenterEmpty,
  LogisticsCommandCenterError,
  LogisticsCommandCenterLoading,
  LogisticsReadinessIndicator,
  LogisticsSourceHealthSummary,
  LogisticsSummaryStat,
} from '@/components/admin/logistics/command-center'

interface LogisticsOverviewPanelProps {
  tourId?: string
  eventId?: string
  onOpenScope: (scope: { tourId?: string | null; eventId?: string | null; tourName?: string | null; eventName?: string | null }) => void
}

function dateTime(value: string | null | undefined): string {
  if (!value) return 'Not scheduled'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function sourceStatus(sources: Array<{ domain: string; status: LogisticsSourceStatus }>, domain: string) {
  return sources.find((source) => source.domain === domain)?.status || 'unavailable'
}

function availability(status: LogisticsSourceStatus) {
  return status === 'ready' ? 'available' as const : status
}

export function LogisticsOverviewPanel({ tourId, eventId, onOpenScope }: LogisticsOverviewPanelProps) {
  const { user } = useAuth()
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [domain, setDomain] = useState<'all' | LogisticsOverviewDomain>('all')
  const [severity, setSeverity] = useState<'all' | LogisticsAttentionSeverity>('all')
  const { data, loading, error, isAdminReady, refresh } = useLogisticsOverview({
    tourId,
    eventId,
    search,
    attentionOnly,
    domain: domain === 'all' ? [] : [domain],
    severity: severity === 'all' ? [] : [severity],
  })

  const impairedSources = useMemo(
    () => data?.sources.filter((source) => source.status !== 'ready') || [],
    [data],
  )

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(draftSearch.trim())
  }

  if (!isAdminReady) return <LogisticsCommandCenterLoading label="Resolving organization logistics context" />
  if (loading && !data) return <LogisticsCommandCenterLoading />
  if (error && !data) return <LogisticsCommandCenterError description={error} onRetry={refresh} />
  if (!data) return null

  const tasksStatus = sourceStatus(data.sources, 'tasks')
  const mapsStatus = sourceStatus(data.sources, 'site_maps')
  const commsStatus = sourceStatus(data.sources, 'communications')
  const scopeLinks = {
    transport: logisticsOverviewHref({ tab: 'travel', panel: 'ground', tourId, eventId }),
    travel: logisticsOverviewHref({ tab: 'travel', panel: 'air-travelers', tourId, eventId }),
    lodging: logisticsOverviewHref({ tab: 'travel', panel: 'lodging-documents', tourId, eventId }),
    communications: logisticsOverviewHref({ tab: 'communications', tourId, eventId }),
    maps: logisticsOverviewHref({ tab: 'maps', tourId, eventId }),
  }
  const selectedEvent = eventId ? data.events.find((event) => event.id === eventId) : null
  const selectedEventAttention = selectedEvent
    ? data.attention.filter((item) => item.eventId === selectedEvent.id)
    : []
  const myAssignedAttention = user
    ? data.attention.filter((item) => item.ownerId === user.id)
    : []

  return (
    <div className="space-y-6">
      <Card className="border-slate-700/70 bg-slate-950/50">
        <CardContent className="flex flex-col gap-4 p-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
              {data.scope.mode === 'organization' ? 'All logistics' : data.scope.mode === 'tour' ? 'Tour logistics' : 'Event logistics'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Updated {dateTime(data.generatedAt)}
              {impairedSources.length > 0 ? ` · ${impairedSources.length} source${impairedSources.length === 1 ? '' : 's'} need attention` : ' · All sources available'}
            </p>
          </div>
          <form className="flex w-full max-w-xl gap-2" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="logistics-overview-search">Search logistics</label>
            <Input
              id="logistics-overview-search"
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search tours, events, or venues"
              value={draftSearch}
            />
            <Button type="submit" variant="outline">
              <Search aria-hidden="true" className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            <Select value={domain} onValueChange={(value) => setDomain(value as typeof domain)}>
              <SelectTrigger aria-label="Filter by logistics domain" className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="lodging">Lodging</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="backline">Backline</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="staffing">Staffing</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="site_maps">Maps</SelectItem>
                <SelectItem value="communications">Comms</SelectItem>
                <SelectItem value="tasks">Tasks</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(value) => setSeverity(value as typeof severity)}>
              <SelectTrigger aria-label="Filter by severity" className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-300">
            <Switch checked={attentionOnly} onCheckedChange={setAttentionOnly} />
            Needs attention
          </label>
        </CardContent>
      </Card>

      <section aria-labelledby="logistics-now-next-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="logistics-now-next-heading" className="text-lg font-semibold text-white">Now and next</h2>
            <p className="text-sm text-slate-400">Operational signals across the selected organization and scope.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link href={scopeLinks.transport}><Route className="mr-2 h-4 w-4" />Add transport</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href={scopeLinks.communications}><MessageSquare className="mr-2 h-4 w-4" />Send update</Link></Button>
            <Button asChild size="sm"><Link href={scopeLinks.maps}><Map className="mr-2 h-4 w-4" />{eventId || tourId ? 'Create map' : 'Open maps'}</Link></Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <LogisticsSummaryStat label="Upcoming events" value={data.summary.upcomingEvents} icon={CalendarDays} tone="info" />
          <LogisticsSummaryStat label="Critical blockers" value={data.summary.blockers} icon={AlertTriangle} tone={data.summary.blockers ? 'critical' : 'positive'} availability={availability(tasksStatus)} />
          <LogisticsSummaryStat label="Overdue tasks" value={data.summary.overdueTasks} icon={ClipboardList} tone={data.summary.overdueTasks ? 'attention' : 'positive'} availability={availability(tasksStatus)} />
          <LogisticsSummaryStat label="Unassigned work" value={data.summary.unassignedTasks} icon={UserRoundX} tone={data.summary.unassignedTasks ? 'attention' : 'positive'} availability={availability(tasksStatus)} />
          <LogisticsSummaryStat label="Maps missing" value={data.summary.missingMaps} icon={Map} tone={data.summary.missingMaps ? 'attention' : 'positive'} availability={availability(mapsStatus)} action={{ label: 'Open maps', href: scopeLinks.maps }} />
          <LogisticsSummaryStat label="Acknowledgements" value={data.summary.pendingAcknowledgements} icon={MessageSquare} tone={data.summary.pendingAcknowledgements ? 'attention' : 'positive'} availability={availability(commsStatus)} action={{ label: 'Open Comms', href: scopeLinks.communications }} />
        </div>
      </section>

      {selectedEvent ? (
        <section aria-labelledby="show-day-heading" className="space-y-3">
          <div>
            <h2 id="show-day-heading" className="text-lg font-semibold text-white">Show-day focus</h2>
            <p className="text-sm text-slate-400">A compact event view for the schedule, immediate blockers, and the fastest routes to operational detail.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current / next</p>
                <p className="font-medium text-white">{dateTime(selectedEvent.startAt)}</p>
                <p className="text-sm text-slate-400">{data.timeline.find((item) => item.eventId === selectedEvent.id)?.title || 'No additional schedule item'}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Venue & contacts</p>
                <p className="font-medium text-white">{selectedEvent.venueName || 'Venue not assigned'}</p>
                <Button asChild className="px-0" size="sm" variant="link"><Link href={`/admin/dashboard/events/${selectedEvent.id}`}>Open event contacts</Link></Button>
              </CardContent>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Immediate blockers</p>
                <p className="font-medium text-white">{selectedEventAttention.length}</p>
                <p className="text-sm text-slate-400">{selectedEventAttention[0]?.reason || 'No active blocker'}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-3 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Travel & lodging</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link href={scopeLinks.travel}>Air & travelers</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link href={scopeLinks.lodging}>Lodging</Link></Button>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Urgent Comms</p>
                <p className="font-medium text-white">{data.summary.pendingAcknowledgements} pending acknowledgements</p>
                <Button asChild className="px-0" size="sm" variant="link"><Link href={scopeLinks.communications}>Open operational Comms</Link></Button>
              </CardContent>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Site map</p>
                <p className="font-medium text-white">
                  {mapsStatus !== 'ready'
                    ? 'Map status unavailable'
                    : selectedEvent.readiness.reasons.find((reason) => reason.toLowerCase().includes('site map')) || 'Map attached'}
                </p>
                <Button asChild className="px-0" size="sm" variant="link"><Link href={scopeLinks.maps}>Open map builder</Link></Button>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {myAssignedAttention.length > 0 ? (
        <section aria-labelledby="my-logistics-work-heading" className="space-y-3">
          <div>
            <h2 id="my-logistics-work-heading" className="text-lg font-semibold text-white">My assigned logistics work</h2>
            <p className="text-sm text-slate-400">The highest-priority items currently assigned to you.</p>
          </div>
          <div className="space-y-3">
            {myAssignedAttention.slice(0, 6).map((item) => (
              <LogisticsAttentionRow
                key={`mine:${item.id}`}
                action={{ label: 'Open', href: item.href }}
                context={item.eventId ? 'Event logistics' : item.tourId ? 'Tour logistics' : 'Organization logistics'}
                domain={item.domain.replace('_', ' ')}
                due={item.dueAt ? dateTime(item.dueAt) : undefined}
                freshness={item.updatedAt ? dateTime(item.updatedAt) : undefined}
                owner={item.ownerName || 'Assigned to you'}
                reason={item.reason}
                severity={item.severity}
                title={item.title}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="logistics-attention-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="logistics-attention-heading" className="text-lg font-semibold text-white">Needs attention</h2>
            <p className="text-sm text-slate-400">Sorted by severity and time to impact.</p>
          </div>
          <span className="text-sm tabular-nums text-slate-400">{data.attention.length} items</span>
        </div>
        {data.attention.length > 0 ? data.attention.slice(0, 12).map((item) => (
          <LogisticsAttentionRow
            key={item.id}
            action={{ label: 'Open and resolve', href: item.href }}
            context={item.eventId ? 'Event logistics' : item.tourId ? 'Tour logistics' : 'Organization logistics'}
            domain={item.domain.replace('_', ' ')}
            due={item.dueAt ? dateTime(item.dueAt) : undefined}
            freshness={item.updatedAt ? dateTime(item.updatedAt) : undefined}
            owner={item.ownerName || 'Unassigned'}
            reason={item.reason}
            severity={item.severity}
            title={item.title}
          />
        )) : (
          <LogisticsCommandCenterEmpty
            title="No logistics items need attention"
            description="The selected tours and events have no current blockers, overdue work, or missing site maps."
            action={<Button asChild variant="outline"><Link href="/admin/dashboard/events">Review events</Link></Button>}
          />
        )}
      </section>

      <section aria-labelledby="logistics-events-heading" className="space-y-3">
        <div>
          <h2 id="logistics-events-heading" className="text-lg font-semibold text-white">Upcoming events and stops</h2>
          <p className="text-sm text-slate-400">Open a row to focus every logistics tab on that event.</p>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {data.events.map((event) => (
            <Card key={event.id} className="border-slate-700/70 bg-slate-900/50">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{dateTime(event.startAt)}</p>
                    <h3 className="mt-1 truncate font-semibold text-white">{event.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{event.venueName || 'Venue not assigned'}{event.venueLocation ? ` · ${event.venueLocation}` : ''}</p>
                  </div>
                  <LogisticsReadinessIndicator state={event.readiness.state} value={event.readiness.percentage ?? undefined} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-sm">
                  <span className="text-slate-400">{event.topBlocker || event.readiness.reasons[0] || 'No open blocker'}</span>
                  <Button
                    onClick={() => onOpenScope({ tourId: event.tourId, eventId: event.id, eventName: event.title })}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Open event
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {data.tours.length > 0 ? (
        <section aria-labelledby="logistics-tours-heading" className="space-y-3">
          <h2 id="logistics-tours-heading" className="text-lg font-semibold text-white">Active tours</h2>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {data.tours.map((tour) => (
              <Card key={tour.id} className="border-slate-700/70 bg-slate-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">{tour.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LogisticsReadinessIndicator state={tour.readiness.state} value={tour.readiness.percentage ?? undefined} reason={tour.readiness.reasons[0]} />
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{tour.eventCount} events · {tour.attentionCount} attention</span>
                    <Button onClick={() => onOpenScope({ tourId: tour.id, eventId: null, tourName: tour.name })} size="sm" type="button" variant="ghost">Open tour</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {data.timeline.length > 0 ? (
        <Card className="border-slate-700/70 bg-slate-900/50">
          <CardHeader><CardTitle className="text-base text-white">Operational timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {data.timeline.slice(0, 10).map((item) => (
                <li key={item.id} className="flex items-start gap-3 border-l border-slate-700 pl-4">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <div className="min-w-0 flex-1">
                    <Link className="font-medium text-slate-100 hover:text-cyan-200" href={item.href}>{item.title}</Link>
                    <p className="text-xs text-slate-400">{dateTime(item.occursAt)} · {item.kind}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <LogisticsSourceHealthSummary sources={data.sources} />
      {error ? <p className="text-sm text-amber-200" role="status">The last refresh failed: {error}</p> : null}
    </div>
  )
}
