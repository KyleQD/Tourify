"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Radio, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { AdminEmptyState } from "@/app/admin/dashboard/components/admin-empty-state"
import { AdminErrorCard } from "@/app/admin/dashboard/components/admin-error-card"
import { AdminPageSkeleton } from "@/app/admin/dashboard/components/admin-page-skeleton"
import { statusBadgeClass } from "@/app/admin/dashboard/components/admin-badge-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActingContext } from "@/hooks/use-acting-context"
import { isSafeDeliveryRetry } from "@/lib/admin/publication-delivery-dashboard"
import type { PublicationDeliveryChannel, PublicationDeliveryStatus } from "@/lib/admin/publication-schema"
import type { PublicationDeliverySlo } from "@/lib/admin/publication-delivery-dashboard"

interface DeliveryRow {
  id: string
  snapshotId: string
  channel: PublicationDeliveryChannel
  status: PublicationDeliveryStatus
  attempts: number
  providerRef: string | null
  lastErrorClass: string | null
  lastError: string | null
  recipientDisplayName: string | null
  recipientSubjectKey: string | null
  publicationTitle: string | null
  publicationType: string | null
  tourId: string | null
  queuedAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  acknowledgedAt: string | null
  failedAt: string | null
}

interface DeliverySummary {
  total: number
  byStatus: Record<string, number>
  attention: {
    failed: number
    unopened: number
    unacknowledged: number
    retryable: number
  }
}

