"use client"

import { useRouter } from "next/navigation"
import { Activity, AlertTriangle, CheckCircle2, CircleHelp, ChevronRight } from "lucide-react"

import { AdminSurfaceCard } from "@/app/admin/dashboard/components/admin-surface-card"
import { statusBadgeClass } from "@/app/admin/dashboard/components/admin-badge-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TourHealthSummary } from "@/lib/admin/tour-health-aggregation"

export function TourHealthCard({ health }: { health: TourHealthSummary | null }) {
  const router = useRouter()

  return (
    <AdminSurfaceCard>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="h-4 w-4 text-violet-300" />
          Route & logistics health
        </CardTitle>
        {health ? (
          <Badge className={statusBadgeClass(health.status)}>{health.status.replace("_", " ")}</Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!health ? (
          <div className="flex items-center gap-2 text-sm text-slate-400" role="status">
            <CircleHelp className="h-4 w-4" />
            Health evaluation unavailable.
          </div>
        ) : health.status === "healthy" ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            All {health.signals.length} route and logistics checks are healthy.
          </div>
        ) : (
          <div className="space-y-2">
            {[...health.errors, ...health.warnings, ...health.unknown].map((signal) => (
              <div
                key={signal.signal_id}
                className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3"
              >
                {signal.severity === "unknown" ? (
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <AlertTriangle className={signal.severity === "error"
                    ? "mt-0.5 h-4 w-4 shrink-0 text-red-400"
                    : "mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                  } />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-100">{signal.label}</p>
                    <Badge className={statusBadgeClass(signal.severity)}>{signal.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {signal.detail || `Owned by ${signal.owner}.`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs text-slate-300"
                  onClick={() => router.push(signal.remediationUrl)}
                >
                  Review <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {health?.oldest_evaluation ? (
          <p className="text-xs text-slate-500">
            Oldest signal evaluation {new Date(health.oldest_evaluation).toLocaleString()}
          </p>
        ) : null}
      </CardContent>
    </AdminSurfaceCard>
  )
}
