"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { LogisticsPlanIssue, LogisticsPlanStopSummary, LogisticsPlanSummary } from "@/lib/logistics/plans"

interface PlanListItem {
  tourId: string
  name: string
  startDate: string | null
  endDate: string | null
  status: string | null
}

interface LogisticsPlansLauncherProps {
  actingHeaders?: Record<string, string>
  isActingReady: boolean
  tourId?: string | null
  eventId?: string | null
  onSelectTour?: (plan: PlanListItem) => void
  onOpenStop?: (tourId: string, stop: LogisticsPlanStopSummary, tab?: string, issueId?: string | null) => void
}

function compactDate(start: string | null, end: string | null) {
  return [start, end].filter(Boolean).join(" to ") || "Dates not set"
}

function stopDate(stop: LogisticsPlanStopSummary) {
  if (!stop.date) return "Date not set"
  return stop.time ? `${stop.date} ${stop.time}` : stop.date
}

function stateClasses(state: string) {
  if (state === "ready" || state === "published") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (state === "stale" || state === "at_risk" || state === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  if (state === "missing") return "border-slate-600 bg-slate-800 text-slate-300"
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
}

function issueTone(issue: LogisticsPlanIssue) {
  if (issue.severity === "blocking") return "border-red-500/30 bg-red-500/10 text-red-200"
  if (issue.severity === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200"
  return "border-slate-600 bg-slate-800 text-slate-200"
}

export function LogisticsPlansLauncher({
  actingHeaders,
  isActingReady,
  tourId,
  eventId,
  onSelectTour,
  onOpenStop,
}: LogisticsPlansLauncherProps) {
  const [plans, setPlans] = useState<PlanListItem[] | null>(null)
  const [plan, setPlan] = useState<LogisticsPlanSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [working, setWorking] = useState<"preview" | "hydrate" | "validate" | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  useEffect(() => {
    if (!isActingReady) return
    let active = true
    async function loadPlans() {
      try {
        const response = await fetch("/api/admin/logistics/plans", {
          credentials: "include",
          cache: "no-store",
          headers: actingHeaders || {},
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          if (body?.code === "logistics_plan_workspace_unavailable") return
          throw new Error(body?.error || "Unable to load logistics plans.")
        }
        if (active) setPlans(Array.isArray(body?.plans) ? body.plans : [])
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load logistics plans.")
      }
    }
    void loadPlans()
    return () => { active = false }
  }, [actingHeaders, isActingReady])

  const filteredPlans = useMemo(() => {
    if (!plans) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return plans
    return plans.filter((item) => `${item.name} ${item.status || ""}`.toLowerCase().includes(needle))
  }, [plans, query])

  const activeTourId = tourId || filteredPlans[0]?.tourId || plans?.[0]?.tourId || null
  const selectedPlanListItem = plans?.find((item) => item.tourId === activeTourId) || null

  const loadPlan = useCallback(async () => {
    if (!activeTourId || !isActingReady) {
      setPlan(null)
      return
    }
    setLoadingPlan(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/logistics/plans/${activeTourId}?tourId=${encodeURIComponent(activeTourId)}`, {
        credentials: "include",
        cache: "no-store",
        headers: actingHeaders || {},
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || "Unable to load the logistics command view.")
      setPlan(body.plan)
    } catch (loadError) {
      setPlan(null)
      setError(loadError instanceof Error ? loadError.message : "Unable to load the logistics command view.")
    } finally {
      setLoadingPlan(false)
    }
  }, [activeTourId, actingHeaders, isActingReady])

  useEffect(() => { void loadPlan() }, [loadPlan])

  const selectedStop = useMemo(
    () => plan?.stops.find((stop) => stop.tourStopId === selectedStopId || stop.eventId === selectedStopId) || null,
    [plan?.stops, selectedStopId],
  )

  const attentionItems = useMemo(() => {
    if (!plan) return []
    const stopById = new Map(plan.stops.filter((stop) => stop.tourStopId).map((stop) => [stop.tourStopId!, stop]))
    const issueItems = plan.issues
      .filter((issue) => issue.status === "open")
      .map((issue) => ({
        key: `issue-${issue.id}`,
        kind: issue.severity === "blocking" ? "Blocker" : "Issue",
        title: issue.title,
        detail: issue.detail || issue.code,
        tone: issue.severity,
        stop: issue.tourStopId ? stopById.get(issue.tourStopId) || null : null,
        issue,
      }))
    const daySheetItems = plan.stops
      .filter((stop) => stop.daySheet.state === "missing" || stop.daySheet.state === "stale")
      .map((stop) => ({
        key: `day-sheet-${stop.tourStopId || stop.eventId || stop.ordinal}`,
        kind: stop.daySheet.state === "stale" ? "Stale day sheet" : "Day sheet",
        title: stop.name,
        detail: stop.daySheet.label,
        tone: stop.daySheet.state === "stale" ? "warning" : "info",
        stop,
        issue: null,
      }))
    const ackItems = plan.stops
      .filter((stop) => stop.pendingAcknowledgementCount > 0)
      .map((stop) => ({
        key: `ack-${stop.tourStopId || stop.eventId || stop.ordinal}`,
        kind: "Pending confirmation",
        title: stop.name,
        detail: `${stop.pendingAcknowledgementCount} acknowledgement(s) waiting`,
        tone: "warning",
        stop,
        issue: null,
      }))
    return [...issueItems, ...daySheetItems, ...ackItems].slice(0, 8)
  }, [plan])

  const runAction = useCallback(async (action: "preview" | "hydrate" | "validate") => {
    if (!plan) return
    setWorking(action)
    setNotice(null)
    try {
      const base = `/api/admin/logistics/plans/${plan.tourId}`
      const response = await fetch(`${base}/${action === "preview" ? "preview-hydration" : action}?tourId=${encodeURIComponent(plan.tourId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(actingHeaders || {}) },
        body: JSON.stringify({ expectedOperationsVersion: plan.operationsVersion }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || "The logistics operation could not be completed.")
      if (body.plan) setPlan(body.plan)
      if (body.preview) {
        setNotice(`${body.preview.counts.sourceStops} stops checked; ${body.preview.counts.conflicts} override conflict(s), ${body.preview.counts.sourceMissing} missing source stop(s).`)
      } else {
        setNotice(action === "hydrate" ? "Tour source synchronized." : "Readiness validation completed.")
      }
      void loadPlan()
    } catch (actionError) {
      setNotice(actionError instanceof Error ? actionError.message : "The logistics operation could not be completed.")
    } finally {
      setWorking(null)
    }
  }, [actingHeaders, loadPlan, plan])

  if (plans === null && !error) return null
  if (plans?.length === 0) {
    return (
      <Card className="rounded-md border-slate-700/70 bg-slate-950/50">
        <CardContent className="py-6 text-sm text-slate-400">No tours are available for the selected organization.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-md border-slate-700/70 bg-slate-950/60">
      <CardHeader className="gap-4 pb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <ClipboardList className="h-4 w-4 text-cyan-300" />
              Logistics command cockpit
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">Oversee readiness, day sheets, confirmations, and updates across every tour stop.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find tour"
                className="border-slate-700 bg-slate-950 pl-8 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <Select
              value={activeTourId || undefined}
              onValueChange={(value) => {
                const next = plans?.find((item) => item.tourId === value)
                if (next) onSelectTour?.(next)
              }}
            >
              <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100 sm:w-72">
                <SelectValue placeholder="Select tour" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                {filteredPlans.map((item) => (
                  <SelectItem key={item.tourId} value={item.tourId}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={() => void loadPlan()} className="mt-2 border-amber-500/40 bg-transparent text-amber-100 hover:bg-amber-500/10">
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        {!plan && loadingPlan ? (
          <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-300" />
            Loading command cockpit
          </div>
        ) : null}

        {plan ? (
          <>
            <div className="flex flex-col gap-3 border border-slate-800 bg-slate-950/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase text-cyan-300">Active tour logistics</p>
                <h3 className="mt-1 truncate text-xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{compactDate(plan.startDate, plan.endDate)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={working !== null} onClick={() => void runAction("preview")} className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {working === "preview" ? "Checking" : "Preview sync"}
                </Button>
                <Button size="sm" variant="outline" disabled={working !== null} onClick={() => void runAction("validate")} className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800">
                  {working === "validate" ? "Validating" : "Validate"}
                </Button>
                <Button size="sm" disabled={working !== null} onClick={() => void runAction("hydrate")} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {working === "hydrate" ? "Syncing" : "Sync from tour"}
                </Button>
                <Button asChild size="sm" variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800">
                  <Link href={`/admin/dashboard/logistics/plans/${plan.tourId}`}>Detail view <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>

            {notice ? <p className="text-sm text-slate-300" role="status">{notice}</p> : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <CockpitMetric icon={CalendarDays} label="Stops" value={String(plan.counts.stops)} />
              <CockpitMetric icon={AlertTriangle} label="Blockers" value={String(plan.counts.blockingIssues)} tone={plan.counts.blockingIssues ? "warning" : "default"} />
              <CockpitMetric icon={ClipboardCheck} label="Day sheets" value={`${plan.counts.staleDaySheets + plan.counts.missingDaySheets} need work`} tone={plan.counts.staleDaySheets + plan.counts.missingDaySheets ? "warning" : "default"} />
              <CockpitMetric icon={Bell} label="Confirmations" value={String(plan.counts.pendingAcknowledgements)} tone={plan.counts.pendingAcknowledgements ? "warning" : "default"} />
              <CockpitMetric icon={Users} label="Assigned people" value={String(plan.counts.assignedPeople)} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">Needs attention</h4>
                  <Badge className="border-slate-700 bg-slate-800 text-slate-300">{attentionItems.length}</Badge>
                </div>
                <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                  {attentionItems.length ? attentionItems.map((item) => (
                    <div key={item.key} className="border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge className={item.issue ? issueTone(item.issue) : stateClasses(item.tone)}>{item.kind}</Badge>
                          <p className="mt-2 truncate text-sm font-medium text-slate-100">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.detail}</p>
                        </div>
                        {item.stop ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Open ${item.title}`}
                            onClick={() => {
                              setSelectedStopId(item.stop?.tourStopId || item.stop?.eventId || null)
                              if (item.issue) onOpenStop?.(plan.tourId, item.stop, item.issue.targetTab, item.issue.id)
                            }}
                            className="shrink-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                      <CheckCircle2 className="mb-2 h-5 w-5" />
                      No open blockers, stale day sheets, or pending confirmations in this tour plan.
                    </div>
                  )}
                </div>
              </section>

              <section className="overflow-hidden border border-slate-800 bg-slate-950/45">
                <div className="border-b border-slate-800 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-100">Stop matrix</h4>
                  <p className="mt-1 text-xs text-slate-400">Scan readiness by event stop, then jump into the exact logistics panel.</p>
                </div>
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Stop</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Domains</th>
                        <th className="px-4 py-3">Day sheet</th>
                        <th className="px-4 py-3">People</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {plan.stops.map((stop) => (
                        <tr key={stop.tourStopId || `${stop.ordinal}-${stop.name}`} className={eventId && stop.eventId === eventId ? "bg-cyan-500/10" : "hover:bg-slate-900/70"}>
                          <td className="max-w-[220px] px-4 py-3">
                            <p className="truncate font-medium text-slate-100"><span className="mr-2 text-xs text-slate-500">{stop.ordinal + 1}</span>{stop.name}</p>
                            <p className="truncate text-xs text-slate-400">{stop.venue || stop.market || "Venue not set"}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{stopDate(stop)}</td>
                          <td className="px-4 py-3">
                            <div className="flex max-w-[280px] flex-wrap gap-1.5">
                              {stop.domainRollups.filter((rollup) => rollup.total > 0 || rollup.issues > 0).slice(0, 4).map((rollup) => (
                                <button
                                  key={rollup.id}
                                  type="button"
                                  onClick={() => onOpenStop?.(plan.tourId, stop, rollup.targetTab)}
                                  className={`border px-2 py-1 text-xs ${stateClasses(rollup.state)} hover:border-cyan-300/50`}
                                >
                                  {rollup.label}
                                </button>
                              ))}
                              {stop.domainRollups.every((rollup) => rollup.total === 0 && rollup.issues === 0) ? (
                                <Badge className="border-slate-700 bg-slate-800 text-slate-400">No records</Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {stop.daySheet.href ? (
                              <Link href={stop.daySheet.href} className={`inline-flex border px-2 py-1 text-xs ${stateClasses(stop.daySheet.state)}`}>
                                {stop.daySheet.label}
                              </Link>
                            ) : (
                              <Badge className="border-slate-700 bg-slate-800 text-slate-400">{stop.daySheet.label}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            <div>{stop.assignedPeopleCount} assigned</div>
                            {stop.pendingAcknowledgementCount ? <div className="text-xs text-amber-300">{stop.pendingAcknowledgementCount} pending</div> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" aria-label={`Open ${stop.name}`} onClick={() => setSelectedStopId(stop.tourStopId || stop.eventId)} className="text-slate-300 hover:bg-slate-800 hover:text-white">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" aria-label={`Message ${stop.name}`} onClick={() => onOpenStop?.(plan.tourId, stop, "communication")} className="text-slate-300 hover:bg-slate-800 hover:text-white">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <Sheet open={Boolean(selectedStop)} onOpenChange={(open) => !open && setSelectedStopId(null)}>
              <SheetContent side="right" className="w-full overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-xl">
                {selectedStop ? (
                  <>
                    <SheetHeader>
                      <SheetTitle className="pr-8 text-slate-100">{selectedStop.name}</SheetTitle>
                      <SheetDescription className="text-slate-400">{stopDate(selectedStop)}{selectedStop.venue ? ` · ${selectedStop.venue}` : ""}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-5">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <StopMetric label="Issues" value={selectedStop.issueCount} />
                        <StopMetric label="Tasks" value={selectedStop.taskCount} />
                        <StopMetric label="Pending" value={selectedStop.pendingAcknowledgementCount} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-200">Quick actions</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedStop.domainRollups.map((rollup) => (
                            <Button
                              key={rollup.id}
                              variant="outline"
                              onClick={() => onOpenStop?.(plan.tourId, selectedStop, rollup.targetTab)}
                              className="justify-start border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
                            >
                              {rollup.label}
                            </Button>
                          ))}
                          <Button variant="outline" onClick={() => onOpenStop?.(plan.tourId, selectedStop, "communication")} className="justify-start border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
                            <Send className="mr-2 h-4 w-4" />
                            Send update
                          </Button>
                          {selectedStop.daySheet.href ? (
                            <Button asChild variant="outline" className="justify-start border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
                              <Link href={selectedStop.daySheet.href}>Open day sheet</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="border-t border-slate-800 pt-4">
                        <p className="text-sm font-medium text-slate-200">Open issues</p>
                        {plan.issues.filter((issue) => issue.tourStopId === selectedStop.tourStopId && issue.status === "open").length ? (
                          plan.issues.filter((issue) => issue.tourStopId === selectedStop.tourStopId && issue.status === "open").map((issue) => (
                            <div key={issue.id} className="mt-3 border border-slate-700 p-3">
                              <Badge className={issueTone(issue)}>{issue.severity}</Badge>
                              <p className="mt-2 text-sm text-slate-100">{issue.title}</p>
                              <p className="mt-1 text-xs text-slate-400">{issue.detail || issue.code}</p>
                              <Button size="sm" variant="outline" onClick={() => onOpenStop?.(plan.tourId, selectedStop, issue.targetTab, issue.id)} className="mt-3 border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
                                Open panel
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">No open issues for this stop.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </SheetContent>
            </Sheet>
          </>
        ) : selectedPlanListItem ? null : (
          <p className="text-sm text-slate-400">Select a tour to open the command cockpit.</p>
        )}
      </CardContent>
    </Card>
  )
}

function CockpitMetric({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: "default" | "warning"
}) {
  return (
    <div className={`border p-3 ${tone === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-slate-800 bg-slate-950/50"}`}>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className={tone === "warning" ? "h-4 w-4 text-amber-300" : "h-4 w-4 text-cyan-300"} />
        {label}
      </div>
      <p className={tone === "warning" ? "mt-2 text-lg font-semibold text-amber-200" : "mt-2 text-lg font-semibold text-white"}>{value}</p>
    </div>
  )
}

function StopMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-700 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg text-white">{value}</p>
    </div>
  )
}
