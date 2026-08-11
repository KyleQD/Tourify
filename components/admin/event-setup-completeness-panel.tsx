"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, Loader2, Lock, RefreshCw } from "lucide-react"

import { AdminEmptyState } from "@/app/admin/dashboard/components/admin-empty-state"
import { AdminErrorCard } from "@/app/admin/dashboard/components/admin-error-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  EventSetupChecklist,
  EventSetupDomainStatus,
} from "@/lib/admin/event-setup-checklist"
import { cn } from "@/lib/utils"

interface EventSetupCompletenessPanelProps {
  eventId: string
  className?: string
}

function statusBadge(status: EventSetupDomainStatus): { label: string; className: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case "ready":
      return { label: "Ready", className: "border-emerald-700/60 text-emerald-300", icon: CheckCircle2 }
    case "in_progress":
      return { label: "In progress", className: "border-cyan-700/60 text-cyan-300", icon: CircleDashed }
    case "blocked":
      return { label: "Blocked", className: "border-amber-700/60 text-amber-300", icon: Lock }
    case "unknown":
      return { label: "Unknown", className: "border-slate-500/60 text-slate-300", icon: HelpCircle }
    default:
      return { label: "Not started", className: "border-slate-700/60 text-slate-400", icon: AlertTriangle }
  }
}

export function EventSetupCompletenessPanel({ eventId, className }: EventSetupCompletenessPanelProps) {
  const [completeness, setCompleteness] = useState<EventSetupChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/setup-completeness`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) {
        setError(typeof data?.error === "string" ? data.error : "Failed to load setup completeness")
        setCompleteness(null)
        return
      }
      setCompleteness(data.completeness as EventSetupChecklist)
    } catch {
      setError("Failed to load setup completeness")
      setCompleteness(null)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-sm border border-slate-700/50 bg-slate-900/60 p-4 text-sm text-slate-300", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
        Loading setup completeness…
      </div>
    )
  }

  if (error) return <AdminErrorCard message={error} onRetry={() => void load()} />

  if (!completeness?.items?.length) {
    return (
      <AdminEmptyState
        icon={HelpCircle}
        title="No setup domains"
        description="Setup completeness will appear after the event is saved."
      />
    )
  }

  return (
    <section className={cn("space-y-3 rounded-sm border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Setup completeness</h3>
          <p className="mt-1 text-xs text-slate-400">
            Required domains with owner and direct action. Dependency failures show as unknown.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <ul className="space-y-2">
        {completeness.items.map((item) => {
          const badge = statusBadge(item.status)
          const Icon = badge.icon
          return (
            <li
              key={item.domain}
              className="rounded-sm border border-slate-800 bg-slate-950/50 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{item.label}</p>
                    <Badge variant="outline" className={badge.className}>
                      <Icon className="mr-1 h-3 w-3" />
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{item.summary}</p>
                  <p className="text-xs text-slate-500">
                    Owner: <span className="text-slate-300">{item.owner.label}</span>
                    <span className="text-slate-600"> · </span>
                    <span className="text-slate-400">{item.owner.role}</span>
                  </p>
                  {item.dependsOn.length > 0 && (
                    <p className="text-xs text-slate-600">
                      Depends on: {item.dependsOn.join(", ")}
                    </p>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="border-cyan-800/60 text-cyan-200">
                  <Link href={item.directAction.href}>{item.directAction.label}</Link>
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
