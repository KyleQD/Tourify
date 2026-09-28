"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useActingContext } from "@/hooks/use-acting-context"
import type { LogisticsPlanStopSummary, LogisticsPlanSummary } from "@/lib/logistics/plans"

function stateClasses(state: string) {
  if (state === "ready") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (state === "at_risk") return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  return "border-slate-600 bg-slate-800/70 text-slate-200"
}

function formatStopDate(stop: LogisticsPlanStopSummary) {
  if (!stop.date) return "Date not set"
  return stop.time ? `${stop.date} ${stop.time}` : stop.date
}

export function LogisticsPlanWorkspace({ tourId }: { tourId: string }) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [plan, setPlan] = useState<LogisticsPlanSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<"preview" | "hydrate" | "validate" | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const endpoint = `/api/admin/logistics/plans/${tourId}?tourId=${encodeURIComponent(tourId)}`

  const loadPlan = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(endpoint, { credentials: "include", cache: "no-store", headers: actingHeaders })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || "Unable to load this logistics plan.")
      setPlan(body.plan)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this logistics plan.")
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, endpoint, isActingReady])

  useEffect(() => { void loadPlan() }, [loadPlan])

  const selectedIndex = useMemo(
    () => plan?.stops.findIndex((stop) => stop.tourStopId === selectedStopId) ?? -1,
    [plan?.stops, selectedStopId],
  )
  const selectedStop = selectedIndex >= 0 ? plan?.stops[selectedIndex] || null : null

  const runAction = useCallback(async (action: "preview" | "hydrate" | "validate") => {
    if (!plan) return
    setWorking(action)
    setNotice(null)
    try {
      const response = await fetch(`${endpoint.replace(/\?.*$/, "")}/${action === "preview" ? "preview-hydration" : action}?tourId=${encodeURIComponent(tourId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify({ expectedOperationsVersion: plan.operationsVersion }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || "The operation could not be completed.")
      if (body.plan) setPlan(body.plan)
      if (body.preview) {
        setNotice(`${body.preview.counts.sourceStops} source stops checked; ${body.preview.counts.conflicts} override conflict(s) need review.`)
      } else {
        setNotice(action === "hydrate" ? "Tour source synchronized." : "Readiness validation completed.")
      }
    } catch (actionError) {
      setNotice(actionError instanceof Error ? actionError.message : "The operation could not be completed.")
    } finally {
      setWorking(null)
    }
  }, [actingHeaders, endpoint, plan, tourId])

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading logistics plan</div>
  }
  if (error || !plan) {
    return (
      <div className="space-y-4 px-1 py-8">
        <Button asChild variant="ghost" className="text-slate-300"><Link href="/admin/dashboard/logistics"><ArrowLeft className="mr-2 h-4 w-4" />Logistics</Link></Button>
        <Card className="rounded-md border-amber-500/30 bg-amber-500/10"><CardContent className="flex gap-3 py-6 text-amber-100"><AlertTriangle className="h-5 w-5 shrink-0" />{error || "This logistics plan is unavailable."}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 px-1 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-800 hover:text-white"><Link href="/admin/dashboard/logistics"><ArrowLeft className="mr-2 h-4 w-4" />All logistics</Link></Button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={working !== null} onClick={() => void runAction("preview")} className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800"><ClipboardCheck className="mr-2 h-4 w-4" />{working === "preview" ? "Checking" : "Preview sync"}</Button>
          <Button size="sm" variant="outline" disabled={working !== null} onClick={() => void runAction("validate")} className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800">{working === "validate" ? "Validating" : "Validate"}</Button>
          <Button size="sm" disabled={working !== null} onClick={() => void runAction("hydrate")} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"><RefreshCw className="mr-2 h-4 w-4" />{working === "hydrate" ? "Syncing" : "Sync from tour"}</Button>
        </div>
      </div>

      <header className="border-b border-slate-800 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-cyan-300">Tour logistics plan</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{plan.name}</h1>
            <p className="mt-1 text-sm text-slate-400">{[plan.startDate, plan.endDate].filter(Boolean).join(" to ") || "Dates not set"}</p>
          </div>
          <Badge className="border-slate-600 bg-slate-800 text-slate-200">{plan.lifecycle}</Badge>
        </div>
        {notice ? <p className="mt-3 text-sm text-slate-300" role="status">{notice}</p> : null}
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-md border-slate-700 bg-slate-950/50"><CardContent className="py-4"><p className="text-xs text-slate-400">Stops</p><p className="mt-1 text-2xl font-semibold text-white">{plan.counts.stops}</p></CardContent></Card>
        <Card className="rounded-md border-slate-700 bg-slate-950/50"><CardContent className="py-4"><p className="text-xs text-slate-400">Open issues</p><p className="mt-1 text-2xl font-semibold text-white">{plan.counts.openIssues}</p></CardContent></Card>
        <Card className="rounded-md border-slate-700 bg-slate-950/50"><CardContent className="py-4"><p className="text-xs text-slate-400">Blocking issues</p><p className="mt-1 text-2xl font-semibold text-amber-300">{plan.counts.blockingIssues}</p></CardContent></Card>
      </div>

      <section aria-label="Readiness" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {plan.readiness.map((dimension) => <div key={dimension.id} className={`min-h-20 border p-3 ${stateClasses(dimension.state)}`}><p className="text-xs font-medium">{dimension.label}</p><p className="mt-2 text-xs opacity-80">{dimension.detail}</p></div>)}
      </section>

      <section aria-label="Stop matrix" className="overflow-hidden border border-slate-700 bg-slate-950/45">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="sticky left-0 z-10 bg-slate-900 px-4 py-3">Stop</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Venue</th><th className="px-4 py-3">Tasks</th><th className="px-4 py-3">Overrides</th><th className="px-4 py-3">Issues</th><th className="px-4 py-3"><span className="sr-only">Open stop</span></th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {plan.stops.map((stop) => <tr key={stop.tourStopId || `${stop.ordinal}-${stop.name}`} className="hover:bg-slate-900/70"><td className="sticky left-0 bg-slate-950 px-4 py-3 font-medium text-slate-100"><span className="mr-2 text-xs text-slate-500">{stop.ordinal + 1}</span>{stop.name}</td><td className="px-4 py-3 text-slate-300">{formatStopDate(stop)}</td><td className="px-4 py-3 text-slate-300">{stop.venue || "Not set"}</td><td className="px-4 py-3 text-slate-300">{stop.taskCount}</td><td className="px-4 py-3 text-slate-300">{stop.overrideCount}</td><td className="px-4 py-3"><Badge className={stop.blockingIssueCount ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-slate-600 bg-slate-800 text-slate-200"}>{stop.issueCount}</Badge></td><td className="px-4 py-3"><Button size="icon" variant="ghost" aria-label={`Open ${stop.name}`} disabled={!stop.tourStopId} onClick={() => setSelectedStopId(stop.tourStopId)} className="text-slate-300 hover:bg-slate-800 hover:text-white"><ChevronRight className="h-4 w-4" /></Button></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={Boolean(selectedStop)} onOpenChange={(open) => !open && setSelectedStopId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-lg">
          {selectedStop ? <><SheetHeader><SheetTitle className="pr-8 text-slate-100">{selectedStop.name}</SheetTitle><SheetDescription className="text-slate-400">{formatStopDate(selectedStop)}{selectedStop.venue ? ` · ${selectedStop.venue}` : ""}</SheetDescription></SheetHeader><div className="mt-6 space-y-4"><div className="grid grid-cols-3 gap-2 text-center"><div className="border border-slate-700 p-3"><p className="text-xs text-slate-400">Tasks</p><p className="mt-1 text-lg text-white">{selectedStop.taskCount}</p></div><div className="border border-slate-700 p-3"><p className="text-xs text-slate-400">Overrides</p><p className="mt-1 text-lg text-white">{selectedStop.overrideCount}</p></div><div className="border border-slate-700 p-3"><p className="text-xs text-slate-400">Issues</p><p className="mt-1 text-lg text-white">{selectedStop.issueCount}</p></div></div><div className="border-t border-slate-800 pt-4"><p className="text-sm font-medium text-slate-200">Open issues</p>{plan.issues.filter((issue) => issue.tourStopId === selectedStop.tourStopId && issue.status === "open").length ? plan.issues.filter((issue) => issue.tourStopId === selectedStop.tourStopId && issue.status === "open").map((issue) => <div key={issue.id} className="mt-3 border border-slate-700 p-3"><p className="text-sm text-slate-100">{issue.title}</p><p className="mt-1 text-xs text-slate-400">{issue.detail || issue.code}</p></div>) : <p className="mt-2 text-sm text-slate-400">No open issues for this stop.</p>}</div></div><div className="mt-6 flex justify-between border-t border-slate-800 pt-4"><Button size="icon" variant="outline" disabled={selectedIndex <= 0} onClick={() => setSelectedStopId(plan.stops[selectedIndex - 1]?.tourStopId || null)} className="border-slate-600 bg-transparent text-slate-100"><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" disabled={selectedIndex >= plan.stops.length - 1} onClick={() => setSelectedStopId(plan.stops[selectedIndex + 1]?.tourStopId || null)} className="border-slate-600 bg-transparent text-slate-100"><ChevronRight className="h-4 w-4" /></Button></div></> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