function buildInit(actingHeaders: Record<string, string>, input?: RequestInit): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: {
      "Cache-Control": "no-cache",
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

function statusTone(status: string): string {
  if (status === "failed") return "bg-rose-500/15 text-rose-200 border-rose-500/30"
  if (status === "acknowledged" || status === "delivered" || status === "opened")
    return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
  if (status === "queued" || status === "processing")
    return "bg-amber-500/15 text-amber-200 border-amber-500/30"
  return "bg-slate-500/15 text-slate-300 border-slate-500/30"
}

export function PublicationDeliveryDashboard() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [rows, setRows] = useState<DeliveryRow[]>([])
  const [summary, setSummary] = useState<DeliverySummary | null>(null)
  const [slo, setSlo] = useState<PublicationDeliverySlo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("attention")
  const [channelFilter, setChannelFilter] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isRetrying, setIsRetrying] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    setRows([])
    setSummary(null)
    setSlo(null)
    setSelected({})
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
      if (channelFilter !== "all") params.set("channel", channelFilter)
      if (query.trim()) params.set("q", query.trim())
      params.set("limit", "200")

      const res = await fetch(
        `/api/admin/publication/deliveries?${params.toString()}`,
        buildInit(actingHeaders),
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load deliveries")
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setSummary(data.summary || null)
      setSlo(data.slo || null)
      setSelected({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deliveries")
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, channelFilter, isActingReady, query, statusFilter])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected],
  )

  const retryableSelected = useMemo(
    () =>
      rows.filter(
        (row) =>
          selected[row.id] &&
          isSafeDeliveryRetry({ status: row.status, lastErrorClass: row.lastErrorClass }),
      ),
    [rows, selected],
  )

  async function handleRetry(ids?: string[]) {
    const deliveryIds = ids?.length ? ids : retryableSelected.map((row) => row.id)
    if (!deliveryIds.length) {
      toast.error("Select retryable failed deliveries first")
      return
    }
    setIsRetrying(true)
    try {
      const res = await fetch(
        "/api/admin/publication/deliveries/retry",
        buildInit(actingHeaders, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryIds }),
        }),
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Retry failed")
      toast.success(`Re-queued ${data.retried?.length || 0} deliveries`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed")
    } finally {
      setIsRetrying(false)
    }
  }

  async function handleExport(format: "csv" | "json") {
    try {
      const params = new URLSearchParams()
      params.set("format", format)
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
      if (channelFilter !== "all") params.set("channel", channelFilter)
      if (query.trim()) params.set("q", query.trim())

      const res = await fetch(
        `/api/admin/publication/deliveries/export?${params.toString()}`,
        buildInit(actingHeaders),
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Export failed")
      }
      if (format === "csv") {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = "publication-deliveries.csv"
        anchor.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data.rows, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = "publication-deliveries.json"
        anchor.click()
        URL.revokeObjectURL(url)
      }
      toast.success("Delivery evidence exported")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    }
  }

  if (!isActingReady || isLoading) return <AdminPageSkeleton />
  if (error) return <AdminErrorCard message={error} onRetry={() => void load()} />

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">Publication delivery SLO</p>
            <p className="mt-1 text-xs text-slate-400">
              {slo?.state === "empty"
                ? "No delivery evidence is available for this organization yet."
                : slo
                  ? `${slo.sampleSize} recent deliveries measured${slo.sampleLimited ? " (sample limit reached)" : ""}.`
                  : "Delivery health is unavailable."}
            </p>
          </div>
          <Badge className={statusBadgeClass(slo?.status || "unavailable")}>
            {(slo?.status || "unavailable").replace("_", " ")}
          </Badge>
        </div>
        {slo && slo.state !== "empty" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Queue age p95", slo.queueAgeP95Seconds == null ? "Unavailable" : `${Math.round(slo.queueAgeP95Seconds)}s`],
              ["Success", slo.successRatePct == null ? "Unavailable" : `${slo.successRatePct.toFixed(1)}%`],
              ["Provider errors", slo.providerErrorRatePct == null ? "Unavailable" : `${slo.providerErrorRatePct.toFixed(1)}%`],
              ["Open rate", slo.openRatePct == null ? "Unavailable" : `${slo.openRatePct.toFixed(1)}%`],
              ["Acknowledged", slo.ackRatePct == null ? "Unavailable" : `${slo.ackRatePct.toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-950/50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {slo?.violations.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {slo.violations.map((violation) => (
              <Badge key={violation.metric} className={statusBadgeClass(violation.severity)}>
                {violation.metric.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        ) : null}
        {slo?.unavailableMetrics.length ? (
          <p className="mt-3 text-xs text-slate-500">
            Not yet instrumented: {slo.unavailableMetrics.map((item) => item.replaceAll("_", " ")).join(", ")}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Failed", value: summary?.attention.failed ?? 0 },
          { label: "Retryable", value: summary?.attention.retryable ?? 0 },
          { label: "Unopened", value: summary?.attention.unopened ?? 0 },
          { label: "Unacknowledged", value: summary?.attention.unacknowledged ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-700/80 bg-slate-900/40 px-4 py-3"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 border-slate-700 bg-slate-900/60">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attention">Needs attention</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-full sm:w-40 border-slate-700 bg-slate-900/60">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="in_app">In-app</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="push">Push</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipient or publication"
            className="border-slate-700 bg-slate-900/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} className="border-slate-600">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isRetrying || retryableSelected.length === 0}
            onClick={() => void handleRetry()}
            className="border-slate-600"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Retry selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport("csv")}
            className="border-slate-600"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={Radio}
          title="No deliveries match"
          description="Publish a tour book or change the filters to see queued, delivered, and failed rows."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700/80">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all retryable"
                    checked={
                      rows.some((row) =>
                        isSafeDeliveryRetry({
                          status: row.status,
                          lastErrorClass: row.lastErrorClass,
                        }),
                      ) &&
                      rows
                        .filter((row) =>
                          isSafeDeliveryRetry({
                            status: row.status,
                            lastErrorClass: row.lastErrorClass,
                          }),
                        )
                        .every((row) => selected[row.id])
                    }
                    onChange={(event) => {
                      const next: Record<string, boolean> = {}
                      if (event.target.checked) {
                        for (const row of rows) {
                          if (
                            isSafeDeliveryRetry({
                              status: row.status,
                              lastErrorClass: row.lastErrorClass,
                            })
                          ) {
                            next[row.id] = true
                          }
                        }
                      }
                      setSelected(next)
                    }}
                  />
                </th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Publication</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Attempts</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const canRetry = isSafeDeliveryRetry({
                  status: row.status,
                  lastErrorClass: row.lastErrorClass,
                })
                return (
                  <tr key={row.id} className="border-t border-slate-800/80 text-slate-200">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.recipientDisplayName || row.id}`}
                        disabled={!canRetry}
                        checked={Boolean(selected[row.id])}
                        onChange={(event) =>
                          setSelected((prev) => ({ ...prev, [row.id]: event.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {row.recipientDisplayName || row.recipientSubjectKey || "Recipient"}
                      </div>
                      <div className="text-xs text-slate-500">{row.recipientSubjectKey}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.publicationTitle || row.publicationType || "Publication"}</div>
                      <div className="text-xs text-slate-500">{row.snapshotId.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-2">{row.channel}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={statusTone(row.status)}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{row.attempts}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-xs text-slate-400">
                      {row.lastErrorClass || row.lastError || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canRetry ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isRetrying}
                          onClick={() => void handleRetry([row.id])}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Showing {rows.length} of {summary?.total ?? rows.length} filtered deliveries
        {selectedIds.length ? ` · ${selectedIds.length} selected` : ""}
      </p>
    </div>
  )
}
