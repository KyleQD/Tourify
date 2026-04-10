"use client"

import { useEffect, useMemo, useState, useCallback, type ComponentType } from "react"
import { RefreshCw, Radio, Timer, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "../components/admin-page-header"

interface ConnectTelemetrySummaryResponse {
  days: number
  since: string
  totals: {
    events: number
    createdSessions: number
    claimedSessions: number
    confirmedSessions: number
    claimRate: number
    confirmRate: number
    confirmGivenClaimRate: number
    medianSecondsToClaim: number | null
    medianSecondsToConfirm: number | null
  }
  eventCounts: Record<string, number>
  platformCounts: Record<string, number>
  topFailureReasons: Array<{ reason: string; count: number }>
}

const EMPTY_SUMMARY: ConnectTelemetrySummaryResponse = {
  days: 7,
  since: new Date().toISOString(),
  totals: {
    events: 0,
    createdSessions: 0,
    claimedSessions: 0,
    confirmedSessions: 0,
    claimRate: 0,
    confirmRate: 0,
    confirmGivenClaimRate: 0,
    medianSecondsToClaim: null,
    medianSecondsToConfirm: null,
  },
  eventCounts: {},
  platformCounts: {},
  topFailureReasons: [],
}

export default function ConnectTelemetryPage() {
  const [days, setDays] = useState(7)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ConnectTelemetrySummaryResponse>(EMPTY_SUMMARY)

  const fetchSummary = useCallback(async (windowDays = days) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/connect/telemetry/summary?days=${windowDays}`, {
        credentials: "include",
        cache: "no-store",
      })
      const json = await response.json()
      if (!response.ok)
        throw new Error(json?.error || "Failed to load connect telemetry summary")

      setSummary(json)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong")
      setSummary(EMPTY_SUMMARY)
    } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    void fetchSummary(days)
  }, [days, fetchSummary])

  const sortedEventCounts = useMemo(
    () => Object.entries(summary.eventCounts).sort((a, b) => b[1] - a[1]),
    [summary.eventCounts]
  )

  const sortedPlatformCounts = useMemo(
    () => Object.entries(summary.platformCounts).sort((a, b) => b[1] - a[1]),
    [summary.platformCounts]
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Connect Telemetry"
        subtitle="In-person connect funnel and reliability metrics"
        icon={Radio}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              <option value={1}>Last 24h</option>
              <option value={7}>Last 7d</option>
              <option value={14}>Last 14d</option>
              <option value={30}>Last 30d</option>
            </select>
            <Button type="button" variant="outline" onClick={() => void fetchSummary(days)} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="pt-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sessions Created" value={summary.totals.createdSessions} />
        <MetricCard label="Sessions Claimed" value={summary.totals.claimedSessions} />
        <MetricCard label="Sessions Confirmed" value={summary.totals.confirmedSessions} />
        <MetricCard label="Total Events" value={summary.totals.events} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Claim Rate" value={toPercent(summary.totals.claimRate)} />
        <MetricCard label="Confirm Rate" value={toPercent(summary.totals.confirmRate)} />
        <MetricCard label="Confirm Given Claim" value={toPercent(summary.totals.confirmGivenClaimRate)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Median Seconds to Claim"
          value={summary.totals.medianSecondsToClaim ?? "n/a"}
          icon={Timer}
        />
        <MetricCard
          label="Median Seconds to Confirm"
          value={summary.totals.medianSecondsToConfirm ?? "n/a"}
          icon={Timer}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-700/50 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Event Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedEventCounts.length ? (
              sortedEventCounts.map(([eventName, count]) => (
                <div key={eventName} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{eventName}</span>
                  <span className="font-semibold text-white">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No events for selected window.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedPlatformCounts.length ? (
              sortedPlatformCounts.map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{platform}</span>
                  <span className="font-semibold text-white">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No platform telemetry yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700/50 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Top Claim Rejection Reasons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.topFailureReasons.length ? (
            summary.topFailureReasons.map((item) => (
              <div key={item.reason} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{item.reason}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No claim rejection reasons recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-slate-700/50 bg-slate-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-2xl font-bold text-white">{value}</p>
        {Icon ? <Icon className="h-5 w-5 text-slate-400" /> : null}
      </CardContent>
    </Card>
  )
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`
}
